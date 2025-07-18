const URL = "./my_model/";
let model, webcam, labelContainer, maxPredictions;

// カロリーDB（料理名とカロリーの対応）
const calorieDB = {
  "ハンバーグ": "400 kcal",
  "ラーメン": "600 kcal"
};

let history = []; // 履歴保存用配列

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  const flip = true;
  webcam = new tmImage.Webcam(200, 200, flip);
  await webcam.setup();
  await webcam.play();
  window.requestAnimationFrame(loop);

  document.getElementById("webcam-container").appendChild(webcam.canvas);
  labelContainer = document.getElementById("label-container");
  labelContainer.innerHTML = ""; // クリア

  for (let i = 0; i < maxPredictions; i++) {
    labelContainer.appendChild(document.createElement("div"));
  }
  // カロリー表示用
  const calorieDiv = document.createElement("div");
  calorieDiv.id = "calorie-display";
  calorieDiv.style.fontWeight = "bold";
  calorieDiv.style.color = "#e91e63";
  calorieDiv.style.marginTop = "10px";
  labelContainer.appendChild(calorieDiv);

  // 履歴表示エリア追加
  const historyTitle = document.createElement("h2");
  historyTitle.textContent = "撮影履歴";
  document.body.appendChild(historyTitle);

  const historyContainer = document.createElement("div");
  historyContainer.id = "history-container";
  historyContainer.style.textAlign = "left";
  historyContainer.style.maxHeight = "200px";
  historyContainer.style.overflowY = "auto";
  historyContainer.style.margin = "10px auto";
  historyContainer.style.width = "220px";
  historyContainer.style.border = "1px solid #ccc";
  historyContainer.style.padding = "5px";
  document.body.appendChild(historyContainer);

  // シャッターボタン追加
  const shutterBtn = document.createElement("button");
  shutterBtn.textContent = "📷 撮影して記録";
  shutterBtn.style.marginTop = "10px";
  shutterBtn.onclick = saveCurrentPrediction;
  document.body.insertBefore(shutterBtn, historyTitle);

  // ローカルストレージから履歴を復元
  loadHistoryFromStorage();
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

let latestPrediction = null;

async function predict() {
  const prediction = await model.predict(webcam.canvas);
  prediction.sort((a, b) => b.probability - a.probability);
  const topPrediction = prediction[0];
  latestPrediction = topPrediction;

  for (let i = 0; i < maxPredictions; i++) {
    const p = prediction[i];
    labelContainer.childNodes[i].innerHTML =
      `${p.className}: ${p.probability.toFixed(2)}`;
  }

  const calorieText = calorieDB[topPrediction.className] || "不明";
  labelContainer.childNodes[maxPredictions].innerHTML =
    `▶ 推定カロリー: ${calorieText}`;
}

// 撮影時の予測結果を履歴に保存し、表示更新・localStorageに保存
function saveCurrentPrediction() {
  if (!latestPrediction) return alert("まだ認識されていません。");

  const now = new Date();
  const timestamp = now.toLocaleString();
  const className = latestPrediction.className;
  const calorieText = calorieDB[className] || "不明";

  const record = {
    timestamp,
    className,
    calorieText,
  };

  history.unshift(record); // 新しいものを先頭に

  updateHistoryDisplay();
  saveHistoryToStorage();
}

// 履歴表示の更新
function updateHistoryDisplay() {
  const container = document.getElementById("history-container");
  container.innerHTML = "";

  if (history.length === 0) {
    container.textContent = "まだ記録がありません。";
    return;
  }

  history.forEach((rec) => {
    const div = document.createElement("div");
    div.textContent = `[${rec.timestamp}] ${rec.className} - ${rec.calorieText}`;
    container.appendChild(div);
  });
}

// localStorageに履歴保存
function saveHistoryToStorage() {
  try {
    localStorage.setItem("calorieHistory", JSON.stringify(history));
  } catch (e) {
    console.error("localStorage保存エラー", e);
  }
}

// localStorageから履歴読み込み
function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem("calorieHistory");
    if (saved) {
      history = JSON.parse(saved);
      updateHistoryDisplay();
    }
  } catch (e) {
    console.error("localStorage読み込みエラー", e);
  }
}
