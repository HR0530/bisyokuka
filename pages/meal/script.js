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

// Teachable Machineモデルのパス
const MODEL_URL = "./my_model/";
let model;
async function loadModel() {
  model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
}
loadModel();

document.getElementById("addMeal").onclick = async function () {
  const photoInput = document.getElementById("photoInput");
  if (photoInput.files.length === 0) {
    alert("写真を選んでください");
    return;
  }

  document.getElementById("addMeal").disabled = true;
  document.getElementById("addMeal").textContent = "AIが認識中…";

  const file = photoInput.files[0];
  const img = new Image();
  img.onload = async function () {
    // Teachable Machineで推論
    if (!model) {
      alert("AIモデルの読み込み中です。もう一度お試しください。");
      document.getElementById("addMeal").disabled = false;
      document.getElementById("addMeal").textContent = "写真からAI判定";
      return;
    }
    const prediction = await model.predict(img);
    const top = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
    const foodName = top.className;
    const food = foods.find(f => f.name === foodName);
    const kcal = food ? food.kcal : "";

    // 画像（base64）も保存する
    const reader = new FileReader();
    reader.onload = function (e) {
      saveMeal(foodName, kcal, e.target.result);
      document.getElementById("addMeal").disabled = false;
      document.getElementById("addMeal").textContent = "写真からAI判定";
    };
    reader.readAsDataURL(file);
  };
  img.src = URL.createObjectURL(file);
};

function saveMeal(foodName, kcal, photoData) {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  meals.unshift({ foodName, kcal, photoData, date: new Date().toLocaleString() });
  localStorage.setItem("meals", JSON.stringify(meals));
  showMeals();
}

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
