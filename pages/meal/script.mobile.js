// ===== モバイル版 script（API先を更新！）=====
const API_URL = "https://cbb0b1273bbb.ngrok-free.app/api/calc-calorie";

// ---- DOM ----
const els = {
  photoInput: document.getElementById("photoInput"),
  photoPreview: document.getElementById("photoPreview"),
  starsInput: document.getElementById("starsInput"),
  commentInput: document.getElementById("commentInput"),
  addMealBtn: document.getElementById("addMealBtn"),
  resetBtn: document.getElementById("resetBtn"),
  mealsByDay: document.getElementById("mealsByDay"),
  // modal
  modalOverlay: document.getElementById("modalOverlay"),
  closeModal: document.getElementById("closeModal"),
  modalPhoto: document.getElementById("modalPhoto"),
  modalFoodInput: document.getElementById("modalFoodInput"),
  modalStarsInput: document.getElementById("modalStarsInput"),
  modalCommentInput: document.getElementById("modalCommentInput"),
  saveModalBtn: document.getElementById("saveModalBtn"),
  helperText: document.getElementById("helperText"),
};

// ---- Utils ----
const fmt = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);
const dayKey = (iso) => (iso || "").slice(0,10);
const toObjectURL = (file) => URL.createObjectURL(file);

async function fileToDataURL(file){
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// API送信用（最大辺1280pxへ）— 通信量/速度のバランス
async function downscaleForApi(file, max = 1280){
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(r => img.onload = r);
  const { width, height } = img;
  const scale = Math.min(1, max / Math.max(width, height));
  if (scale === 1) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.9));
  return new File([blob], "resized.jpg", { type: "image/jpeg" });
}

// ---- API ----
async function analyzeByAI(fileForApi){
  const fd = new FormData();
  fd.append("photo", fileForApi);
  const res = await fetch(API_URL, { method:"POST", body: fd });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`API ${res.status}: ${txt.slice(0,200)}`);
  }
  return await res.json(); // { food, ingredients?, totals?, note? } or fallback
}

