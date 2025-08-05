const GEMINI_API_KEY = "AIzaSyCHQJi6aSoTauy9f5y_aI61IpeB_K5GIQI";

document.getElementById("photoInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("statusMessage").textContent = "AIが画像を認識中です...";

  const resultText = await getGeminiVisionResult(file);

  if (resultText) {
    document.getElementById("statusMessage").textContent = "料理名候補を取得しました。";
    document.getElementById("result").innerHTML = `
      <div>AI判定: <strong>${resultText}</strong></div>
      <div style="margin-top:0.5em;">
        <label>修正/確定:</label>
        <input type="text" id="foodName" value="${resultText}">
        <button onclick="alert('登録：' + document.getElementById('foodName').value)">記録</button>
      </div>
    `;
  } else {
    document.getElementById("statusMessage").textContent = "AIによる料理名の推定に失敗しました。";
    document.getElementById("result").innerHTML = `
      <div>手入力してください：</div>
      <input type="text" id="foodName" placeholder="料理名">
      <button onclick="alert('登録：' + document.getElementById('foodName').value)">記録</button>
    `;
  }
});

// Gemini Vision APIで画像認識→料理名テキスト取得
async function getGeminiVisionResult(file) {
  const base64 = await fileToBase64(file);
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=" + GEMINI_API_KEY;

  // プロンプトは日本語推奨
  const prompt = "この画像に写っている料理の名前を日本語で一言で答えてください。";

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: file.type,
              data: base64.split(",")[1]
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log("Gemini Visionレスポンス:", data);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch (e) {
    console.error("Gemini Vision API Error:", e);
    return "";
  }
}

// ファイル→base64
function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
