const MODEL_URL = './tm-my-image-model/';

let model, maxPredictions;

// 料理名→カロリー対応（適宜編集してください）
const calorieDB = {
  "ハンバーグ": "400 kcal",
  "ラーメン": "600 kcal",
  "オムレツ": "350 kcal",
  // ここに判定できる料理名とカロリーを追加してください
};

async function init() {
  const modelURL = MODEL_URL + 'model.json';
  const metadataURL = MODEL_URL + 'metadata.json';
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
}

async function predict(imageElement) {
  const prediction = await model.predict(imageElement);
  prediction.sort((a,b) => b.probability - a.probability);
  const top = prediction[0];

  return {
    className: top.className,
    probability: top.probability
  };
}

function displayResult(className, probability) {
  const resultContainer = document.getElementById('result-container');
  const calorieText = calorieDB[className] || "不明";

  resultContainer.textContent = `推定料理: ${className} （確率: ${(probability*100).toFixed(1)}%）｜ 推定カロリー: ${calorieText}`;
}

function addHistory(className, calorie) {
  const historyList = document.getElementById('history-list');
  const now = new Date();
  const timeString = now.toLocaleString();

  const li = document.createElement('li');
  li.textContent = `[${timeString}] ${className} - ${calorie}`;
  historyList.prepend(li);

  // ローカルストレージに保存
  saveHistoryToLocalStorage(className, calorie, now);
}

function saveHistoryToLocalStorage(className, calorie, dateObj) {
  let history = JSON.parse(localStorage.getItem('calorieHistory') || '[]');
  history.unshift({
    className: className,
    calorie: calorie,
    timestamp: dateObj.getTime()
  });
  // 最大100件に制限
  if (history.length > 100) history.pop();
  localStorage.setItem('calorieHistory', JSON.stringify(history));
}

function loadHistoryFromLocalStorage() {
  const historyList = document.getElementById('history-list');
  let history = JSON.parse(localStorage.getItem('calorieHistory') || '[]');
  historyList.innerHTML = '';
  history.forEach(item => {
    const li = document.createElement('li');
    const dt = new Date(item.timestamp);
    li.textContent = `[${dt.toLocaleString()}] ${item.className} - ${item.calorie}`;
    historyList.appendChild(li);
  });
}

document.getElementById('upload-image').addEventListener('change', async function(e) {
  if (!model) {
    alert('モデル読み込み中です。少々お待ちください。');
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  const imgURL = URL.createObjectURL(file);

  // 画像プレビュー表示
  const preview = document.getElementById('image-preview');
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.src = imgURL;
  preview.appendChild(img);

  // 画像が読み込まれたら推定開始
  img.onload = async () => {
    const res = await predict(img);
    displayResult(res.className, res.probability);
    const calText = calorieDB[res.className] || "不明";
    addHistory(res.className, calText);
  };
});

// ページ読み込み時にモデルを読み込みと履歴復元
window.onload = async () => {
  await init();
  loadHistoryFromLocalStorage();
};
