const OPENAI_API_KEY = "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";

// カロリー表（例、追加OK）
const calorieTable = {
  "ラーメン": 550,
  "カレー": 700,
  "ハンバーグ": 480,
  "サラダ": 90,
  "牛丼": 800,
  "うどん": 400,
  // 他の料理も自由に追加可
};

document.getElementById("photoInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("statusMessage").textContent = "AIが画像を認識中...";

  const aiFoodName = await getGptVisionLabel(file);

  if (aiFoodName) {
    document.getElementById("statusMessage").textContent = "AIの判定結果：";
    const kcal = calorieTable[aiFoodName] || "";
    document.getElementById("result").innerHTML = `
      <strong>料理名：${aiFoodName}</strong><br>
      <strong>カロリー：${kcal ? kcal + "kcal" : "未登録"}</strong><br>
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
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "この画像に写っている料理名を日本語で1単語で短く答えてください（例：ラーメン、カレー、牛丼、ハンバーグ、寿司など）。" },
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
    // 料理名を1行テキストとして返す
    // 複数行/説明が返ってきた場合、最初の1単語のみ抜き出しても良い
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return "";
    }
    // 例：「ラーメン」や「ラーメン\nこれは...」の場合1行目だけ使う
    return data.choices[0].message.content.trim().split(/\s|。|、|\n/)[0];
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
