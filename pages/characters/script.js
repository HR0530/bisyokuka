// ===== データ読み込み：mealの保存形式 =====
function loadMeals(){
  try { return JSON.parse(localStorage.getItem("bisyokuka_meals_v2") || "[]"); }
  catch { return []; }
}
function todayKey(){ return new Date().toISOString().slice(0,10); }
function sumToday(){
  const meals = loadMeals();
  const tkey = todayKey();
  return meals.reduce((acc,m)=>{
    if ((m.date||"").slice(0,10)!==tkey) return acc;
    acc.kcal += Number(m.totals?.kcal||0);
    acc.p    += Number(m.totals?.protein||0);
    acc.f    += Number(m.totals?.fat||0);
    acc.c    += Number(m.totals?.carbs||0);
    return acc;
  }, {kcal:0,p:0,f:0,c:0});
}

// ===== ゲージ（P/F/C 目標にどれだけ近いか）=====
const target = { kcal: 1800, p: 100, f: 60, c: 250 };
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function updateGauge(){
  const s = sumToday();
  const closenessP = 1 - Math.min(1, Math.abs(s.p - target.p) / target.p);
  const closenessF = 1 - Math.min(1, Math.abs(s.f - target.f) / target.f);
  const closenessC = 1 - Math.min(1, Math.abs(s.c - target.c) / target.c);
  const pct = Math.round((closenessP + closenessF + closenessC)/3 * 100);

  const bar = document.getElementById("gaugeBar");
  const label = document.getElementById("gaugePct");
  bar.style.width = `${pct}%`;
  label.textContent = `${pct}%`;
}

// ===== クエスト達成状態（達成なら緑＆無効化、未達成は青で分析へ）=====
function setDone(id, done){
  const li = document.getElementById(id);
  if (!li) return;
  const btn = li.querySelector('.action');
  if (done){
    li.classList.add('done');
    if (btn){ btn.textContent = '達成！'; btn.removeAttribute('href'); }
  }else{
    li.classList.remove('done');
    if (btn){ btn.textContent = '確認する'; btn.setAttribute('href','../insights/index.html'); }
  }
}
function updateQuests(){
  const s = sumToday();
  setDone('q1', s.p >= 50 && s.p <= 120);
  setDone('q2', s.f >= 40 && s.f <= 70);
  setDone('q3', s.c >= 180 && s.c <= 300);
  setDone('q4', Math.abs(s.kcal - 1800) <= 180);

  // イベント側は例（必要があれば置き換え）
  setDone('e1', false);
  setDone('e2', s.p >= 80);
  setDone('e3', false);
  setDone('e4', false);
}

// ===== キャラ：正面→横向きへ時々切替（数秒間）=====
function initHeroMotion(){
  const stage = document.querySelector('.hero-stage');
  const front = document.getElementById('heroFront');
  const side  = document.getElementById('heroSide');
  const bubble= document.getElementById('bubbleText');

  // 横向き画像が読み込めない場合は“横向き演出”をスキップ
  let sideUsable = true;
  side.addEventListener('error', ()=> sideUsable = false, {once:true});

  const lines = [
    "いい感じのペース！",
    "水分補給も忘れずに。",
    "バランスが大事だよ。",
    "今日の目標、いけそう！",
  ];

  function randomSpeak(){
    bubble.textContent = lines[Math.floor(Math.random()*lines.length)];
  }

  function goSideWalk(){
    if (!sideUsable) return;                 // 横向き無しなら何もしない
    stage.classList.add('hero-moving');
    randomSpeak();
    // 3〜4秒ほど横向きウォーク
    setTimeout(()=> stage.classList.remove('hero-moving'), 3400);
  }

  // 最初は正面、9〜14秒ごとに横向きウォーク
  setInterval(()=> goSideWalk(), 9000 + Math.random()*5000);
}

// ===== 初期化 =====
function init(){
  updateGauge();
  updateQuests();
  initHeroMotion();
}
document.addEventListener('DOMContentLoaded', init);
