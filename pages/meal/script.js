// 擬似料理リスト（AIっぽいランダム推論）
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

document.getElementById("addMeal").onclick = function () {
  const photoInput = document.getElementById("photoInput");
  if (photoInput.files.length === 0) {
    alert("写真を選んでください");
    return;
  }

  document.getElementById("addMeal").disabled = true;
  document.getElementById("addMeal").textContent = "AIが認識中…";
  
  // 写真読み込み
  const reader = new FileReader();
  reader.onload = function (e) {
    // 擬似AI推論（ランダム選択）
    setTimeout(() => {
      const picked = foods[Math.floor(Math.random() * foods.length)];
      saveMeal(picked.name, picked.kcal, e.target.result);
      document.getElementById("addMeal").disabled = false;
      document.getElementById("addMeal").textContent = "写真からAI判定";
    }, 1400 + Math.random() * 900); // AIっぽくランダム遅延
  };
  reader.readAsDataURL(photoInput.files[0]);
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
