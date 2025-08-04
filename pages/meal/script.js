let currentCommentTarget = null;

document.getElementById("photoInput").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const now = new Date().toLocaleString();

    const card = document.createElement("div");
    card.className = "meal-card";

    card.innerHTML = `
      <img src="${e.target.result}" alt="食事写真">
      <div class="info">
        <div>📅 ${now}</div>
        <div>🔥 カロリー: 推定中...</div>
        <div class="star-rating">
          ${[1,2,3,4,5].map(i => `<span class="star" data-val="${i}">★</span>`).join('')}
        </div>
        <button class="comment-btn">感想を書く</button>
        <div class="comment-display" style="margin-top:0.5rem;color:#555;"></div>
      </div>
    `;

    // カロリーを疑似的にセット
    setTimeout(() => {
      const kcal = Math.floor(Math.random() * 500) + 200;
      card.querySelector(".info div:nth-child(2)").textContent = `🔥 カロリー: 約 ${kcal} kcal`;
    }, 1000);

    // 星評価クリック処理
    const stars = card.querySelectorAll(".star");
    stars.forEach((star, idx) => {
      star.addEventListener("click", () => {
        stars.forEach((s, i) => {
          s.classList.toggle("selected", i <= idx);
        });
      });
    });

    // 感想ボタン処理
    const commentBtn = card.querySelector(".comment-btn");
    commentBtn.addEventListener("click", () => {
      currentCommentTarget = card.querySelector(".comment-display");
      document.getElementById("modal").style.display = "flex";
    });

    document.getElementById("mealList").prepend(card);
  };

  reader.readAsDataURL(file);
});

// モーダル操作
document.querySelector(".close").addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modalTextarea").value = "";
});

document.getElementById("saveComment").addEventListener("click", () => {
  if (currentCommentTarget) {
    const comment = document.getElementById("modalTextarea").value.trim();
    currentCommentTarget.textContent = "✏️ 感想: " + (comment || "（未記入）");
    document.getElementById("modal").style.display = "none";
    document.getElementById("modalTextarea").value = "";
  }
});
