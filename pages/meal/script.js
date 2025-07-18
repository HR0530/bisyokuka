const URL = "./tm-my-image-model/";
let model, maxPredictions;

async function loadModel() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
}
loadModel();

const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const resultDiv = document.getElementById("result");
const predictButton = document.getElementById("predictButton");
const historyList = document.getElementById("historyList");

let uploadedImage = null;

imageUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.src = reader.result;
    img.onload = () => {
      uploadedImage = img;
      imagePreview.innerHTML = "";
      imagePreview.appendChild(img);
    };
  };
  reader.readAsDataURL(file);
});

predictButton.addEventListener("click", async () => {
  if (!uploadedImage || !model) {
    resultDiv.textContent = "画像が読み込まれていません";
    return;
  }

  const prediction = await model.predict(uploadedImage);
  prediction.sort((a, b) => b.probability - a.probability);

  const top = prediction[0];
  const now = new Date();
  const datetime = now.toLocaleString();
  const label = top.className;
  const confidence = (top.probability * 100).toFixed(2);

  // ラベルからカロリーを推定（例：ラベル名: カロリー）
  const caloriesMap = {
    "ラーメン": 500,
    "サラダ": 120,
    "カレー": 650,
    "ハンバーグ": 700,
    "寿司": 400
  };
  const estimatedCalories = caloriesMap[label] || "不明";

  resultDiv.innerHTML = `
    <p>分類結果: <strong>${label}</strong></p>
    <p>信頼度: <strong>${confidence}%</strong></p>
    <p>推定カロリー: <strong>${estimatedCalories} kcal</strong></p>
    <p>日時: ${datetime}</p>
  `;

  // 履歴追加
  const item = document.createElement("li");
  item.innerHTML = `
    ${datetime} - ${label} (${estimatedCalories} kcal, ${confidence}%)
  `;
  historyList.prepend(item);
});
