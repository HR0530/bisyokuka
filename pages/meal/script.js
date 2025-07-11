document.getElementById('meal-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const fileInput = document.getElementById('meal-photo');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    const imageBase64 = event.target.result.split(',')[1]; // base64のみ

    const timestamp = new Date().toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    let estimatedCalories = '??? kcal';
    let labelDescription = '不明';

    try {
      const visionResponse = await fetch(
        "https://vision.googleapis.com/v1/images:annotate?key=7077a1384411d30b64524f88f618c93ba755130f",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageBase64,
                },
                features: [{ type: "LABEL_DETECTION", maxResults: 5 }],
              },
            ],
          }),
        }
      );

      const data = await visionResponse.json();
      const labels = data.responses[0].labelAnnotations;

      if (labels && labels.length > 0) {
        labelDescription = labels[0].description;
        estimatedCalories = estimateCaloriesFromLabel(labelDescription) + " kcal";
      } else {
        labelDescription = '料理名不明';
        estimatedCalories = 'カロリー不明';
      }
    } catch (err) {
      console.error("Vision API エラー:", err);
      labelDescription = 'エラー';
      estimatedCalories = '取得失敗';
    }

    const entry = document.createElement('div');
    entry.className = 'record-entry';
    entry.innerHTML = `
      <img src="${event.target.result}" alt="食事画像" />
      <p><strong>アップロード日時:</strong> ${timestamp}</p>
      <p><strong>認識された料理:</strong> ${labelDescription}</p>
      <p><strong>推定カロリー:</strong> ${estimatedCalories}</p>
    `;

    document.getElementById('record-list').prepend(entry);
    fileInput.value = '';
  };

  reader.readAsDataURL(file);
});

// シンプルなラベル → カロリー辞書（必要に応じて拡張）
function estimateCaloriesFromLabel(label) {
  const calorieMap = {
    'hamburger': 500,
    'pizza': 600,
    'salad': 150,
    'sushi': 300,
    'steak': 700,
    'noodles': 450,
    'rice': 200,
    'curry': 550
  };

  const key = label.toLowerCase();
  return calorieMap[key] || 400; // デフォルトは400kcal
}
