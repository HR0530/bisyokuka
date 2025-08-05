const foods = [
  { name: "ラーメン", kcal: 550 }, { name: "カレー", kcal: 700 },
  { name: "ハンバーグ", kcal: 480 }, { name: "サラダ", kcal: 90 },
  { name: "牛丼", kcal: 800 }, { name: "うどん", kcal: 400 },
  { name: "パスタ", kcal: 550 }, { name: "親子丼", kcal: 650 },
  { name: "オムライス", kcal: 620 }, { name: "サンドイッチ", kcal: 370 },
  { name: "パンケーキ", kcal: 420 }, { name: "寿司", kcal: 450 }
];

// --- 写真選択でプレビュー ---
document.getElementById("photoInput").addEventListener("change", function(e) {
  const preview = document.getElementById("photoPreview");
  preview.innerHTML = "";
  if (this.files && this.files[0]) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(this.files[0]);
    preview.appendChild(img);
  }
});

document.getElementById("addMealBtn").onclick = function () {
  const photoInput = document.getElementById("photoInput");
  const foodSelect = document.getElementById("foodSelect");
  const starsInput = document.getElementById("starsInput");
  const commentInput = document.getElementById("commentInput");
  const foodName = foodSelect.value;
  const stars = Number(starsInput.value) || 4;
  const comment = commentInput.value;

  if (photoInput.files.length === 0) { alert("写真を選んでください"); return; }
  if (!foodName) { alert("料理名を選択してください"); return; }

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
    document.getElementById("photoPreview").innerHTML = "";
  };
  reader.readAsDataURL(photoInput.files[0]);
};

function saveMeal(foodName, kcal, photoData, stars, comment) {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  meals.unshift({
    foodName, kcal, photoData, stars, comment, date: new Date().toLocaleString()
  });
  localStorage.setItem("meals", JSON.stringify(meals));
  showMeals();
}



function showMeals() {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  // 日付ごとにグループ化（例："2025/08/05"）
  const groups = {};
  meals.forEach((m, i) => {
    const dateKey = m.date.split(' ')[0]; // "2025/08/05"
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push({ ...m, idx: i });
  });

  let html = '';
  Object.keys(groups).sort((a,b)=>b.localeCompare(a)).forEach(dateKey => {
    html += `<div class="day-group"><h2>${dateKey}</h2>
      <div class="meal-grid">` +
      groups[dateKey].map(m => `
        <div class="meal-card" data-idx="${m.idx}">
          <div class="meal-img-wrap">
            <img src="${m.photoData}" class="meal-img" alt="meal-photo">
          </div>
          <div class="meal-info">
            <div class="meal-title">${m.foodName}</div>
            <div class="meal-calorie">${m.kcal} kcal</div>
            <div class="meal-desc">${m.comment ? m.comment : ""}</div>
            <div class="meal-date">${m.date}</div>
            <button class="delete-btn" data-idx="${m.idx}">🗑削除</button>
          </div>
        </div>
      `).join('') +
      `</div></div>`;
  });
  document.getElementById("mealsByDay").innerHTML = html;

  // 削除ボタンイベント
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = function(e) {
      if (confirm('この記録を削除しますか？')) {
        deleteMeal(Number(btn.dataset.idx));
      }
      e.stopPropagation();
    };
  });
}
function deleteMeal(idx) {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  meals.splice(idx, 1);
  localStorage.setItem("meals", JSON.stringify(meals));
  showMeals();
}



  // カードクリックで詳細モーダル
  document.querySelectorAll('.meal-card').forEach(card => {
    card.onclick = () => showModal(card.dataset.idx);
  });
}
showMeals();

// --- 詳細編集モーダル ---
function showModal(idx) {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  const m = meals[idx];
  document.getElementById("modalPhoto").src = m.photoData;
  setFoodOptions("modalFoodSelect", m.foodName);
  document.getElementById("modalStarsInput").value = m.stars;
  document.getElementById("modalCommentInput").value = m.comment || "";

  document.getElementById("modalOverlay").style.display = "flex";
  document.getElementById("saveModalBtn").onclick = function() {
    m.foodName = document.getElementById("modalFoodSelect").value;
    m.stars = Number(document.getElementById("modalStarsInput").value);
    m.comment = document.getElementById("modalCommentInput").value;
    meals[idx] = m;
    localStorage.setItem("meals", JSON.stringify(meals));
    showMeals();
    closeModal();
  };
}

function closeModal() { document.getElementById("modalOverlay").style.display = "none"; }
document.getElementById("closeModal").onclick = closeModal;

// 選択肢セット
function setFoodOptions(selectId, selectedName) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = `<option value="">料理名を選択</option>`;
  foods.forEach(f => {
    sel.innerHTML += `<option value="${f.name}" ${f.name===selectedName?'selected':''}>${f.name}</option>`;
  });
}
