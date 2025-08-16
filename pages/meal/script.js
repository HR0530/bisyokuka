// ===== 美食家さん 食事記録（画像プレビュー + 料理選択 + カロリー自動計算 + 編集モーダル） =====
// 必要ファイル（同じディレクトリに置くか、パスを調整してください）
//  - foods.json : 100gあたりの栄養（今回はkcalのみ）
//  - dishes.json: 料理テンプレート（ingredients: foodとgramsの組）
//  - ../../my_model/ : Teachable Machine のモデル一式 (model.json, metadata.json, weights.bin)

const MODEL_DIR = "../../my_model/";
const FOODS_JSON = "./foods.json";
const DISHES_JSON = "./dishes.json";

let model = null;
let foods = [];   // [{ name, per100g:{cal} }]
let dishes = [];  // [{ className, ingredients:[{food, grams}] }]

// DOM
const els = {
  photoInput: document.getElementById("photoInput"),
  photoPreview: document.getElementById("photoPreview"),
  foodSelect: document.getElementById("foodSelect"),
  starsInput: document.getElementById("starsInput"),
  commentInput: document.getElementById("commentInput"),
  addMealBtn: document.getElementById("addMealBtn"),
  mealsByDay: document.getElementById("mealsByDay"),
  // modal
  modalOverlay: document.getElementById("modalOverlay"),
  closeModal: document.getElementById("closeModal"),
  modalPhoto: document.getElementById("modalPhoto"),
  modalFoodSelect: document.getElementById("modalFoodSelect"),
  modalStarsInput: document.getElementById("modalStarsInput"),
  modalCommentInput: document.getElementById("modalCommentInput"),
  saveModalBtn: document.getElementById("saveModalBtn"),
};

// ---- 小ユーティリティ ----
const fmt = (n) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(n);
const todayKey = (d) => d.toISOString().slice(0,10); // YYYY-MM-DD
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
  // 日付降順
  return Array.from(map.entries()).sort((a,b) => b[0].localeCompare(a[0]));
}

// ---- JSON読み込み & モデル読み込み ----
async function loadJSONs() {
  const [foodsRes, dishesRes] = await Promise.all([fetch(FOODS_JSON), fetch(DISHES_JSON)]);
  if (!foodsRes.ok || !dishesRes.ok) throw new Error("foods.json/dishes.json が読み込めません");
  foods = await foodsRes.json();
  dishes = await dishesRes.json();

  // セレクトに dishes を反映（既存の option を保ちつつ追加）
  const currentSet = new Set(Array.from(els.foodSelect.options).map(o => o.value));
  for (const d of dishes) {
    if (!currentSet.has(d.className)) {
      const opt = document.createElement("option");
      opt.value = d.className;
      opt.textContent = d.className;
      els.foodSelect.appendChild(opt);
    }
  }
  // モーダル側も同じものを投入（都度クリアして再作成）
  els.modalFoodSelect.innerHTML = "";
  for (const o of els.foodSelect.options) {
    const opt = document.createElement("option");
    opt.value = o.value; opt.textContent = o.textContent;
    els.modalFoodSelect.appendChild(opt);
  }
}

async function initModel() {
  if (model) return;
  const modelURL = MODEL_DIR + "model.json";
  const metadataURL = MODEL_DIR + "metadata.json";
  model = await tmImage.load(modelURL, metadataURL);
}

// ---- カロリー計算 ----
function per100Cal(foodName) {
  const f = foods.find(x => x.name === foodName);
  return f?.per100g?.cal ?? null;
}
function calcDishKcal(className) {
  const dish = dishes.find(d => d.className === className);
  if (!dish) return { total: null, rows: [] };
  let total = 0;
  const rows = [];
  for (const it of dish.ingredients) {
    const c = per100Cal(it.food);
    const kcal = c != null ? c * (it.grams / 100) : null;
    if (kcal != null) total += kcal;
    rows.push({ food: it.food, grams: it.grams, kcal });
  }
  return { total: Math.round(total), rows };
}

// ---- ストレージ ----
const STORAGE_KEY = "bisyokuka_meals";
function loadMeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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

// ---- モーダル ----
let editingId = null;
function openModal(id) {
  const items = loadMeals();
  const m = items.find(x => x.id === id);
  if (!m) return;

  editingId = id;
  els.modalPhoto.src = m.photo;
  els.modalFoodSelect.value = m.food;
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

  const food = els.modalFoodSelect.value || items[idx].food;
  const stars = Math.max(1, Math.min(5, parseInt(els.modalStarsInput.value || "3", 10)));
  const comment = els.modalCommentInput.value.trim();

  // kcal再計算（料理が変わった可能性）
  const { total } = calcDishKcal(food);
  items[idx] = { ...items[idx], food, stars, comment, kcal: total ?? items[idx].kcal };
  saveMeals(items);
  render();
  closeModal();
});

// ---- 画像選択（プレビュー＆自動判定） ----
els.photoInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const dataURL = await readAsDataURL(file);
  els.photoPreview.innerHTML = `<img src="${dataURL}" alt="preview">`;

  // 料理未選択の場合はモデルで推定 → セレクトに反映
  try {
    await loadJSONs();              // dishes を先に読み込む（候補反映）
    await initModel();              // モデル準備
    const img = document.createElement("img");
    img.src = dataURL;
    await new Promise(r => img.onload = r);
    const pred = await model.predict(img);
    pred.sort((a,b) => b.probability - a.probability);
    const guess = pred[0]?.className;
    if (guess) {
      // セレクトに存在しない場合もあるので、存在すればセット
      const optValues = Array.from(els.foodSelect.options).map(o => o.value);
      if (optValues.includes(guess)) {
        els.foodSelect.value = guess;
      }
    }
  } catch (err) {
    console.warn("自動判定エラー:", err);
  }
});

// ---- 記録 ----
els.addMealBtn.addEventListener("click", async () => {
  const file = els.photoInput.files?.[0];
  if (!file) { alert("写真を選択してください"); return; }

  const food = els.foodSelect.value;
  if (!food) { alert("料理名を選択してください"); return; }

  const stars = Math.max(1, Math.min(5, parseInt(els.starsInput.value || "3", 10)));
  const comment = els.commentInput.value.trim();

  await loadJSONs();
  const { total } = calcDishKcal(food);

  const photo = await readAsDataURL(file);
  const now = new Date();
  const item = {
    id: "m_" + now.getTime(),
    date: now.toISOString(),
    food,
    kcal: total ?? 0,
    stars,
    comment,
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

  render();
});

// 初期化
(async function init() {
  try { await loadJSONs(); } catch (e) { console.warn(e); }
  render();
})();