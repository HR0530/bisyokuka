// デモ用データ（本来はlocalStorageやAPIから取得）
const nutritionData = [
  { date: "2025-08-15", kcal: 1800, protein: 75, fat: 60, carbs: 220 },
  { date: "2025-08-16", kcal: 1950, protein: 80, fat: 65, carbs: 250 },
  { date: "2025-08-17", kcal: 1600, protein: 70, fat: 55, carbs: 200 },
];

// 表を生成
function fillTable(id, key) {
  const tbody = document.getElementById(id);
  nutritionData.forEach(item => {
    const row = `<tr><td>${item.date}</td><td>${item[key]}</td></tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

fillTable("calorieTable", "kcal");
fillTable("proteinTable", "protein");
fillTable("fatTable", "fat");
fillTable("carbTable", "carbs");

// アコーディオン処理
document.querySelectorAll(".accordion-header").forEach(button => {
  button.addEventListener("click", () => {
    const content = button.nextElementSibling;
    content.classList.toggle("open");
  });
});
