// ===== スプライト基本設定（3列×4行 / 1行目=正面）=====
const SPRITE_SRC = "./project-root/男_スーツ1.png"; // ここを任意のキャラPNGに差し替え可
const FRAME_W = 32, FRAME_H = 32;        // 1コマのサイズ
const COLS = 3, ROWS = 4;                 // 3×4シート
// 行マッピング（このシートは 0:正面,1:左,2:右,3:背面）
const ROW_FRONT = 0, ROW_LEFT = 1, ROW_RIGHT = 2, ROW_BACK = 3;
// 列（左/中/右）
const COL_LEFT = 0, COL_CENTER = 1, COL_RIGHT = 2;

// DOM
const cvs = document.getElementById("charCanvas");
const ctx = cvs.getContext("2d");
const speech = document.getElementById("speech");
const gaugeBar = document.getElementById("gaugeBar");
const gaugePct = document.getElementById("gaugePct");
const gaugeNote = document.getElementById("gaugeNote");

// スプライト読込
const img = new Image();
img.src = SPRITE_SRC;

// 描画ユーティリティ
function clear() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  // 影
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(cvs.width/2, cvs.height*0.82, cvs.width*0.26, cvs.height*0.06, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawFrame(row, col, scale=4) {
  const sx = col*FRAME_W, sy = row*FRAME_H;
  const dw = FRAME_W*scale, dh = FRAME_H*scale;
  const dx = (cvs.width-dw)/2, dy = (cvs.height-dh)/2 + 6; // 少し下寄せ
  ctx.drawImage(img, sx, sy, FRAME_W, FRAME_H, dx, dy, dw, dh);
}

function setFrame(row, col){ clear(); drawFrame(row, col); }

// ====== アニメーション ======
// 通常：正面の3コマで“呼吸”（上下ゆれ）
// 6–12秒に一度：横向きにして 2歩（合計1.4秒）→正面へ
let animRAF = 0;
let nowMode = "idle";
let idleTick = 0;
let sideTimer = null;

function loop() {
  idleTick++;
  if (nowMode === "idle") {
    // 正面3コマ（0.35秒周期）
    const frame = Math.floor((idleTick/21))%3; // 60fps想定
    // ふんわり上下
    const yShift = Math.sin(idleTick/18)*2;
    clear();
    // 影ゆれ
    ctx.save();
    ctx.translate(0, yShift*0.6);
    drawFrame(ROW_FRONT, [COL_LEFT,COL_CENTER,COL_RIGHT][frame]);
    ctx.restore();
  }
  animRAF = requestAnimationFrame(loop);
}

// 横向き歩行（1.4秒）
function sideWalkOnce() {
  if (nowMode !== "idle") return;
  nowMode = "side";
  const isLeft = Math.random() < 0.5;
  const row = isLeft ? ROW_LEFT : ROW_RIGHT;
  const seq = [COL_LEFT, COL_CENTER, COL_RIGHT, COL_CENTER]; // 2歩分
  let i = 0;
  const stepMs = 180; // 0.18s/コマ → 0.72s/歩 × 2歩 = 約1.44s

  const runner = () => {
    if (i >= seq.length) {
      nowMode = "idle";
      setFrame(ROW_FRONT, COL_CENTER);
      return;
    }
    setFrame(row, seq[i]);
    i++;
    sideTimer = setTimeout(runner, stepMs);
  };
  runner();
}

// “時々横を向く”ランダムタイマー（6〜12秒）
function scheduleSide() {
  const ms = (6 + Math.random()*6) * 1000;
  setTimeout(() => {
    sideWalkOnce();
    scheduleSide();
  }, ms);
}

// 起動
img.onload = () => {
  setFrame(ROW_FRONT, COL_CENTER);
  loop();
  scheduleSide();
  saySomething();
  updateGaugeFromMeals();
};

// ====== しゃべる（ヒント） ======
const lines = [
  "今日のPFCバランス、いい感じ？",
  "たんぱく質 50–120g を目安に！",
  "脂質は摂りすぎ注意、40–70g。",
  "炭水化物は 180–300g が目安だよ。",
  "総カロリーは目標±10%に収めてみよう！",
];
function saySomething(){
  speech.textContent = lines[Math.floor(Math.random()*lines.length)];
  setTimeout(saySomething, 8000);
}

// ====== ゲージ算出（今日の食事から） ======
function loadMeals() {
  try { return JSON.parse(localStorage.getItem("bisyokuka_meals_v2")||"[]"); }
  catch { return []; }
}
function groupToday(meals){
  const k = new Date().toISOString().slice(0,10);
  const sum = {kcal:0, protein:0, fat:0, carbs:0};
  for (const m of meals) {
    const d = (m.date||"").slice(0,10);
    if (d !== k) continue;
    sum.kcal   += Number(m.totals?.kcal   || 0);
    sum.protein+= Number(m.totals?.protein|| 0);
    sum.fat    += Number(m.totals?.fat    || 0);
    sum.carbs  += Number(m.totals?.carbs  || 0);
  }
  return sum;
}
// スコア化：レンジ内=100点。外れたら距離で逓減（±50%まで直線でスコア→0）
function scoreRange(v, lo, hi){
  if (v === 0) return 0;
  if (v >= lo && v <= hi) return 100;
  const center = (lo+hi)/2;
  const maxDev = (hi - lo) * 0.75; // 許容外の幅
  const dev = Math.abs(v - Math.min(Math.max(v, lo), hi));
  const r = Math.max(0, 1 - dev/(maxDev||1));
  return Math.round(r*80); // 外れは最大80点まで
}
function updateGaugeFromMeals(){
  const meals = loadMeals();
  const t = groupToday(meals);

  // 目標（P/F/C は固定、kcal は設定から / なければ 1580）
  const kcalGoal = Number(localStorage.getItem("calorieGoal")||1580);
  const sP = scoreRange(t.protein, 50, 120);
  const sF = scoreRange(t.fat,     40, 70);
  const sC = scoreRange(t.carbs,  180, 300);

  // カロリーは±10%が満点、±30%で0点
  const dev = Math.abs(t.kcal - kcalGoal) / (kcalGoal||1);
  const sK = Math.max(0, Math.round(100 * (1 - (dev-0.10)/0.20))); // 0.10→満点、0.30→0

  const pct = Math.round((sP + sF + sC + sK) / 4);
  gaugeBar.style.width = pct + "%";
  gaugePct.textContent = pct + "%";
  if (pct >= 90)      gaugeNote.textContent = "最高！今日は完璧なバランス！";
  else if (pct >= 70) gaugeNote.textContent = "とても良い！あと少し整えよう";
  else if (pct >= 40) gaugeNote.textContent = "ほどよい。もう一品でバランスUP";
  else                gaugeNote.textContent = "まずは1食記録してみよう！";

  // 吹き出しも少し反応
  if (t.kcal>0) {
    speech.textContent = `きょうの合計: ${t.kcal|0}kcal / P${t.protein|0} F${t.fat|0} C${t.carbs|0}`;
  }
}

// クエストの「チェック」押下で再評価
document.querySelectorAll("[data-quest]").forEach(b=>{
  b.addEventListener("click", updateGaugeFromMeals);
});
