// ===== キャラ定義（project-root に置いたスプライトを列挙）=====
// 追加したい時はこの配列に push（最大32体）だけでOK
const CHARACTERS = [
  { id:"m_suit1",  name:"スーツ男子A",  sprite:"project-root/男_スーツ1.png",  unlockKey:"u00" },
  { id:"f_suit1",  name:"スーツ女子A",  sprite:"project-root/女_スーツ1.png",  unlockKey:"u01" },
  { id:"f_suit2",  name:"スーツ女子B",  sprite:"project-root/女_スーツ2.png",  unlockKey:"u02" },
  { id:"f_lab",    name:"研究員",        sprite:"project-root/女_スーツ白衣.png", unlockKey:"u03" },
  { id:"f_std1",   name:"学生A",         sprite:"project-root/女_学生1.png",     unlockKey:"u04" },
  { id:"f_std2",   name:"学生B",         sprite:"project-root/女_学生2.png",     unlockKey:"u05" },
  { id:"f_std3",   name:"学生C",         sprite:"project-root/女_学生3.png",     unlockKey:"u06" },
  { id:"f_horror", name:"ミステリアス",  sprite:"project-root/女_学生ホラー.png", unlockKey:"u07" },
  { id:"f_swim1",  name:"スイマーA",     sprite:"project-root/女_水着1.png",     unlockKey:"u08" },
  { id:"f_swim2",  name:"スイマーB",     sprite:"project-root/女_水着2.png",     unlockKey:"u09" },
  { id:"f_swim3",  name:"スイマーC",     sprite:"project-root/女_水着3.png",     unlockKey:"u10" },
];

// ===== 進捗の保存 =====
const LS = {
  UNLOCKS: "bisyokuka_unlocks_v1",     // {u00:true, ...}
  ACTIVE:  "bisyokuka_active_char_v1", // "m_suit1"
};
const getUnlocks = () => JSON.parse(localStorage.getItem(LS.UNLOCKS) || "{}");
const setUnlock = (key, v=true) => localStorage.setItem(LS.UNLOCKS, JSON.stringify({ ...getUnlocks(), [key]:v }));
const getActiveId = () => localStorage.getItem(LS.ACTIVE) || CHARACTERS[0].id;
const setActiveId = (id) => localStorage.setItem(LS.ACTIVE, id);

// ===== meal から当日の栄養を集計（ゲージ＆クエスト計算に使用）=====
function sumToday(){
  const items = JSON.parse(localStorage.getItem("bisyokuka_meals_v2") || "[]");
  const today = new Date().toISOString().slice(0,10);
  const sums = { kcal:0, p:0, f:0, c:0 };
  for(const m of items){
    if ((m.date||"").slice(0,10) !== today) continue;
    sums.kcal += Number(m.totals?.kcal||0);
    sums.p    += Number(m.totals?.protein||0);
    sums.f    += Number(m.totals?.fat||0);
    sums.c    += Number(m.totals?.carbs||0);
  }
  return sums;
}
const calorieGoal = Number(localStorage.getItem("calorieGoal")||1580);

// ===== UI要素 =====
const spriteEl = document.getElementById("sprite");
const bubbleEl = document.getElementById("bubble");
const charListEl = document.getElementById("charList");
const barBalanceEl = document.getElementById("barBalance");
const barCalEl = document.getElementById("barCal");
const titleBadgeEl = document.getElementById("titleBadge");

// セリフ
const LINES = [
  "今日もバランスよく食べよう！",
  "たんぱく質、足りてる？",
  "水分補給を忘れずに。",
  "ゆっくり味わうと満足度UP！",
  "野菜はカラフルにね。"
];

// ===== キャラ描画 =====
function updateSprite(){
  const id = getActiveId();
  const ch = CHARACTERS.find(c => c.id===id) || CHARACTERS[0];
  spriteEl.style.backgroundImage = `url("${ch.sprite}")`;
  spriteEl.style.backgroundSize  = `288px 512px`; // 96*3 x 128*4（縦方向はそのまま）
  // デフォルトは前向き（最下段）にしておく
  spriteEl.style.backgroundPositionY = `-${128*3}px`;
}
function sayRandom(){
  bubbleEl.textContent = LINES[Math.floor(Math.random()*LINES.length)];
}

// ===== 左：キャラ一覧 =====
function renderCharList(){
  const unlocks = getUnlocks();
  const active = getActiveId();
  charListEl.innerHTML = "";
  CHARACTERS.forEach(ch => {
    const div = document.createElement("div");
    const locked = !unlocks[ch.unlockKey];
    div.className = "char-item" + (locked ? " locked" : "") + (active===ch.id ? " current" : "");
    div.innerHTML = `
      <img src="${ch.sprite}" alt="${ch.name}">
      <div class="name">${ch.name}</div>
      <div class="tag">${locked ? "未解放" : "解放済"}</div>
    `;
    if (!locked){
      div.addEventListener("click", ()=>{ setActiveId(ch.id); updateSprite(); renderCharList(); });
    }
    charListEl.appendChild(div);
  });
}

