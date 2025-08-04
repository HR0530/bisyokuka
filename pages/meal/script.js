document.getElementById("photoInput").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const now = new Date().toLocaleString();

    const card = document.createElement("div");
    card.className = "grid-card";

    card.innerHTML = `
      <img src="${e.target.result}" alt="meal-photo">
      <div class="info" style="padding: 0.5rem">
        <div style="font-size: 0.8rem;">📅 ${now}</div>
        <div style="font-size: 0.8rem;">🔥 カロリー: 推定中…</div>
      </div>
    `;

    // 疑似カロリー
    setTimeout(() => {
      const kcal = Math.floor(Math.random() * 400 + 300);
      card.querySelector(".info div:nth-child(2)").textContent = `🔥 カロリー: 約 ${kcal} kcal`;
    }, 1000);

    document.getElementById("mealGrid").prepend(card);
  };

  reader.readAsDataURL(file);
});
