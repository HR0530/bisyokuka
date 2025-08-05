// カロリー表（例）
const calorieTable = {
  "ラーメン": 550,
  "カレー": 700,
  "ハンバーグ": 480,
  "サラダ": 90,
  "牛丼": 800,
  "うどん": 400,
  // 追加OK
};

document.getElementById("addMeal").onclick = function () {
  const select = document.getElementById("foodSelect");
  let foodName = select.value;
  const manual = document.getElementById("foodManual").value.trim();
  if (manual) foodName = manual;
  if (!foodName) return alert("料理名を入力してください");

  const kcal = calorieTable[foodName] || prompt(`${foodName}のカロリーを入力してください`);
  if (!kcal) return;

  // 保存（localStorage例）
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");

  // 写真もあれば表示・保存（容量注意、必須でなければ省略OK）
  let photoData = "";
  const photoInput = document.getElementById("photoInput");
  if (photoInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = function (e) {
      photoData = e.target.result;
      saveMeal(foodName, kcal, photoData);
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
        ${m.photoData ? `<img src="${m.photoData}" alt="meal-photo" style="width:100px;display:block;">` : ""}
        <div>${m.date}：${m.foodName}（${m.kcal}kcal）</div>
      </div>
    `).join("");
}
showMeals();
