// ===== モバイル版 script（API先を更新！）=====
const API_URL = "https://xxxxx.ngrok-free.app/api/calc-calorie"; // ←現行URLに置換

// ---- DOM ----
const els = {
  cameraInput: document.getElementById("cameraInput"),
  libraryInput: document.getElementById("libraryInput"),
  photoPreview: document.getElementById("photoPreview"),
  starsInput: document.getElementById("starsInput"),
  commentInput: document.getElementById("commentInput"),
  addMealBtn: document.getElementById("addMealBtn"),
  resetBtn: document.getElementById("resetBtn"),
  mealsByDay: document.getElementById("mealsByDay"),
  helperText: document.getElementById("helperText"),
  modal: document.getElementById("photoModal"),
  modalPhoto: document.getElementById("modalPhoto"),
  modalTitle: document.getElementById("modalTitle"),
  modalKcal: document.getElementById("modalKcal"),
  modalPFC: document.getElementById("modalPFC"),
  modalComment: document.getElementById("modalComment"),
  modalIngDetails: document.getElementById("modalIngDetails"),
  modalIngBody: document.getElementById("modalIngBody"),
  closeModalBtn: document.getElementById("closeModalBtn"),
};

// ---- Utils ----
const fmt = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);
const escapeHtml = (s) => String(s||"").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// グループ化 & DataURL
function groupByDay(items) {
  const map = new Map();
  for (const m of items) {
    const k = (m.date || "").slice(0,10);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return Array.from(map.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
}
async function fileToDataURL(file) {
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// HEIC/HEIF → JPEG（iPhone対応）
async function convertHeicIfNeeded(file) {
  const isHeicLike = /heic|heif/i.test(file.type) || /\.hei[c|f]$/i.test(file.name || "");
  if (!isHeicLike) return file;
  if (typeof heic2any !== "function") return file;
  try {
    const jpgBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return new File([jpgBlob], (file.name || "image") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

// API送信用: 最大辺1280pxへ縮小（EXIF向き反映）
async function downscaleForApi(file, max = 1280) {
  file = await convertHeicIfNeeded(file);

  let bitmap = null;
  if (window.createImageBitmap) {
    try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch {}
  }
  if (bitmap) {
    const { width, height } = bitmap;
    const scale = Math.min(1, max / Math.max(width, height));
    if (scale === 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    return new File([blob], "resized.jpg", { type: "image/jpeg" });
  }

  // fallback
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((r) => (img.onload = r));
  const { width, height } = img;
  const scale = Math.min(1, max / Math.max(width, height));
  if (scale === 1) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
  return new File([blob], "resized.jpg", { type: "image/jpeg" });
}

// ---- API ----
async function analyzeByAI(fileForApi) {
  const fd = new FormData();
  fd.append("photo", fileForApi);
  const res = await fetch(API_URL, { method:"POST", body: fd });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`API ${res.status}: ${txt.slice(0,200)}`);
  }
  return await res.json(); // { food, ingredients?, totals?, note? } or fallback
}

// レスポンス正規化
function normalizeNutrition(data) {
  if (data?.totals || data?.ingredients) {
    const sums = (data.ingredients || []).reduce((a, it) => ({
      protein: a.protein + (Number(it.protein) || 0),
      fat:     a.fat     + (Number(it.fat)     || 0),
      carbs:   a.carbs   + (Number(it.carbs)   || 0),
      kcal:    a.kcal    + (Number(it.kcal)    || 0),
    }), { protein:0, fat:0, carbs:0, kcal:0 });
    return {
      food: String(data?.food ?? "不明"),
      ingredients: Array.isArray(data?.ingredients) ? data.ingredients : [],
      totals: {
        protein: Number(data?.totals?.protein) || sums.protein,
        fat:     Number(data?.totals?.fat)     || sums.fat,
        carbs:   Number(data?.totals?.carbs)   || sums.carbs,
        kcal:    Number(data?.totals?.kcal)    || sums.kcal,
      }
    };
  }
  if (typeof data?.kcal !== "undefined") {
    const kcal = Number(data.kcal) || 0;
    return { food: String(data?.food ?? "不明"), ingredients: [], totals: { protein:0, fat:0, carbs:0, kcal } };
  }
  return { food: "（推定不可）", ingredients: [], totals: { protein:0, fat:0, carbs:0, kcal:0 } };
}

// ---- Storage ----
const STORAGE_KEY = "bisyokuka_meals_v2";
function loadMeals() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveMeals(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

// ---- Render (シンプルカード：画像・名前・kcalのみ) ----
function render() {
  const items = loadMeals();
  const grouped = groupByDay(items);
  els.mealsByDay.innerHTML = "";

  for (const [date, arr] of grouped) {
    const sec = document.createElement("section");
    sec.className = "day";
    const h = document.createElement("h2");
    h.className = "day-title";
    h.textContent = new Date(date+"T00:00:00").toLocaleDateString('ja-JP', { weekday:"short", year:"numeric", month:"2-digit", day:"2-digit" });
    sec.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "cards"; // 3列

    for (const m of arr) {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = m.id;

      card.innerHTML = `
        <img class="img" src="${m.photo}" alt="${escapeHtml(m.food)}" onerror="this.style.display='none'">
        <div class="meta">
          <div class="title">${escapeHtml(m.food || "不明")}</div>
          <div class="kcal-badge">${fmt(m.totals?.kcal ?? 0)} kcal</div>
        </div>
      `;

      // クリックで詳細モーダル
      card.addEventListener("click", () => openModal(m));
      grid.appendChild(card);
    }

    sec.appendChild(grid);
    els.mealsByDay.appendChild(sec);
  }
}

// ---- フォト入力 ----
let originalFile = null;
function handleFiles(fileList) {
  const file = fileList && fileList[0];
  if (!file) return;
  originalFile = file;
  const url = URL.createObjectURL(file);
  els.photoPreview.innerHTML = `<img src="${url}" alt="preview">`;
}
els.cameraInput?.addEventListener("change", (e) => handleFiles(e.target.files));
els.libraryInput?.addEventListener("change", (e) => handleFiles(e.target.files));

// ---- 記録ボタン ----
els.addMealBtn.addEventListener("click", async () => {
  if (!originalFile) { alert("写真を選択してください"); return; }

  els.addMealBtn.disabled = true;
  const defaultText = els.addMealBtn.textContent;
  els.addMealBtn.textContent = "解析中…";
  els.helperText.textContent = "AIが食材内訳と栄養素を推定しています…";

  let photoDataURL = null;
  try {
    photoDataURL = await fileToDataURL(originalFile);
    const resized = await downscaleForApi(originalFile, 1280);
    const raw = await analyzeByAI(resized);
    const norm = normalizeNutrition(raw);
    els.helperText.textContent = raw?.note ? String(raw.note) : "";

    const now = new Date();
    const item = {
      id: "m_" + now.getTime(),
      date: now.toISOString(),
      photo: photoDataURL,
      food: norm.food,
      stars: Math.max(1, Math.min(5, parseInt(els.starsInput.value || "3", 10))),
      comment: els.commentInput.value.trim(),
      ingredients: norm.ingredients,
      totals: norm.totals
    };
    const items = loadMeals();
    items.push(item);
    saveMeals(items);

  } catch (e) {
    console.warn("AI解析失敗", e);
    els.helperText.textContent = "解析に失敗しました。写真は記録しました。";
    const now = new Date();
    const item = {
      id: "m_" + now.getTime(),
      date: now.toISOString(),
      photo: photoDataURL,
      food: "不明",
      stars: Math.max(1, Math.min(5, parseInt(els.starsInput.value || "3", 10))),
      comment: els.commentInput.value.trim(),
      ingredients: [],
      totals: { protein:0, fat:0, carbs:0, kcal:0 }
    };
    const items = loadMeals();
    items.push(item);
    saveMeals(items);
  } finally {
    els.addMealBtn.disabled = false;
    els.addMealBtn.textContent = defaultText;
    els.commentInput.value = "";
    els.starsInput.value = "4";
    els.photoPreview.innerHTML = "";
    originalFile = null;
    render();
  }
});

// ---- 全消し ----
els.resetBtn?.addEventListener("click", () => {
  if (!confirm("保存されている全ての食事記録を削除します。よろしいですか？")) return;
  localStorage.removeItem(STORAGE_KEY);
  els.helperText.textContent = "すべての記録を削除しました。";
  render();
});

// ===== 詳細モーダル =====
function openModal(meal) {
  els.modalPhoto.src = meal.photo || "";
  els.modalTitle.textContent = meal.food || "不明";
  els.modalKcal.textContent = `${fmt(meal.totals?.kcal ?? 0)} kcal`;
  els.modalPFC.textContent = `P:${fmt(meal.totals?.protein ?? 0)} g / F:${fmt(meal.totals?.fat ?? 0)} g / C:${fmt(meal.totals?.carbs ?? 0)} g`;
  els.modalComment.innerHTML = meal.comment ? `「${escapeHtml(meal.comment)}」` : "";

  const rows = (meal.ingredients || []).map(it => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td class="num">${fmt(it.grams ?? 0)}</td>
      <td class="num">${fmt(it.protein ?? 0)}</td>
      <td class="num">${fmt(it.fat ?? 0)}</td>
      <td class="num">${fmt(it.carbs ?? 0)}</td>
      <td class="num">${fmt(it.kcal ?? 0)}</td>
    </tr>
  `).join("");
  els.modalIngBody.innerHTML = rows || `<tr><td colspan="6" class="num">—</td></tr>`;
  els.modalIngDetails.open = !!rows;

  els.modal.hidden = false;
}
function closeModal(){ els.modal.hidden = true; }
els.closeModalBtn.addEventListener("click", closeModal);
els.modal.addEventListener("click", (e)=>{ if(e.target === els.modal) closeModal(); });

// 初期
render();
