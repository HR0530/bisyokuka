const OPENAI_API_KEY = "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";

// カロリー表（例）
const calorieTable = {
  "ラーメン": 550,
  "カレー": 700,
  "ハンバーグ": 480,
  "サラダ": 90,
  "牛丼": 800,
  "うどん": 400,
  // 追加OK
};

document.getElementById("photoInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("statusMessage").textContent = "AIが画像を認識中...";

  const aiFoodName = await getGptVisionLabel(file);

  if (aiFoodName) {
    document.getElementById("statusMessage").textContent = "AIの判定結果：";
    document.getElementById("result").innerHTML = `
      <strong>${aiFoodName}</strong><br>
      <input type="text" id="foodNameInput" value="${aiFoodName}" placeholder="料理名を修正できます">
      <button id="registerBtn">記録</button>
    `;
    document.getElementById("registerBtn").onclick = () => {
      const name = document.getElementById("foodNameInput").value;
      registerMeal(name);
    };
  } else {
    document.getElementById("statusMessage").textContent = "AIが料理名を特定できませんでした。手入力してください。";
    document.getElementById("result").innerHTML = `
      <input type="text" id="foodNameInput" placeholder="料理名を入力">
      <button id="registerBtn">記録</button>
    `;
    document.getElementById("registerBtn").onclick = () => {
      const name = document.getElementById("foodNameInput").value;
      registerMeal(name);
    };
  }
});

async function getGptVisionLabel(file) {
  const base64 = await fileToBase64(file);
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4o", // または "gpt-4-vision-preview"
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "この画像の料理名を日本語で短く1つだけ答えてください。" },
          { type: "image_url", image_url: { "url": base64 } }
        ]
      }
    ],
    max_tokens: 100
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log("OpenAI Vision レスポンス:", data);
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("OpenAI Vision API Error:", e);
    return "";
  }
}

// ファイル→base64変換（DataURL）
function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// 記録保存（localStorage例）
function registerMeal(foodName) {
  if (!foodName) {
    alert("料理名を入力してください");
    return;
  }
  const kcal = calorieTable[foodName] || prompt(`${foodName}のカロリーを入力してください`);
  if (!kcal) return;
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  meals.unshift({ foodName, kcal, date: new Date().toLocaleString() });
  localStorage.setItem("meals", JSON.stringify(meals));
  showMeals();
  document.getElementById("statusMessage").textContent = "記録しました！";
  document.getElementById("result").innerHTML = "";
}

function showMeals() {
  let meals = JSON.parse(localStorage.getItem("meals") || "[]");
  document.getElementById("mealGrid").innerHTML =
    meals.map(m => `<div>${m.date}：${m.foodName}（${m.kcal}kcal）</div>`).join("");
}
showMeals();
