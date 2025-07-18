// 栄養データ（100gあたり） ※必要に応じて追加・編集可能
const foodData = {
  "牛もも肉":     { cal: 183, protein: 20.7, fat: 10.6, carb: 0.3 },
 "にんじん":     { cal: 37, protein: 0.6, fat: 0.1, carb: 8.7 },
  "たまご":       { cal: 155, protein: 13,  fat: 11,  carb: 1.1 },
  "鶏むね肉":     { cal: 165, protein: 31,  fat: 3.6, carb: 0 },
  "豚肉（ロース）": { cal: 263, protein: 20,  fat: 20,  carb: 0 },
  "牛肉（肩ロース）": { cal: 250, protein: 17,  fat: 20,  carb: 0 },
  "ごはん":       { cal: 168, protein: 2.5, fat: 0.3, carb: 37 },
  "じゃがいも":   { cal: 76,  protein: 2,   fat: 0.1, carb: 17 },
  "玉ねぎ":       { cal: 40,  protein: 1.3, fat: 0.1, carb: 9.3 },
  "ほうれん草":   { cal: 23,  protein: 2.9, fat: 0.4, carb: 3.6 },
  "キャベツ":     { cal: 23,  protein: 1.3, fat: 0.2, carb: 5.2 },
  "トマト":       { cal: 18,  protein: 0.9, fat: 0.2, carb: 3.9 },
  "きゅうり":     { cal: 15,  protein: 0.6, fat: 0.1, carb: 3.6 },
  "なす":         { cal: 25,  protein: 1,   fat: 0.2, carb: 5.9 },
  "ピーマン":     { cal: 20,  protein: 0.9, fat: 0.1, carb: 4.7 },
  "白菜":         { cal: 13,  protein: 1.2, fat: 0.2, carb: 2.2 },
  "ブロッコリー": { cal: 34,  protein: 3.3, fat: 0.4, carb: 7 },
  "れんこん":     { cal: 66,  protein: 1.5, fat: 0.1, carb: 17 },
  "さつまいも":   { cal: 132, protein: 1.5, fat: 0.1, carb: 31 },
  "大根":         { cal: 18,  protein: 0.6, fat: 0.1, carb: 4.1 },
  "山芋":         { cal: 65,  protein: 1.5, fat: 0.2, carb: 15 },
  "さけ":         { cal: 208, protein: 20,  fat: 13,  carb: 0 },
  "たら":         { cal: 82,  protein: 18,  fat: 0.7, carb: 0 },
  "いか":         { cal: 92,  protein: 16,  fat: 1.4, carb: 3.1 },
  "えび":         { cal: 99,  protein: 24,  fat: 0.3, carb: 0 },
  "豆腐":         { cal: 72,  protein: 7,   fat: 4.3, carb: 1.9 },
  "納豆":         { cal: 200, protein: 17,  fat: 11,  carb: 14 },
  "牛乳":         { cal: 67,  protein: 3.3, fat: 3.8, carb: 5 },
  "ヨーグルト":   { cal: 61,  protein: 3.5, fat: 3.3, carb: 4.7 },
  "バター":       { cal: 717, protein: 0.9, fat: 81,  carb: 0.1 },
  "砂糖":         { cal: 387, protein: 0,   fat: 0,   carb: 100 },
  "小麦粉":       { cal: 364, protein: 10,  fat: 1,   carb: 76 },
  "コーン":       { cal: 86,  protein: 3.2, fat: 1.2, carb: 19 },
  "りんご":       { cal: 57,  protein: 0.3, fat: 0.2, carb: 14 },
  "バナナ":       { cal: 86,  protein: 1.1, fat: 0.2, carb: 23 },
  "みかん":       { cal: 38,  protein: 0.8, fat: 0.1, carb: 10 },
  "ぶどう":       { cal: 69,  protein: 0.6, fat: 0.4, carb: 18 },
  "いちご":       { cal: 33,  protein: 0.7, fat: 0.3, carb: 8 },
  "もも":         { cal: 39,  protein: 0.9, fat: 0.3, carb: 9.5 },
  "かぼちゃ":     { cal: 49,  protein: 1.1, fat: 0.2, carb: 12 },
  "アスパラガス": { cal: 20,  protein: 2.2, fat: 0.1, carb: 3.9 },
  "枝豆":         { cal: 147, protein: 12,  fat: 5,   carb: 9.9 },
  "さば":         { cal: 205, protein: 20,  fat: 13,  carb: 0 },
  "まぐろ":       { cal: 144, protein: 23,  fat: 5,   carb: 0 },
  "しらす干し":   { cal: 210, protein: 30,  fat: 4,   carb: 0 },
  "こんにゃく":   { cal: 6,   protein: 0,   fat: 0,   carb: 0 },
  "しめじ":       { cal: 18,  protein: 2.2, fat: 0.2, carb: 3.3 },
  "えのき":       { cal: 22,  protein: 2.7, fat: 0.2, carb: 5.2 },
  "まいたけ":     { cal: 15,  protein: 1.9, fat: 0.2, carb: 3.2 },
  "なめこ":       { cal: 16,  protein: 1.3, fat: 0.1, carb: 3.8 },
  "とうもろこし": { cal: 86,  protein: 3.2, fat: 1.2, carb: 19 },
  "オリーブオイル": { cal: 884, protein: 0,   fat: 100, carb: 0 },
  "サラダ油":     { cal: 884, protein: 0,   fat: 100, carb: 0 },
  "しょうゆ":     { cal: 53,  protein: 5,   fat: 0,   carb: 4 },
  "みそ":         { cal: 199, protein: 12,  fat: 6,   carb: 16 },
  "酒":           { cal: 97,  protein: 0,   fat: 0,   carb: 3 },
  "みりん":       { cal: 241, protein: 0,   fat: 0,   carb: 34 },
  "コショウ":     { cal: 251, protein: 10,  fat: 3,   carb: 64 },
  "にんにく":     { cal: 149, protein: 6.4, fat: 0.5, carb: 33 },
  "しょうが":     { cal: 80,  protein: 1.8, fat: 0.8, carb: 18 },
  "さとうきび":   { cal: 383, protein: 0,   fat: 0,   carb: 97 },
  "レタス":       { cal: 15,  protein: 1.4, fat: 0.2, carb: 2.9 },
  "ズッキーニ":   { cal: 17,  protein: 1.2, fat: 0.3, carb: 3.1 },
  "オクラ":       { cal: 33,  protein: 2,   fat: 0.1, carb: 7 },
  "さやえんどう": { cal: 43,  protein: 3.4, fat: 0.2, carb: 7.5 },
  "パセリ":       { cal: 36,  protein: 3,   fat: 0.8, carb: 6.3 },
  "セロリ":       { cal: 16,  protein: 0.7, fat: 0.2, carb: 3 },
  "カリフラワー": { cal: 25,  protein: 2,   fat: 0.1, carb: 5 },
  "もやし":       { cal: 14,  protein: 1.2, fat: 0.1, carb: 2.7 },
  "なっぱ（青菜）": { cal: 19,  protein: 2.2, fat: 0.1, carb: 3.5 },
  "バジル":       { cal: 23,  protein: 3.2, fat: 0.6, carb: 2.7 },
  "ひじき":       { cal: 45,  protein: 4.9, fat: 0.2, carb: 9.6 },
  "わかめ":       { cal: 16,  protein: 1.7, fat: 0.2, carb: 3.3 },
  "のり":         { cal: 35,  protein: 5.8, fat: 0.3, carb: 44 },
  "昆布":         { cal: 43,  protein: 1.7, fat: 0.2, carb: 9.6 },
  "さつま揚げ":   { cal: 130, protein: 7,   fat: 8,   carb: 6 },
  "はんぺん":     { cal: 110, protein: 8,   fat: 1,   carb: 14 },
  "餅":           { cal: 200, protein: 4.5, fat: 0.4, carb: 44 },
  "パン粉":       { cal: 350, protein: 13,  fat: 2,   carb: 65 },
  "きなこ":       { cal: 460, protein: 35,  fat: 20,  carb: 30 },
  "アーモンド":   { cal: 579, protein: 21,  fat: 50,  carb: 22 },
  "くるみ":       { cal: 654, protein: 15,  fat: 65,  carb: 14 },
  "ピーナッツ":   { cal: 567, protein: 26,  fat: 49,  carb: 16 }
};

