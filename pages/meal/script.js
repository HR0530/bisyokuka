const API_KEY = "fab74dd82a877c6edfac8594ef6cba7509f2592e";

// サンプルカロリー表（料理名の追加OK）
const calorieTable = {
  "ラーメン": 550,
  "ramen": 550,
  "カレー": 700,
  "カレーライス": 700,
  "curry": 700,
  "サラダ": 90,
  "牛丼": 800,
  "gyudon": 800,
  "ハンバーグ": 480,
  "うどん": 400,
  "noodle": 400,
};

document.getElementById("photoInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  // ステータスメッセージ
  setStatus("写真を解析しています...");

  // 画像プレビュー用
  const reader = new FileReader();
  reader.onload = async function (e) {
    // カード生成（最初は仮状態）
    const now = new Date().toLocaleString();
    const card = document.createElement("div");
    card.className = "grid-card";
    card.innerHTML = `
      <img src="${e.target.result}" alt="meal-photo">
      <div class="info" style="padding: 0.5rem">
        <div style="font-size: 0.8rem;">📅 ${now}</div>
        <div class="kcal-status" style="font-size: 0.8rem;">🔥 カロリー: 推定中…</div>
        <div class="food-select-area" style="margin-top:0.4rem;"></div>
      </div>
    `;
    document.getElementById("mealGrid").prepend(card);

    // Vision APIで候補取得
    const labels = await analyzeImageWithVisionAPI(file, API_KEY);

    if (labels.length === 0) {
      setStatus("候補が見つかりませんでした。料理名を直接入力してください。");
      card.querySelector(".food-select-area").innerHTML = `
        <input type="text" class="manual-food" placeholder="料理名を入力">
        <button class="confirm-btn">カロリーを表示</button>
      `;
      card.querySelector(".confirm-btn").onclick = () => {
        const val = card.querySelector(".manual-food").value;
        updateKcalDisplay(val, card);
      };
    } else {
      setStatus(`写真から認識した候補は以下です。選択してください：`);
      card.querySelector(".food-select-area").innerHTML = `
        <select class="food-select">
          ${labels.map(l => `<option value="${l}">${l}</option>`).join("")}
        </select>
        <button class="confirm-btn">カロリーを表示</button>
        <br>
        <span style="font-size:0.85em;color:#888;">候補が違う場合は直接入力：</span>
        <input type="text" class="manual-food" placeholder="料理名を入力">
      `;
      // セレクト・ボタン・手入力欄取得
      const select = card.querySelector(".food-select");
      const manual = card.querySelector(".manual-food");
      card.querySelector(".confirm-btn").onclick = () => {
        let val = select.value;
        if (manual.value.trim() !== "") val = manual.value.trim();
        updateKcalDisplay(val, card);
      };
    }
  };
  reader.readAsDataURL(file);
});

// ステータスメッセージ表示
function setStatus(text) {
  document.getElementById("statusMessage").textContent = text;
}

// Vision APIで料理候補取得
async function analyzeImageWithVisionAPI(file, apiKey) {
  try {
    const base64 = await fileToBase64(file);
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const body = {
      requests: [{
        image: { content: base64.split(',')[1] },
        features: [{ type: "LABEL_DETECTION", maxResults: 8 }]
      }]
    };
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    // デバッグ用（APIが動作しているか確認）
    console.log("Vision APIレスポンス:", data);
    // ラベル抽出
    return data.responses?.[0]?.labelAnnotations?.map(x => x.description) || [];
  } catch (e) {
    setStatus("エラーが発生しました。しばらくしてから再度お試しください。");
    console.error(e);
    return [];
  }
}

// ファイル→Base64変換
function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// カロリー表示
function updateKcalDisplay(foodName, card) {
  const kcal = calorieTable[foodName] || "";
  const kcalDiv = card.querySelector(".kcal-status");
  if (kcal) {
    kcalDiv.textContent = `🔥 カロリー: 約 ${kcal} kcal`;
    setStatus(`「${foodName}」としてカロリーを記録しました。`);
    // ここで合計カロリーに加算なども可能
    const current = Number(localStorage.getItem("todayCalories") || 0);
    if (!card.dataset.added) {
      localStorage.setItem("todayCalories", current + kcal);
      card.dataset.added = "true";
    }
  } else {
    kcalDiv.textContent = "🔥 カロリー情報なし";
    setStatus(`「${foodName}」はカロリー表に未登録です。`);
  }
}
