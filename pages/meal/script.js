// script.js（差し替え）
const API_URL = "http://localhost:3000/api/calc-calorie"; // デプロイ先に合わせて変更

// ---- DOM ----
const els = {
  photoInput: document.getElementById("photoInput"),
  photoPreview: document.getElementById("photoPreview"),
  starsInput: document.getElementById("starsInput"),
  commentInput: document.getElementById("commentInput"),
  addMealBtn: document.getElementById("addMealBtn"),
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
function groupByDay(items) {
  const map = new Map();
  for (const m of items) {
    const k = m.date.slice(0,10);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return Array.from(map.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
}

// 表示用の高解像度URL（オリジナル）
function toObjectURL(file) {
  return URL.createObjectURL(file);
}

// API送信用、最大辺 1280px へ縮小
async function downscaleForApi(file, max = 1280) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(r => img.onload = r);

  const { width, height } = img;
  const scale = Math.min(1, max / Math.max(width, height));
  if (scale === 1) {
    // 縮小不要：そのままBlobを返す
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 画質90%のJPEGに（PNGが良ければ型に応じて変更可）
  const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.9));
  return new File([blob], "resized.jpg", { type: "image/jpeg" });
}

// ---- API ----
async function analyzeByAI(fileForApi) {
  const fd = new FormData();
  fd.append("photo", fileForApi);
  const res = await fetch(API_URL, { method:"POST", body: fd });
  let data;
  try { data = await res.json(); } catch { throw new Error("API parse error"); }
  return data; // { food, ingredients:[...], totals:{protein,fat,carbs,kcal}, note? }
}

// ---- Storage ----
const STORAGE_KEY = "bisyokuka_meals_v2";
function loadMeals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveMeals(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ---- Render ----
function render() {
  const items = loadMeals();
  const grouped = groupByDay(items);
  els.mealsByDay.innerHTML = "";

  for (const [date, arr] of grouped) {
    const sec = document.createElement("section");
    sec.className = "day-block";
    const h = document.createElement("h2");
    h.className = "day-title";
    h.textContent = new Date(date+"T00:00:00").toLocaleDateString('ja-JP', { weekday:"short", year:"numeric", month:"2-digit", day:"2-digit" });
    sec.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "meal-grid";

    for (const m of arr) {
      const card = document.createElement("div");
      card.className = "meal-card";
      card.dataset.id = m.id;

      // 食材テーブル
      const rows = m.ingredients?.map(it => `
        <tr>
          <td>${it.name}</td>
          <td class="num">${fmt(it.grams)}</td>
          <td class="num">${fmt(it.protein)}</td>
          <td class="num">${fmt(it.fat)}</td>
          <td class="num">${fmt(it.carbs)}</td>
          <td class="num">${fmt(it.kcal)}</td>
        </tr>
      `).join("") ?? "";

      card.innerHTML = `
        <img class="meal-img" src="${m.photo}" alt="${m.food}">
        <div class="meal-meta">
          <div class="name">${m.food}</div>
          <div class="badges">
            <span class="kcal-badge">${fmt(m.totals?.kcal ?? m.kcal ?? 0)} kcal</span>
            <span class="badge">P ${fmt(m.totals?.protein ?? 0)} g</span>
            <span class="badge">F ${fmt(m.totals?.fat ?? 0)} g</span>
            <span class="badge">C ${fmt(m.totals?.carbs ?? 0)} g</span>
          </div>
          <div>${"★".repeat(m.stars)}<span class="star">${"☆".repeat(5 - m.stars)}</span></div>
          ${m.comment ? `<div class="hint">「${m.comment}」</div>` : ""}
        </div>

        ${rows ? `
        <details class="ing-details">
          <summary>食材内訳</summary>
          <table class="ing-table">
            <thead>
              <tr><th>食材</th><th class="num">g</th><th class="num">P</th><th class="num">F</th><th class="num">C</th><th class="num">kcal</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </details>` : ""}
      `;

      card.addEventListener("click", (e) => {
        // detailsクリックは許可、他は編集モーダル
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
function openModal(id) {
  const items = loadMeals();
  const m = items.find(x => x.id === id);
  if (!m) return;

  editingId = id;
  els.modalPhoto.src = m.photo;
  els.modalFoodInput.value = m.food;
  els.modalStarsInput.value = m.stars;
  els.modalCommentInput.value = m.comment ?? "";
  els.modalOverlay.style.display = "flex";
}
function closeModal(){ editingId=null; els.modalOverlay.style.display="none"; }
els.closeModal.addEventListener("click", closeModal);
els.modalOverlay.addEventListener("click", (e)=>{ if (e.target===els.modalOverlay) closeModal(); });

els.saveModalBtn.addEventListener("click", () => {
  if (!editingId) return;
  const items = loadMeals();
  const idx = items.findIndex(x=>x.id===editingId);
  if (idx<0) return;

  items[idx] = {
    ...items[idx],
    food: (els.modalFoodInput.value || items[idx].food).trim(),
    stars: Math.max(1, Math.min(5, parseInt(els.modalStarsInput.value || "3", 10))),
    comment: els.modalCommentInput.value.trim()
    // 再解析はしない。必要なら保存時に analyzeByAI(items[idx].originalBlob?) を追加可
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
  // 表示は高解像度（ぼやけ防止）
  const url = toObjectURL(originalFile);
  els.photoPreview.innerHTML = `<img src="${url}" alt="preview" style="max-height: 240px; border-radius:12px;">`;
});

// ---- Save (analyze & record) ----
els.addMealBtn.addEventListener("click", async () => {
  if (!originalFile) { alert("写真を選択してください"); return; }

  els.addMealBtn.disabled = true;
  const defaultText = els.addMealBtn.textContent;
  els.addMealBtn.textContent = "解析中…";
  els.helperText.textContent = "AIが食材内訳と栄養素を推定しています…";

  try {
    // APIには縮小版を送る
    const resized = await downscaleForApi(originalFile, 1280);
    const data = await analyzeByAI(resized);
    if (data?.note) els.helperText.textContent = data.note; else els.helperText.textContent = "";

    // 表示は高解像度（オリジナル）
    const photoURL = toObjectURL(originalFile);
    const now = new Date();

    const item = {
      id: "m_" + now.getTime(),
      date: now.toISOString(),
      photo: photoURL,
      food: data?.food ?? "不明",
      stars: Math.max(1, Math.min(5, parseInt(els.starsInput.value || "3", 10))),
      comment: els.commentInput.value.trim(),
      // 新フィールド
      ingredients: Array.isArray(data?.ingredients) ? data.ingredients : [],
      totals: data?.totals ?? { protein:0, fat:0, carbs:0, kcal:0 }
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
    els.helperText.textContent = "解析に失敗しました。時間をおいて再試行してください。";
  } finally {
    els.addMealBtn.disabled = false;
    els.addMealBtn.textContent = defaultText;
  }
});

// init
(function init(){ render(); })();