// ===== 右：クエスト/チャレンジ =====
function pct(v, max){ return Math.max(0, Math.min(100, Math.round((v/max)*100))); }

function computeQuests(){
  const t = sumToday();
  // PFCバランス指数（ざっくり）：P=25%, F=25%, C=50% を理想
  const totalG = t.p + t.f + t.c || 1;
  const pR = t.p/totalG, fR = t.f/totalG, cR = t.c/totalG;
  const score = Math.round(100 - (Math.abs(pR-0.25)+Math.abs(fR-0.25)+Math.abs(cR-0.50))*100);
  return {
    t,
    balanceScore: Math.max(0, score),
    calPct: pct(t.kcal, calorieGoal||1600)
  };
}

function renderQuests(){
  const qRoot = document.getElementById("questList");
  const dRoot = document.getElementById("dailyList");
  qRoot.innerHTML = dRoot.innerHTML = "";

  const {t, balanceScore, calPct} = computeQuests();

  // クエスト（固定3つ）
  const quests = [
    { title:"バランス達人", desc:"P:25% / F:25% / C:50% を目指そう", value:balanceScore, unit:"%", goal:100 },
    { title:"カロリー調整", desc:`目標 ${calorieGoal}kcal に近づけよう`, value:calPct, unit:"%", goal:100 },
    { title:"たんぱく質チャージ", desc:"今日のP 80g 以上", value:pct(t.p, 80), unit:"%", goal:100 },
  ];
  quests.forEach(q => qRoot.appendChild(makeCard(q)));

  // デイリー（チップ表示）
  const daily = [
    { title:"野菜を摂ろう", desc:"炭水化物 200g 以下", value:pct(Math.max(0,200 - t.c),200), unit:"%", goal:100 },
    { title:"脂質を控えめに", desc:"脂質 60g 以下", value:pct(Math.max(0,60 - t.f),60), unit:"%", goal:100 },
  ];
  daily.forEach(q => dRoot.appendChild(makeCard(q)));
}

function makeCard(q){
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.innerHTML = `
    <div class="top">
      <div class="title">${q.title}</div>
      <div class="small">${q.desc}</div>
    </div>
    <div class="rail"><div class="fill" style="width:${Math.min(100,q.value)}%"></div></div>
    <div class="small">進捗: ${Math.min(100,q.value)}${q.unit}</div>
  `;
  return wrap;
}

// ===== 称号・ゲージ =====
function updateHUD(){
  const {t, balanceScore, calPct} = computeQuests();

  // ゲージ
  barBalanceEl.style.width = `${balanceScore}%`;
  barCalEl.style.width = `${Math.min(100, calPct)}%`;
  barCalEl.classList.toggle("ok", t.kcal <= calorieGoal*1.05);

  // 称号（ざっくり）
  let title = "見習いフーディー";
  if (balanceScore>=70 && t.kcal>0) title = "バランサー";
  if (balanceScore>=85 && t.kcal>0) title = "栄養賢者";
  if (balanceScore>=95 && t.kcal>0) title = "究極の美食家";
  titleBadgeEl.textContent = title;

  // 解放ロジック例：P80g達成で1体解放、バランス90で更に1体…（自由に増やせる）
  const unlocks = getUnlocks();
  if (t.p >= 80) setUnlock("u01", true);
  if (balanceScore >= 90) setUnlock("u02", true);
  if (t.kcal >= calorieGoal*0.9 && t.kcal <= calorieGoal*1.1) setUnlock("u03", true);
  renderCharList();
}

// ===== イベント =====
document.getElementById("talkBtn").addEventListener("click", sayRandom);
document.getElementById("prevBtn").addEventListener("click", ()=> {
  const idx = CHARACTERS.findIndex(c=>c.id===getActiveId());
  const prev = (idx-1+CHARACTERS.length)%CHARACTERS.length;
  setActiveId(CHARACTERS[prev].id); updateSprite(); renderCharList();
});
document.getElementById("nextBtn").addEventListener("click", ()=> {
  const idx = CHARACTERS.findIndex(c=>c.id===getActiveId());
  const next = (idx+1)%CHARACTERS.length;
  setActiveId(CHARACTERS[next].id); updateSprite(); renderCharList();
});

// ===== 初期化 =====
(function init(){
  // 初期1体は解放しておく
  const un = getUnlocks();
  if (!un.u00){ setUnlock("u00", true); }
  renderCharList();
  updateSprite();
  updateHUD();
  sayRandom();

  // 10秒ごとにHUD更新（mealの追加に追随）
  setInterval(updateHUD, 10000);
})();
