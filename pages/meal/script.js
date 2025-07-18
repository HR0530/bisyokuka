document.getElementById('meal-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const fileInput = document.getElementById('meal-photo');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    const imageBase64 = event.target.result.split(',')[1];

    const timestamp = new Date().toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    let labelDescription = '不明';
    let estimatedCalories = '??? kcal';

    // 🍚 料理名とその一般的なカロリー（100〜600kcal程度）
    const calorieDB = {
      "カレーライス": 550,
      "ラーメン": 600,
      "ハンバーグ": 400,
      "寿司": 500,
      "天ぷら": 450,
      "とんかつ": 600,
      "焼きそば": 520,
      "うどん": 350,
      "そば": 330,
      "牛丼": 550,
      "オムライス": 500,
      "スパゲッティ": 480,
      "ピザ": 600,
      "唐揚げ": 550,
      "親子丼": 500
    };

    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=AIzaSyAdZutx0s1Jjcs_vtaTFXBPgSN-VuXNShA", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "この画像の料理名と含まれる主な食材、そして一般的な分量での合計カロリー（kcal）をできるだけ詳しく答えてください。"
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      });

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "認識できませんでした";

      const labelMatch = text.match(/これは(.+?)です/);
      const calorieMatch = text.match(/おおよそ(\d+)\s?kcal/);

      if (labelMatch) {
        labelDescription = labelMatch[1];

        // 🍴 Geminiの結果にカロリー情報がなければ、calorieDBを参照
        if (calorieMatch) {
          estimatedCalories = calorieMatch[1] + " kcal";
        } else if (calorieDB[labelDescription]) {
          estimatedCalories = calorieDB[labelDescription] + " kcal（推定DBより）";
        } else {
          estimatedCalories = "不明";
        }
      } else {
        labelDescription = "不明";
        estimatedCalories = "不明";
      }

    } catch (err) {
      console.error("Gemini Vision API エラー:", err);
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
