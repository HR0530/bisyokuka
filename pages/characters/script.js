// ------------- データ取得（meal の保存形式） ----------------
const STORAGE_KEY = "bisyokuka_meals_v2";
const meals = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
})();
const todayKey = new Date().toISOString().slice(0,10);

function totalsOf(dateKey){
  const t = { kcal:0, protein:0, fat:0, carbs:0, count:0 };
  for (const m of meals){
    const d = (m.date||"").slice(0,10);
    if (d !== dateKey) continue;
    t.kcal   += Number(m.totals?.kcal   || 0);
    t.protein+= Number(m.totals?.protein|| 0);
    t.fat    += Number(m.totals?.fat    || 0);
    t.carbs  += Number(m.totals?.carbs  || 0);
    t.count++;
  }
  return t;
}
const T = totalsOf(todayKey);

// ------------- 育成ゲージ（同じ計算式を踏襲） ----------------
// 目安レンジ
const R = {
  P:[50,120],
  F:[40,70],
  C:[180,300],
  K:[1400, 2000] // kcal ざっくり
};
function scoreInRange(val, [lo,hi]){
  if (val<=0) return 0;
  if (val>=lo && val<=hi) return 1;
  const d = val<lo ? (lo-val)/lo : (val-hi)/hi;
  // 乖離100%で0点に落ちるよう緩やかに
  const s = Math.max(0, 1 - d);
  return s;
}
// 1食でも記録があればベース25%、PFC+Kの平均で最大+75%
const base = T.count>0 ? 25 : 0;
const macro = (
  scoreInRange(T.protein, R.P) +
  scoreInRange(T.fat,     R.F) +
  scoreInRange(T.carbs,   R.C) +
  scoreInRange(T.kcal,    R.K)
) / 4;
const gaugePct = Math.round(base + macro * 75);

// UI反映
const bar = document.getElementById("gaugeBar");
const pct = document.getElementById("gaugePct");
const hint = document.getElementById("gaugeHint");
bar.style.width = `${gaugePct}%`;
pct.textContent = `${gaugePct}%`;
hint.textContent = T.count>0
  ? `今日の合計：${Math.round(T.kcal)} kcal / P${Math.round(T.protein)}g F${Math.round(T.fat)}g C${Math.round(T.carbs)}g`
  : "まずは1食記録してみよう！";

// ------------- ヒーローのアニメ（正面基準＋時々横向き） -------------
const hero = document.getElementById("hero");
const spritePath = hero.dataset.sprite || "project-root/男_スーツ1.png";
hero.style.backgroundImage = `url("${spritePath}")`;

// シートは 3×4（列×行）想定：行0=下/正面, 行1=左, 行2=右, 行3=後ろ
// 通常は正面で歩行アニメ。時々、横向きに切り替えて1～2秒歩く
let facingRow = 0;          // 0:正面
let sideTimer = null;

function setRow(row){
  facingRow = row;
  hero.style.backgroundPositionY = `calc(var(--frame-h) * ${row})`;
}
setRow(0);

function sometimesTurnSide(){
  const nextIn = 3000 + Math.random()*5000; // 3～8秒後に横向き
  setTimeout(() => {
    const sideRow = Math.random() < 0.5 ? 1 : 2; // 左か右
    setRow(sideRow);
    // 1.2～2.2秒は横を向いて歩き続ける
    const keep = 1200 + Math.random()*1000;
    sideTimer = setTimeout(()=> setRow(0), keep);
    // 次の予約
    sometimesTurnSide();
  }, nextIn);
}
sometimesTurnSide();

// ------------- クエスト/イベント（4行表示・状態に応じたボタン） -------------
const goInsights = () => location.href = "../insights/index.html";

function makeTask(title, ok, meta=""){
  const li = document.createElement("li");
  li.className = "task" + (ok ? " done" : "");

  const left = document.createElement("div");
  const h = document.createElement("p");
  h.className = "task-title"; h.textContent = title;
  left.appendChild(h);
  if (meta) {
    const m = document.createElement("div");
    m.className = "meta"; m.textContent = meta;
    left.appendChild(m);
  }

  const btn = document.createElement("button");
  btn.className = "action " + (ok ? "" : "view");
  btn.textContent = ok ? "達成！" : "確認する";
  btn.addEventListener("click", goInsights);

  li.appendChild(left);
  li.appendChild(btn);
  return li;
}

// 判定
const okP = T.protein>=R.P[0] && T.protein<=R.P[1];
const okF = T.fat    >=R.F[0] && T.fat    <=R.F[1];
const okC = T.carbs  >=R.C[0] && T.carbs  <=R.C[1];
const okK = T.kcal   >=R.K[0] && T.kcal   <=R.K[1];

const quests = document.getElementById("quests");
quests.append(
  makeTask("たんぱく質 50–120g を目指す", okP, `現在 ${Math.round(T.protein)} g`),
  makeTask("脂質 40–70g に収める",         okF, `現在 ${Math.round(T.fat)} g`),
  makeTask("炭水化物 180–300g をキープ",   okC, `現在 ${Math.round(T.carbs)} g`),
  makeTask("総カロリー 目標±10％以内",     okK, `現在 ${Math.round(T.kcal)} kcal`)
);

const events = document.getElementById("events");
// イベント例（自由に差し替え可）
const uniqueNames = new Set();
for (const m of meals.filter(x=> (x.date||"").slice(0,10)===todayKey)){
  (m.ingredients||[]).forEach(i => uniqueNames.add(i.name));
}
events.append(
  makeTask("新食材に挑戦（未登録の食材を1つ）", uniqueNames.size>=1),
  makeTask("野菜を5品追加してみよう",         uniqueNames.size>=5),
  makeTask("タンパク質200g以上の食材を食べる", T.protein>=100), // 例
  makeTask("夜21時以降は間食なしで過ごす",     false)          // 記録からの厳密判定は未実装
);

// ------------- しゃべる内容（簡単リアクション） -------------
const bubble = document.getElementById("heroBubble");
const msgs = [
  "今日のPFC、いいリズム！",
  "水分補給も忘れずにね💧",
  "野菜は色とりどりがコツ🥦",
  "たんぱく質は毎食ちょっとずつ🐔"
];
if (okP && okF && okC) bubble.textContent = "理想のバランス！レベル上がりそう🔥";
else if (T.count===0)  bubble.textContent = "まずは写真を1枚アップだよ📷";
else                   bubble.textContent = msgs[Math.floor(Math.random()*msgs.length)];
