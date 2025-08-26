/* =========================
   参照・定数
========================= */
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");
const levelText = document.getElementById("levelText");
const titleBadge = document.getElementById("titleBadge");
const logEl = document.getElementById("activityLog");
const hpText = document.getElementById("hpText");
const satiText = document.getElementById("satisfactionText");

const character = document.getElementById("character");
const toggleBtn = document.getElementById("toggleRun");
const quickClear = document.getElementById("quickClear");

/* ナビ先（必要に応じて修正） */
const HOME_PATH = "../index_pc.html";
const DEX_PATH  = "pages/dex/index.html";

/* ヘッダー & FAB の遷移 */
["btnHome","fabHome"].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.onclick = ()=> window.location.href = HOME_PATH;
});
["btnDex","fabDex"].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.onclick = ()=> window.location.href = DEX_PATH;
});
window.addEventListener("keydown", (e)=>{
  const k = e.key.toLowerCase();
  if (k === "h") window.location.href = HOME_PATH;
  if (k === "d") window.location.href = DEX_PATH;
});

/* =========================
   XP / レベル / 称号
========================= */
const titles = [
  { minLv: 1, name: "見習いフーディー" },
  { minLv: 3, name: "美食研究家" },
  { minLv: 5, name: "美食家" },
  { minLv: 7, name: "食の達人" },
  { minLv:10, name: "グランド・グルメ" },
];

let state = {
  level: 1,
  xp: 0,
  streak: 0, // 目標達成の連続日数（簡易）
  hp: 100,
  satisfaction: 50,
};

function xpNeeded(lv){ return 100 + (lv - 1) * 50; }

function setXP(diff, reason=""){
  state.xp += diff;
  if(reason) addLog(`+${diff} XP：${reason}`);

  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    addLog(`🎉 レベルアップ！ → Lv.${state.level}`);
    state.hp = Math.min(120, state.hp + 5);
    state.satisfaction = Math.min(100, state.satisfaction + 3);
  }
  refreshHeader();
}

function refreshHeader(){
  const need = xpNeeded(state.level);
  const pct = Math.min(100, Math.round((state.xp / need) * 100));
  xpFill.style.width = `${pct}%`;
  xpText.textContent = `${state.xp} / ${need} XP`;
  levelText.textContent = `Lv.${state.level}`;
  hpText.textContent = state.hp;
  satiText.textContent = state.satisfaction;

  // 称号更新
  let current = titles[0].name;
  for(const t of titles){ if(state.level >= t.minLv) current = t.name; }
  titleBadge.textContent = current;
}

/* =========================
   クエスト
========================= */
const QUESTS = [
  {
    id:"log-photo",
    name:"食事を写真つきで記録する",
    desc:"本日中に1件投稿（料理全体が見える写真）",
    xp:30
  },
  {
    id:"hit-target",
    name:"カロリー目標を達成",
    desc:"今日の摂取カロリーを±5%以内に収める",
    xp:40,
    bonus:"連続達成で +10/日（最大+30）"
  },
  {
    id:"try-new",
    name:"未知の食材を試す",
    desc:"普段使わない食材で簡単レシピを作る",
    xp:25
  },
  {
    id:"research",
    name:"食の小ネタを1つ調べて投稿",
    desc:"例：発酵の仕組み、オレイン酸の効果など",
    xp:20
  },
];

function renderQuests(){
  const wrap = document.getElementById("questList");
  wrap.innerHTML = "";
  QUESTS.forEach(q=>{
    const el = document.createElement("div");
    el.className = "quest";
    el.innerHTML = `
      <div class="top">
        <div class="name">${q.name}</div>
        <div class="xp">+${q.xp} XP ${q.bonus?`・<span title="${q.bonus}">🛈</span>`:""}</div>
      </div>
      <div class="desc">${q.desc}</div>
      <div class="actions">
        <button class="blue" data-q="${q.id}" data-act="check">確認する</button>
        <button class="green" id="btn-${q.id}" data-q="${q.id}" data-act="done">達成！</button>
      </div>
    `;
    wrap.appendChild(el);
  });

  wrap.addEventListener("click",(e)=>{
    const btn = e.target.closest("button"); if(!btn) return;
    const id = btn.dataset.q, act = btn.dataset.act;
    if(act==="check") confirmQuest(id);
    if(act==="done")  completeQuest(id);
  }, { once:true }); // 初期化時に1回リスナーを付与
}

function confirmQuest(id){
  const q = QUESTS.find(x=>x.id===id);
  if(!q) return;
  addLog(`チェック：${q.name} —— ${q.desc}`);
}

function completeQuest(id){
  const q = QUESTS.find(x=>x.id===id);
  if(!q) return;
  const btn = document.getElementById(`btn-${id}`);
  if(!btn || btn.disabled) return;

  let gained = q.xp;
  if(id==="hit-target"){
    state.streak = Math.min(3, state.streak + 1);
    gained += state.streak * 10;
    addLog(`🎯 目標達成ストリーク：${state.streak}日`);
  }
  setXP(gained, `クエスト「${q.name}」`);
  btn.disabled = true;
}

/* =========================
   活動ログ
========================= */
function addLog(text){
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  logEl.prepend(li);
}
if(quickClear){
  quickClear.addEventListener("click", ()=>{ logEl.innerHTML = ""; });
}

/* =========================
   キャラ挙動（前が多め→横を挟む）
========================= */
/*
  スプライト：横3×縦4（各32px）
  行（Y）：front(0), left(1), right(2), back(3)
*/
function setRow(dir){
  character.classList.remove("dir-front","dir-left","dir-right","dir-back");
  character.classList.add(`dir-${dir}`);
  character.classList.add("walking"); // 常に歩行アニメ
}

let running = true;
let alternateSide = true;

function moveTo(x, y, durationMs){
  return new Promise(resolve=>{
    character.style.transition = `transform ${durationMs}ms linear`;
    character.style.transform  = `translate(${x}px, ${y}px)`;
    setTimeout(resolve, durationMs);
  });
}
function getPos(){
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(character.style.transform || "");
  if(!m) return {x:0,y:0};
  return {x:parseFloat(m[1]), y:parseFloat(m[2])};
}
function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

async function loopWalk(){
  const stage = document.querySelector(".stage");
  const bounds = stage.getBoundingClientRect();
  const maxX = bounds.width - 80; // 余白考慮
  const maxY = bounds.height - 80;

  while(true){
    if(!running){ await wait(120); continue; }

    // 前（下方向）5秒：メイン
    setRow("front");
    let p = getPos();
    let dy = 120 + Math.random()*80;
    let newY = clamp(p.y + dy, 0, maxY);
    await moveTo(p.x, newY, 5000);

    // 横 2秒：左右交互
    setRow(alternateSide ? "left" : "right");
    alternateSide = !alternateSide;
    p = getPos();
    let dx = (Math.random()*160 + 80) * (Math.random()<0.5 ? -1 : 1);
    let newX = clamp(p.x + dx, 0, maxX);
    await moveTo(newX, p.y, 2000);
  }
}

/* 再生/停止 */
if(toggleBtn){
  toggleBtn.addEventListener("click", ()=>{
    running = !running;
    toggleBtn.textContent = running ? "一時停止" : "再開する";
    addLog(running ? "▶ キャラ再開" : "⏸ キャラ停止");
  });
}

/* =========================
   初期化
========================= */
function init(){
  character.style.backgroundPosition = `0px 0px`;
  character.classList.add("walking");
  renderQuests();
  refreshHeader();
  loopWalk(); // 非同期ループ
}
init();