// オートコンプリート候補生成
const datalist = document.getElementById("food-options");
Object.keys(foodData).forEach(food => {
  const option = document.createElement("option");
  option.value = food;
  datalist.appendChild(option);
});

let total = { cal: 0, protein: 0, fat: 0, carb: 0 };

// 登録済み食材の追加処理
document.getElementById("food-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("food-name").value.trim();
  const weight = parseFloat(document.getElementById("food-weight").value);

  if (!foodData[name]) {
    alert("その食材はデータベースにありません。");
    return;
  }
  if (isNaN(weight) || weight <= 0) {
    alert("使用量（g）は正の数で入力してください。");
    return;
  }

  const factor = weight / 100;
  const food = foodData[name];

  const item = {
    name,
    weight,
    cal: food.cal * factor,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carb: food.carb * factor
  };

  total.cal += item.cal;
  total.protein += item.protein;
  total.fat += item.fat;
  total.carb += item.carb;

  const li = document.createElement("li");
  li.textContent = `${item.name}：${item.weight}g`;
  li.title = "クリックで削除";
  li.style.cursor = "pointer";

  li.addEventListener("click", () => {
    total.cal -= item.cal;
    total.protein -= item.protein;
    total.fat -= item.fat;
    total.carb -= item.carb;
    li.remove();
    updateSummary();
  });

  document.getElementById("food-list").appendChild(li);

  updateSummary();

  this.reset();
  document.getElementById("food-weight").value = 100; // デフォルト値に戻す
});

// 栄養合計を表示
function updateSummary() {
  const p = document.getElementById("summary");
  p.textContent =
    `カロリー: ${total.cal.toFixed(1)} kcal｜` +
    `たんぱく質: ${total.protein.toFixed(1)} g｜` +
    `脂質: ${total.fat.toFixed(1)} g｜` +
    `炭水化物: ${total.carb.toFixed(1)} g`;
}

// 重量調整ボタンの処理
document.querySelectorAll(".adjust").forEach(button => {
  button.addEventListener("click", () => {
    const diff = parseInt(button.dataset.diff);
    const input = document.getElementById("food-weight");
    let value = parseInt(input.value) || 0;
    value = Math.max(1, value + diff); // 1g以下にはしない
    input.value = value;
  });
});

