document.getElementById("photoInput").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const now = new Date().toLocaleString();

    const card = document.createElement("div");
    card.className = "grid-card";

    // 仮の初期表示
    card.innerHTML = `
      <img src="${e.target.result}" alt="meal-photo">
      <div class="info" style="padding: 0.5rem">
        <div style="font-size: 0.8rem;">📅 ${now}</div>
        <div style="font-size: 0.8rem;">🔥 カロリー: 推定中…</div>
      </div>
    `;

    document.getElementById("mealGrid").prepend(card);

    // 疑似カロリー推定（ランダム）＋保存
    setTimeout(() => {
      const kcal = Math.floor(Math.random() * 400 + 300); // 300〜699 kcal
      card.querySelector(".info div:nth-child(2)").textContent = `🔥 カロリー: 約 ${kcal} kcal`;

      // 現在の合計カロリーを取得して加算
      const current = Number(localStorage.getItem("todayCalories") || 0);
      const updated = current + kcal;
      localStorage.setItem("todayCalories", updated);

    }, 1000);
  };

  reader.readAsDataURL(file);
});
