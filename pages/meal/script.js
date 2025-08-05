const API_KEY = "fab74dd82a877c6edfac8594ef6cba7509f2592e";

// カロリー表（適宜追加）
const calorieTable = {
  "ラーメン": 550,
  "カレー": 700,
  "サラダ": 90,
  "牛丼": 800,
  "ハンバーグ": 480,
  "うどん": 400,
  // 追加OK
};

document.getElementById("photoInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  // 画像プレビュー生成
  const reader = new FileReader();
  reader.onload = async function (e) {
    const now = new Date().toLocaleString();
    const card = document.createElement("div");
    card.className = "grid-card";
    card.innerHTML = `
      <img src="${e.target.result}" alt="meal-photo">
      <div class="info" style="padding: 0.5rem">
        <div style="font-size: 0.8rem;">📅 ${now}</div>
        <div style="font-size: 0.8rem;" class="kcal-status">🔥 カロリー: 推定中…</div>
        <select class="food-select" style="display:none; margin-top:5px;"></select>
      </div>
    `;
    document.getElementById("mealGrid").prepend(card);

    // Vision API推定（料理候補を取得）
    const labels = await analyzeImageWithVisionAPI(file, API_KEY);
    const select = card.querySelector(".food-select");
    select.innerHTML = labels.map(l => `<option value="${l}">${l}</option>`).join("");
    if (labels.length > 0) {
      select.style.display = "inline-block";
      card.querySelector(".kcal-status").textContent = `🍽️ 料理候補: ${labels[0]}`;
      // 初期選択のカロリー
      updateKcalDisplay(select.value, card);
    } else {
      card.querySelector(".kcal-status").textContent = "🍽️ 料理候補なし";
    }

    // 選択変更時
    select.onchange = function () {
      updateKcalDisplay(select.value, card);
    };
  };
  reader.readAsDataURL(file);
});

// Cloud Vision APIで料理名候補を取得
async function analyzeImageWithVisionAPI(file, apiKey) {
  const base64 = await fileToBase64(file);
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = {
    requests: [{
      image: { content: base64.split(',')[1] },
      features: [{ type: "LABEL_DETECTION", maxResults: 5 }]
    }]
  };
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json();
  // descriptionの配列だけ返す
  return data.responses?.[0]?.labelAnnotations?.map(x => x.description) || [];
}

function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// カロリー表示＋合計カロリー加算
function updateKcalDisplay(foodName, card) {
  const kcal = calorieTable[foodName] || null;
  const kcalDiv = card.querySelector(".kcal-status");
  if (kcal) {
    kcalDiv.textContent = `🔥 カロリー: 約 ${kcal} kcal`;
    // 合計カロリーに加算（2重加算防止したい場合は、既に加算したかを記録してもOK）
    const current = Number(localStorage.getItem("todayCalories") || 0);
    // すでにこの料理で加算したか判定（超シンプルな仕組み例）
    if (!card.dataset.added) {
      localStorage.setItem("todayCalories", current + kcal);
      card.dataset.added = "true";
    }
  } else {
    kcalDiv.textContent = "🔥 カロリー情報なし";
  }
}
