const MODEL_PATH = "./tm-my-image-model/";

let model, maxPredictions;

// カロリー目安（モデルのクラス名に合わせて調整してください）
const calorieTable = {
  "ラーメン": 600,
  "ハンバーグ": 450,
  "カレー": 550,
  "サラダ": 120,
  "寿司": 400,
  // 追加可能
};

async function loadModel() {
  model = await tmImage.load(MODEL_PATH + "model.json", MODEL_PATH + "metadata.json");
  maxPredictions = model.getTotalClasses();
}
loadModel();

const imageUpload = document.getElementById("imageUpload");
const imageContainer = document.getElementById("image-container");
const labelContainer = document.getElementById("label-container");
const historyList = document.getElementById("history");

let uploadedImage = null;

imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 画像プレビュー作成
  const reader = new FileReader();
  reader.onload = () => {
    imageContainer.innerHTML = `<img id="uploaded-image" src="${reader.result}" alt="アップロード画像" />`;
    uploadedImage = document.getElementById("uploaded-image");
  };
  reader.readAsDataURL(file);

  // 判定結果リセット
  labelContainer.textContent = "";
});

imageUpload.addEventListener("change", async () => {
  if (!uploadedImage || !model) return;

  // 画像が完全に読み込まれてから推論
  uploadedImage.onload = async () => {
    const predictions = await model.predict(uploadedImage);
    predictions.sort((a, b) => b.probability - a.probability);
    const topPrediction = predictions[0];

    const className = topPrediction.className;
    const confidence = (topPrediction.probability * 100).toFixed(2);
    const calories = calorieTable[className] || "不明";

    labelContainer.textContent = 
      `判定結果: ${className}\n確率: ${confidence}%\n推定カロリー: ${calories} kcal`;

    // 履歴に追加
    const now = new Date().toLocaleString();
    const li = document.createElement("li");
    li.textContent = `${now} - ${className} - 約${calories} kcal`;
    historyList.prepend(li);
  };
});
