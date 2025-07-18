const URL = "./tm-my-image-model/";
let model, webcam, labelContainer, maxPredictions;

// カロリーDB（料理名とカロリーの対応）
const calorieDB = {
  "ハンバーグ": "400 kcal",
  "ラーメン": "600 kcal"
};

// モデル読み込み
(async () => {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
})();

// Webカメラ判定
async function init() {
  const flip = true;
  webcam = new tmImage.Webcam(200, 200, flip);
  await webcam.setup();
  await webcam.play();
  window.requestAnimationFrame(loop);

  document.getElementById("webcam-container").appendChild(webcam.canvas);
  labelContainer = document.getElementById("label-container");
  labelContainer.innerHTML = "";

  for (let i = 0; i < maxPredictions; i++) {
    labelContainer.appendChild(document.createElement("div"));
  }

  const calorieDiv = document.createElement("div");
  calorieDiv.id = "calorie-display";
  calorieDiv.style.fontWeight = "bold";
  calorieDiv.style.color = "#e91e63";
  calorieDiv.style.marginTop = "10px";
  labelContainer.appendChild(calorieDiv);
}

async function loop() {
  webcam.update();
  await predictWebcam();
  window.requestAnimationFrame(loop);
}

async function predictWebcam() {
  const prediction = await model.predict(webcam.canvas);
  prediction.sort((a, b) => b.probability - a.probability);
  const top = prediction[0];

  for (let i = 0; i < maxPredictions; i++) {
    const p = prediction[i];
    labelContainer.childNodes[i].innerHTML = `${p.className}: ${p.probability.toFixed(2)}`;
  }

  const cal = calorieDB[top.className] || "不明";
  labelContainer.childNodes[maxPredictions].innerHTML = `▶ 推定カロリー: ${cal}`;
}

// アップロード画像判定
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file || !model) return;

  const img = document.getElementById("uploaded-image");
  img.src = URL.createObjectURL(file);
  img.style.display = "block";

  img.onload = async () => {
    const prediction = await model.predict(img);
    prediction.sort((a, b) => b.probability - a.probability);
    const top = prediction[0];

    const cal = calorieDB[top.className] || "不明";
    const resultDiv = document.getElementById("upload-result");
    resultDiv.innerHTML = `
      <strong>判定結果:</strong><br>
      ${top.className}（${(top.probability * 100).toFixed(1)}%）<br>
      ▶ 推定カロリー: ${cal}
    `;
  };
}
