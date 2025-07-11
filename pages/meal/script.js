document.getElementById('meal-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const fileInput = document.getElementById('meal-photo');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    const imageBase64 = event.target.result.split(',')[1]; // data:image/jpeg;base64,...の「,」以降を抜き出す

    const timestamp = new Date().toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    let labelDescription = '不明';
    let estimatedCalories = '??? kcal';

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
                  text: "この料理の名前と、一般的なカロリー量（おおよそ）を答えてください。例:「これはカレーライスです。おおよそ550kcalです。」"
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

      // 「〇〇です。おおよそXXXkcalです。」の形式から抽出
      const labelMatch = text.match(/これは(.+?)です/);
      const calorieMatch = text.match(/おおよそ(\d+)\s?kcal/);

      labelDescription = labelMatch ? labelMatch[1] : "不明";
      estimatedCalories = calorieMatch ? calorieMatch[1] + " kcal" : "不明";

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
