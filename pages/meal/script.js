const URL = "./my_model/";
let model, webcam, labelContainer, maxPredictions;

// カロリーDB（料理名とカロリーの対応）
const calorieDB = {
  "ハンバーグ": "400 kcal",
  "ラーメン": "600 kcal"
};

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
  for (let i = 0; i < maxPredictions + 1; i++) {
    labelContainer.appendChild(document.createElement("div"));
  }
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(webcam.canvas);
  prediction.sort((a, b) => b.probability - a.probability);
  const topPrediction = prediction[0];

  for (let i = 0; i < maxPredictions; i++) {
    const p = prediction[i];
    labelContainer.childNodes[i].innerHTML =
      `${p.className}: ${p.probability.toFixed(2)}`;
  }

  const calorieText = calorieDB[topPrediction.className] || "不明";
  labelContainer.childNodes[maxPredictions].innerHTML =
    `▶ 推定カロリー: ${calorieText}`;
}
