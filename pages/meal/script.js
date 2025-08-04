document.getElementById("photoInput").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const now = new Date();
    const formattedDate = now.toLocaleString();

    const mealCard = document.createElement("div");
    mealCard.className = "meal-card";

    mealCard.innerHTML = `
      <img src="${e.target.result}" alt="食事写真">
      <div class="detail-btn">ⓘ</div>
      <div class="info">
        <div>📅 日時: ${formattedDate}</div>
        <div>📍 場所: 自動取得中…</div>
        <div>🔥 カロリー: 推定中...</div>
        <div class="star-rating">⭐️⭐️⭐️☆☆</div>
      </div>
      <div class="details">
        <p>感想: とてもおいしかった！</p>
      </div>
    `;

    // 詳細ボタンのクリック処理
    mealCard.querySelector(".detail-btn").addEventListener("click", () => {
      const detail = mealCard.querySelector(".details");
      detail.style.display = detail.style.display === "block" ? "none" : "block";
    });

    // 位置情報の取得（許可が必要）
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);
          mealCard.querySelector(".info div:nth-child(2)").textContent = `📍 場所: 緯度${lat}, 経度${lon}`;
        },
        () => {
          mealCard.querySelector(".info div:nth-child(2)").textContent = "📍 場所: 不明";
        }
      );
    }

    // カロリー推定（ダミー値）
    setTimeout(() => {
      const kcal = Math.floor(Math.random() * 500) + 300;
      mealCard.querySelector(".info div:nth-child(3)").textContent = `🔥 カロリー: 約 ${kcal} kcal`;
    }, 1000);

    document.getElementById("mealList").prepend(mealCard);
  };

  reader.readAsDataURL(file);
});
