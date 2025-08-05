// --- 料理名とカロリー表 ---
const foods = [
  { name: "ラーメン", kcal: 550 },
  { name: "カレー", kcal: 700 },
  { name: "ハンバーグ", kcal: 480 },
  { name: "サラダ", kcal: 90 },
  { name: "牛丼", kcal: 800 },
  { name: "うどん", kcal: 400 },
  { name: "パスタ", kcal: 550 },
  { name: "親子丼", kcal: 650 },
  { name: "オムライス", kcal: 620 },
  { name: "サンドイッチ", kcal: 370 },
  { name: "パンケーキ", kcal: 420 },
  { name: "寿司", kcal: 450 }
];

// --- Teachable Machineモデルのパス ---
const MODEL_URL = "./my_model/";
let model = null;

// --- ページ読込時にAIモデルのロード＆ボタンの制御 ---
window.addEventListener('DOMContentLoaded', () => {
  const addMealBtn = document.getElementById("addMeal");
  addMealBtn.disabled = true;
  addMealBtn.textContent = "AIモデル読込中…";
  loadModel().then(() => {
    addMealBtn.disabled = false;
    addMealBtn.textContent = "写真からAI判定";
  });
});

async function loadModel() {
  model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
}

// --- 「写真からAI判定」ボタンの処理 ---
document.getElementById("addMeal").onclick = async function () {
  if (!model) {
    alert("AIモデル読み込み中です。もう一度押してください。");
    return;
  }
  const photoInput = document.getElementById("photoInput");
  if (photoInput.files.length === 0) {
    alert("写真を選んでください");
    return;
  }

  // ボタンUI更新
  const btn = document.getElementById("addMeal");
  btn.disabled = true;
  btn.textContent = "AIが認識中…";

  // ファイル→画像化
  const file = photoInput.files[0];
  const img = new Image();
  img.onload = async function () {
    // Teachable Machineで判定
    const prediction = await model.predict(img);
    const top = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
    const foodName = top.className;
    const food = foods.find(f => f.name === foodName);
    const kcal = food ? food.kcal : "";

    // 写真データも保存
    const reader = new FileReader();
    reader.onload = function (e) {
      saveMeal(foodName, kcal, e.target.result);
      btn.disabled = false;
      btn.textContent = "写真からAI判定";
    };
    reader.readAsDataURL(file);
  };
  img.src = URL.createObjectURL(file);
};

// --- 食事記録を保存 ---
function saveMeal(foodName, kcal, photoData) {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  meals.unshift({ foodName, kcal, photoData, date: new Date().toLocaleString() });
  localStorage.setItem("meals", JSON.stringify(meals));
  showMeals();
}

// --- インスタ風グリッドで一覧表示 ---
function showMeals() {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  document.getElementById("mealGrid").innerHTML =
    meals.map(m => `
      <div class="meal-card">
        ${m.photoData ? `<img src="${m.photoData}" alt="meal-photo">` : `<div style="height:150px;background:#eee;"></div>`}
        <div class="meal-meta">
          <div class="meal-date">${m.date}</div>
          <div class="meal-name">${m.foodName}</div>
          <div class="meal-kcal">🔥 ${m.kcal} kcal</div>
        </div>
      </div>
    `).join("");
}
showMeals();
