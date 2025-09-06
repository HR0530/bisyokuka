// ===== モバイル版 script（API先を更新！）=====
const API_URL = "https://xxxxx.ngrok-free.app/api/calc-calorie"; // ←今のURLに置換

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
};

// ---- Utils ----
const fmt = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);
function groupByDay(items) {
  const map = new Map();
  for (const m of items) {
    const k = (m.date || "").slice(0, 10);
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
  const isHeicLike =
    /heic|heif/i.test(file.type) || /\.hei[c|f]$/i.test(file.name || "");
  if (!isHeicLike) return file;

  if (typeof heic2any !== "function") return file; // ライブラリ未読込なら素通り
  try {
    const jpgBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return new File([jpgBlob], (file.name || "image") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (e) {
    console.warn("HEIC変換失敗、元のまま使用:", e);
    return file;
  }
}

// API送信用: 最大辺1280pxへ縮小（EXIF向き反映）
async function downscaleForApi(file, max = 1280) {
  file = await convertHeicIfNeeded(file);

  let bitmap = null;
  if (window.createImageBitmap) {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {}
  }
  if (bitmap) {
    const { width, height } = bitmap;
    const scale = Math.min(1, max / Math.max(width, height));
    if (scale === 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
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
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

// ---- Render ----
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
    grid.className = "cards"; // 3列グリッド

    for (const m of arr) {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = m.id;

      const rows = (m.ingredients||[]).map(it => `
        <tr>
          <td>${it.name}</td>
          <td class="num">${fmt(it.grams)}</td>
          <td class="num">${fmt(it.protein)}</td>
          <td class="num">${fmt(it.fat)}</td>
          <td class="num">${fmt(it.carbs)}</td>
          <td class="num">${fmt(it.kcal)}</td>
        </tr>
      `).join("");

      card.innerHTML = `
        <img class="img" src="${m.photo}" alt="${m.food}" onerror="this.style.display='none'">
        <div class="meta">
          <div class="title">${m.food}</div>
          <div class="badges">
            <span class="kcal">${fmt(m.totals?.kcal ?? 0)} kcal</span>
            <span class="badge">P ${fmt(m.totals?.protein ?? 0)} g</span>
            <span class="badge">F ${fmt(m.totals?.fat ?? 0)} g</span>
            <span class="badge">C ${fmt(m.totals?.carbs ?? 0)} g</span>
            <span class="badge star">★ ${m.stars ?? 0}</span>
          </div>
          ${m.comment ? `<div class="hint">「${m.comment}」</div>` : ""}
        </div>
        ${rows ? `
        <details class="ing">
          <summary>食材内訳</summary>
          <table class="table">
            <thead>
              <tr><th>食材</th><th class="num">g</th><th class="num">P</th><th class="num">F</th><th class="num">C</th><th class="num">kcal</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </details>` : ""}
      `;
      grid.appendChild(card);
    }

    sec.appendChild(grid);
    els.mealsByDay.appendChild(sec);
  }
}

// ---- フォト入力（共通）----
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
    // 先に写真を DataURL 化（API がコケても記録は残す）
    photoDataURL = await fileToDataURL(originalFile);

    // API 解析
    const resized = await downscaleForApi(originalFile, 1280);
    const raw = await analyzeByAI(resized);
    const norm = normalizeNutrition(raw);
    els.helperText.textContent = raw?.note ? String(raw.note) : "";

    // 正常保存
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
    // フォールバック保存（写真・コメントだけでも残す）
    els.helperText.textContent = "解析に失敗しました（ネットワーク/URL/CORSの可能性）。写真は記録しました。";

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
    // 入力欄リセット & 再描画
    els.addMealBtn.disabled = false;
    els.addMealBtn.textContent = defaultText;
    els.commentInput.value = "";
    els.starsInput.value = "4";
    els.photoPreview.innerHTML = "";
    originalFile = null;
    render();
  }
});

// ---- 全消し（任意）----
els.resetBtn?.addEventListener("click", () => {
  if (!confirm("保存されている全ての食事記録を削除します。よろしいですか？")) return;
  localStorage.removeItem(STORAGE_KEY);
  els.helperText.textContent = "すべての記録を削除しました。";
  render();
});

// 初期
(function init(){ render(); })();