function normalizeNutrition(data){
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
function loadMeals(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveMeals(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function groupByDay(items){
  const map = new Map();
  for (const m of items) {
    const k = dayKey(m.date);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return Array.from(map.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
}

// 旧データ適正化（blob: 画像の無効化や totals穴埋め）
function migrateMeals(items){
  let changed = false;
  for (const m of items) {
    if (m.photo && typeof m.photo === "string" && m.photo.startsWith("blob:")) {
      m.photo = ""; changed = true;
    }
    if (!m.totals) {
      m.totals = { protein:0, fat:0, carbs:0, kcal: Number(m.kcal || 0) };
      changed = true;
    }
    if (Array.isArray(m.ingredients) && m.ingredients.length > 0) {
      const sums = m.ingredients.reduce((a, it) => ({
        protein:a.protein+(+it.protein||0),
        fat:a.fat+(+it.fat||0),
        carbs:a.carbs+(+it.carbs||0),
        kcal:a.kcal+(+it.kcal||0),
      }), {protein:0,fat:0,carbs:0,kcal:0});
      if (!m.totals || (m.totals.kcal||0)===0) m.totals = sums;
      changed = true;
    }
  }
  if (changed) saveMeals(items);
}

// ---- Render ----
function render(){
  const items = loadMeals();
  const grouped = groupByDay(items);
  els.mealsByDay.innerHTML = "";

  for (const [date, arr] of grouped) {
    const sec = document.createElement("section");
    sec.className = "day";
    const h = document.createElement("h2");
    h.textContent = new Date(date+"T00:00:00").toLocaleDateString('ja-JP', { weekday:"short", year:"numeric", month:"2-digit", day:"2-digit" });
    sec.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "cards";

    for (const m of arr) {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = m.id;

      const rows = (m.ingredients || []).map((it) => `
        <tr>
          <td>${it.name}</td>
          <td class="num">${fmt(it.grams || 0)}</td>
          <td class="num">${fmt(it.protein || 0)}</td>
          <td class="num">${fmt(it.fat || 0)}</td>
          <td class="num">${fmt(it.carbs || 0)}</td>
          <td class="num">${fmt(it.kcal || 0)}</td>
        </tr>
      `).join("");

      card.innerHTML = `
        ${m.photo ? `<img class="img" src="${m.photo}" alt="${m.food}">` : ""}
        <div class="meta">
          <div class="title">${m.food}</div>
          <div class="badges">
            <span class="kcal">${fmt(m.totals?.kcal ?? 0)} kcal</span>
            <span class="badge">たんぱく質 ${fmt(m.totals?.protein ?? 0)} g</span>
            <span class="badge">脂質 ${fmt(m.totals?.fat ?? 0)} g</span>
            <span class="badge">炭水化物 ${fmt(m.totals?.carbs ?? 0)} g</span>
          </div>
          <div>${"★".repeat(m.stars)}<span class="star">${"☆".repeat(5 - m.stars)}</span></div>
          ${m.comment ? `<div class="hint">「${m.comment}」</div>` : ""}
        </div>
        ${rows ? `
        <details class="ing">
          <summary>食材内訳</summary>
          <table class="table">
            <thead>
              <tr><th>食材</th><th class="num">g</th><th class="num">たんぱく質</th><th class="num">脂質</th><th class="num">炭水化物</th><th class="num">kcal</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </details>` : ""}
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest("details")) return;
        openModal(m.id);
      });

      grid.appendChild(card);
    }

    sec.appendChild(grid);
    els.mealsByDay.appendChild(sec);
  }
}

// ---- Modal ----
let editingId = null;
function openModal(id){
  const items = loadMeals();
  const m = items.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  els.modalPhoto.src = m.photo || "";
  els.modalFoodInput.value = m.food;
  els.modalStarsInput.value = m.stars;
  els.modalCommentInput.value = m.comment ?? "";
  els.modalOverlay.hidden = false;
}
function closeModal(){ editingId=null; els.modalOverlay.hidden = true; }
els.closeModal.addEventListener("click", closeModal);
els.modalOverlay.addEventListener("click", (e)=>{ if (e.target === els.modalOverlay) closeModal(); });

els.saveModalBtn.addEventListener("click", () => {
  if (!editingId) return;
  const items = loadMeals();
  const idx = items.findIndex(x => x.id === editingId);
  if (idx < 0) return;
  items[idx] = {
    ...items[idx],
    food: (els.modalFoodInput.value || items[idx].food).trim(),
    stars: Math.max(1, Math.min(5, parseInt(els.modalStarsInput.value || "3", 10))),
    comment: els.modalCommentInput.value.trim()
  };
  saveMeals(items);
  render();
  closeModal();
});

// ---- Photo selection ----
let originalFile = null;
els.photoInput.addEventListener("change", (e) => {
  originalFile = e.target.files?.[0] || null;
  if (!originalFile) return;
  const url = toObjectURL(originalFile);
  els.photoPreview.innerHTML = `<img src="${url}" alt="プレビュー">`;
});

// ---- Save (analyze & record) ----
els.addMealBtn.addEventListener("click", async () => {
  if (!originalFile) { alert("写真を選択してください"); return; }

  els.addMealBtn.disabled = true;
  const originalText = els.addMealBtn.textContent;
  els.addMealBtn.textContent = "解析中…";
  els.helperText.textContent = "AIが食材内訳と栄養素を推定しています…";

  try {
    const resized = await downscaleForApi(originalFile, 1280);
    const raw = await analyzeByAI(resized);
    const norm = normalizeNutrition(raw);
    els.helperText.textContent = raw?.note ? String(raw.note) : "";

    const photoDataURL = await fileToDataURL(originalFile);
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

    // 片付け
    els.commentInput.value = "";
    els.starsInput.value = "4";
    els.photoInput.value = "";
    els.photoPreview.innerHTML = "";

    render();
  } catch (e) {
    console.warn("AI解析失敗", e);
    els.helperText.textContent = "解析に失敗しました: " + (e?.message || "ネットワーク/サーバ停止の可能性");
  } finally {
    els.addMealBtn.disabled = false;
    els.addMealBtn.textContent = originalText;
  }
});

// ---- Reset (全削除) ----
els.resetBtn.addEventListener("click", () => {
  const ok = confirm("保存されているすべての食事記録を削除します。よろしいですか？");
  if (!ok) return;
  try{
    localStorage.removeItem(STORAGE_KEY);
    els.helperText.textContent = "すべての記録を削除しました。";
  }catch(e){
    console.warn("reset error", e);
    els.helperText.textContent = "削除に失敗しました。ブラウザの権限をご確認ください。";
  }
  render();
});

// ---- init ----
(function init(){
  const items = loadMeals();
  migrateMeals(items);
  render();
})();
