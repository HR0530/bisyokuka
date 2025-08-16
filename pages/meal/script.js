// ===== 美食家さん 食事記録（GPT版：写真→{food,kcal} 自動） =====
// foods.json / dishes.json / TeachableMachine は使いません。

// ★ 公開時はあなたのAPIのURLに変更（ローカル検証は localhost でOK）
const API_URL = "http://localhost:3000/api/calc-calorie";

// DOM
const els = {
  photoInput: document.getElementById("photoInput"),
  photoPreview: document.getElementById("photoPreview"),
  starsInput: document.getElementById("starsInput"),
  commentInput: document.getElementById("commentInput"),
  helperText: document.getElementById("helperText"),
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
};

// ---- ユーティリティ ----
const fmt = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);
const readAsDataURL = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = rej;
  fr.readAsDataURL(file);
});
function groupByDay(items) {
  const map = new Map();
  for (const m of items) {
    const k = m.date.slice(0,10);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return Array.from(map.entries()).sort((a,b) => b[0].localeCompare(a[0]));
}

// ---- API ----
async function getCalorieFromGPT(file) {
  const fd = new FormData();
  fd.append("photo", file);
  const res = await fetch(API_URL, { method: "POST", body: fd });
  // 429などでもサーバがJSON返す場合があるので、まずJSONを試す
  let data;
  try { data = await res.json(); } catch { throw new Error("API response parse error"); }
  if (!res.ok && !("food" in data)) throw new Error("API error");
  return data; // 期待: { food, kcal, note? }
}

// ---- ストレージ ----
const STORAGE_KEY = "bisyokuka_meals";
function loadMeals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveMeals(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ---- レンダリング ----
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
      card.innerHTML = `
        <img class="meal-img" src="${m.photo}" alt="${m.food}">
        <div class="meal-meta">
          <div class="name">${m.food}</div>
          <div><span class="kcal-badge">${fmt(m.kcal)} kcal</span></div>
          <div>${"★".repeat(m.stars)}<span class="star">${"☆".repeat(5 - m.stars)}</span></div>
          ${m.comment ? `<div class="hint">「${m.comment}」</div>` : ""}
        </div>
      `;
      card.addEventListener("click", () => openModal(m.id));
      grid.appendChild(card);
    }
    sec.appendChild(grid);
    els.mealsByDay.appendChild(sec);
  }
}

// ---- モーダル編集 ----
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
function closeModal() {
  editingId = null;
  els.modalOverlay.style.display = "none";
}
els.closeModal.addEventListener("click", closeModal);
els.modalOverlay.addEventListener("click", (e) => { if (e.target === els.modalOverlay) closeModal(); });

els.saveModalBtn.addEventListener("click", () => {
  if (!editingId) return;
  const items = loadMeals();
  const idx = items.findIndex(x => x.id === editingId);
  if (idx < 0) return;

  const food = (els.modalFoodInput.value || items[idx].food).trim();
  const stars = Math.max(1, Math.min(5, parseInt(els.modalStarsInput.value || "3", 10)));
  const comment = els.modalCommentInput.value.trim();

  // GPT版：写真がないためkcal再計算は行わない
  items[idx] = { ...items[idx], food, stars, comment };
  saveMeals(items);
  render();
  closeModal();
});

// ---- 画像選択（プレビュー） ----
els.photoInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataURL = await readAsDataURL(file);
  els.photoPreview.innerHTML = `<img src="${dataURL}" alt="preview">`;
});

// ---- 記録（GPTで自動判定） ----
els.addMealBtn.addEventListener("click", async () => {
  const file = els.photoInput.files?.[0];
  if (!file) { alert("写真を選択してください"); return; }

  els.addMealBtn.disabled = true;
  els.addMealBtn.textContent = "解析中…";
  els.helperText.textContent = "写真を送信してAIが解析中です…";

  const photo = await readAsDataURL(file);

  let food = "不明";
  let kcal = 0;
  try {
    const res = await getCalorieFromGPT(file); // { food, kcal, note? }
    if (res?.food) food = String(res.food);
    if (typeof res?.kcal === "number") kcal = res.kcal;
    if (res?.note) els.helperText.textContent = res.note;
    else els.helperText.textContent = "";
  } catch (e) {
    console.warn("GPT API失敗:", e);
    els.helperText.textContent = "AI解析に失敗しました。あとで再試行してください。";
  }

  const now = new Date();
  const item = {
    id: "m_" + now.getTime(),
    date: now.toISOString(),
    food,
    kcal,
    stars: Math.max(1, Math.min(5, parseInt(els.starsInput.value || "3", 10))),
    comment: els.commentInput.value.trim(),
    photo
  };

  const items = loadMeals();
  items.push(item);
  saveMeals(items);

  // UIリセット
  els.commentInput.value = "";
  els.starsInput.value = "4";
  els.photoInput.value = "";
  els.photoPreview.innerHTML = "";
  els.addMealBtn.disabled = false;
  els.addMealBtn.textContent = "記録する";

  render();
});

// 初期化
(function init(){ render(); })();
