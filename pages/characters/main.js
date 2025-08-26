/* =========================
   参照
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

/* =========================
   パス自動補正（ホーム/図鑑）
   - pages/characters/ 配下でも root でも動く
========================= */
function resolvePath(fromRoot){
  // 例: /repo/pages/characters/index.html → 深さで ../ を作る
  const depth = location.pathname.replace(/\/+$/,'').split('/').filter(Boolean).length;
  // 「プロジェクトのルート深さ」をざっくり推定（/repo/ を想定して +1）
  // characters 下なら 2 つ上、そうでなければ 1 つ上を優先
  if (location.pathname.includes('/pages/characters/')) return `../../${fromRoot}`;
  if (location.pathname.includes('/pages/'))           return `../${fromRoot}`;
  return fromRoot; // すでにルート想定
}

const HOME_PATH = resolvePath('index_pc.html');            // 例: ../../index_pc.html
const DEX_PATH  = resolvePath('pages/dex/index.html');     // 例: ../dex/index.html

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
   XP / レベル / 称号（従来仕様を踏襲）
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
  streak: 0, // 目標達成の連続日数
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
   クエスト：確認 → 達成！ → 完了（UI更新）
========================= */
const QUESTS = [
  { id:"log-photo",  name:"食事を写真つきで記録する", desc:"本日中に1件投稿（料理全体が見える写真）", xp:30 },
  { id:"hit-target", name:"カロリー目標を達成",       desc:"今日の摂取カロリーを±5%以内に収める", xp:40, bonus:"連続達成で +10/日（最大+30）"},
  { id:"try-new",    name:"未知の食材を試す",         desc:"普段使わない食材で簡単レシピを作る", xp:25 },
  { id:"research",   name:"食の小ネタを1つ投稿",       desc:"発酵の仕組み、オレイン酸の効果など", xp:20 },
];
const questState = {}; // id: "check" | "ready" | "done"

function renderQuests(){
  const wrap = document.getElementById("questList");
  wrap.innerHTML = "";
  QUESTS.forEach(q=>{
    questState[q.id] = questState[q.id] || "check"; // 初期は「確認する」
    const el = document.createElement("div");
    el.className = "quest";
    el.id = `q-${q.id}`;
    el.innerHTML = `
      <div class="top">
        <div class="name">${q.name}<span class="state" id="state-${q.id}"></span></div>
        <div class="xp">+${q.xp} XP ${q.bonus?`・<span title="${q.bonus}">🛈</span>`:""}</div>
      </div>
      <div class="desc">${q.desc}</div>
      <div class="actions">
        <button class="blue"  id="btn-${q.id}"></button>
      </div>
    `;
    wrap.appendChild(el);
    updateQuestButton(q.id);
  });

  wrap.addEventListener("click",(e)=>{
    const btn = e.target.closest("button[id^='btn-']");
    if(!btn) return;
    const id = btn.id.replace('btn-','');
    const st = questState[id];

    if(st==="check"){ // 確認 → 達成に切り替え
      confirmQuest(id);
      questState[id] = "ready";
      updateQuestButton(id);
    }else if(st==="ready"){ // 達成！
      completeQuest(id);
      questState[id] = "done";
      updateQuestButton(id);
    }
  });
}

function updateQuestButton(id){
  const btn = document.getElementById(`btn-${id}`);
  const badge = document.getElementById(`state-${id}`);
  const card = document.getElementById(`q-${id}`);
  const st = questState[id];

  if(st==="check"){
    btn.textContent = "確認する"; btn.className = "blue"; btn.disabled = false;
    badge.textContent = "（未着手）"; card.classList.remove("done");
  }else if(st==="ready"){
    btn.textContent = "達成！"; btn.className = "green"; btn.disabled = false;
    badge.textContent = "（確認済）"; card.classList.remove("done");
  }else{ // done
    btn.textContent = "完了"; btn.className = "green"; btn.disabled = true;
    badge.textContent = "（完了）"; card.classList.add("done");
  }
}

function confirmQuest(id){
  const q = QUESTS.find(x=>x.id===id); if(!q) return;
  addLog(`チェック：${q.name} —— ${q.desc}`);
}

function completeQuest(id){
  const q = QUESTS.find(x=>x.id===id); if(!q) return;

  let gained = q.xp;
  if(id==="hit-target"){
    state.streak = Math.min(3, state.streak + 1);
    gained += state.streak * 10;
    addLog(`🎯 目標達成ストリーク：${state.streak}日`);
  }
  setXP(gained, `クエスト「${q.name}」`);
}

/* =========================
   活動ログ
========================= */
function addLog(text){
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  logEl.prepend(li);
}
if(quickClear){ quickClear.addEventListener("click", ()=>{ logEl.innerHTML = ""; }); }

/* =========================
   キャラ：1人だけを常に表示し、前多め→横
========================= */
/* 画像は横3×縦4（各32px）。行：front(0), left(1), right(2), back(3) */
function setRow(dir){
  character.classList.remove("dir-front","dir-left","dir-right","dir-back");
  character.classList.add(`dir-${dir}`);
  character.classList.add("walking");
}

// 保険：もし複数 .char がDOMにあれば 1人に揃える
(function ensureSingleChar(){
  const nodes = document.querySelectorAll(".char");
  nodes.forEach((n,i)=>{ if(i>0) n.remove(); });
})();

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
  const maxX = bounds.width - 80;
  const maxY = bounds.height - 80;

  while(true){
    if(!running){ await wait(120); continue; }

    // 前（下方向）5秒：メイン挙動
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
  loopWalk();
}
init();
