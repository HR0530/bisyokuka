// ---- meal 読み ----
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

// ---- ゲージ ----
const target = { kcal: 1800, p: 100, f: 60, c: 250 };
function updateGauge(){
  const s = sumToday();
  const closenessP = 1 - Math.min(1, Math.abs(s.p - target.p) / target.p);
  const closenessF = 1 - Math.min(1, Math.abs(s.f - target.f) / target.f);
  const closenessC = 1 - Math.min(1, Math.abs(s.c - target.c) / target.c);
  const pct = Math.round((closenessP + closenessF + closenessC)/3 * 100);

  document.getElementById("gaugeBar").style.width = `${pct}%`;
  document.getElementById("gaugePct").textContent = `${pct}%`;
}

// ---- クエスト達成表示 ----
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

  setDone('e1', false);
  setDone('e2', s.p >= 80);
  setDone('e3', false);
  setDone('e4', false);
}

// ---- キャラ切替（正面が基本・時々横向きで3.4秒歩く）----
function initHero(){
  const stage = document.getElementById('heroStage');
  const bubble= document.getElementById('bubbleText');

  const lines = [
    "いい感じのペース！",
    "水分補給も忘れずに。",
    "バランスが大事だよ。",
    "今日の目標、いけそう！",
  ];
  function speak(){ bubble.textContent = lines[Math.floor(Math.random()*lines.length)]; }

  function sideWalk(){
    stage.classList.add('hero-moving');
    speak();
    setTimeout(()=> stage.classList.remove('hero-moving'), 3400);
  }

  // 9〜14秒ごとに横向き演出
  setInterval(()=> sideWalk(), 9000 + Math.random()*5000);
}

// ---- init ----
document.addEventListener('DOMContentLoaded', ()=>{
  updateGauge();
  updateQuests();
  initHero();
});
