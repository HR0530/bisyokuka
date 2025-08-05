const calorieTable = {
  "ラーメン": 550,
  "カレー": 700,
  "ハンバーグ": 480,
  "サラダ": 90,
  "牛丼": 800,
  "うどん": 400,
};

document.getElementById("addMeal").onclick = function () {
  const select = document.getElementById("foodSelect");
  let foodName = select.value;
  const manual = document.getElementById("foodManual").value.trim();
  if (manual) foodName = manual;
  if (!foodName) return alert("料理名を入力してください");

  const kcal = calorieTable[foodName] || prompt(`${foodName}のカロリーを入力してください`);
  if (!kcal) return;

  const photoInput = document.getElementById("photoInput");
  if (photoInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = function (e) {
      saveMeal(foodName, kcal, e.target.result);
    };
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    saveMeal(foodName, kcal, "");
  }
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
        ${m.photoData ? `<img src="${m.photoData}" alt="meal-photo">` : `<div style="height:120px;background:#eee;"></div>`}
        <div class="meal-meta">
          <div class="meal-date">${m.date}</div>
          <div class="meal-name">${m.foodName}</div>
          <div class="meal-kcal">🔥 ${m.kcal} kcal</div>
        </div>
      </div>
    `).join("");
}
showMeals();
