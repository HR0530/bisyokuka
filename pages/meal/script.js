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

document.getElementById("addMealBtn").onclick = function () {
  const photoInput = document.getElementById("photoInput");
  const foodSelect = document.getElementById("foodSelect");
  const starsInput = document.getElementById("starsInput");
  const commentInput = document.getElementById("commentInput");

  const foodName = foodSelect.value;
  const stars = Number(starsInput.value) || 4;
  const comment = commentInput.value;

  if (photoInput.files.length === 0) {
    alert("写真を選んでください");
    return;
  }
  if (!foodName) {
    alert("料理名を選択してください");
    return;
  }

  const food = foods.find(f => f.name === foodName);
  const kcal = food ? food.kcal : prompt("カロリーを入力してください");

  const reader = new FileReader();
  reader.onload = function (e) {
    saveMeal(foodName, kcal, e.target.result, stars, comment);
    // 入力欄リセット
    foodSelect.selectedIndex = 0;
    starsInput.value = 4;
    commentInput.value = "";
    photoInput.value = "";
  };
  reader.readAsDataURL(photoInput.files[0]);
};

function saveMeal(foodName, kcal, photoData, stars, comment) {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  meals.unshift({
    foodName,
    kcal,
    photoData,
    stars,
    comment,
    date: new Date().toLocaleString()
  });
  localStorage.setItem("meals", JSON.stringify(meals));
  showMeals();
}

function showMeals() {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  document.querySelector(".meal-grid").innerHTML = meals.map(m => `
    <div class="meal-card">
      <div class="meal-img-wrap">
        <img src="${m.photoData}" class="meal-img" alt="meal-photo">
      </div>
      <div class="meal-info">
        <div class="meal-title">${m.foodName}</div>
        <div class="meal-calorie">${m.kcal} kcal</div>
        <div class="meal-desc">${m.comment ? m.comment : ""}</div>
        <div class="meal-stars">${"★".repeat(m.stars || 4)}${"☆".repeat(5-(m.stars||4))}</div>
        <div class="meal-date" style="font-size:0.88rem; color:#888; margin-top:0.4em;">${m.date}</div>
      </div>
    </div>
  `).join("");
}
showMeals();
