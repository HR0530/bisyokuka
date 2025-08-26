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
   ナビ（ホーム/図鑑）：どの階層でも動く相対パス
========================= */
function resolvePath(fromRoot){
  if (location.pathname.includes('/pages/characters/')) return `../../${fromRoot}`;
  if (location.pathname.includes('/pages/'))           return `../${fromRoot}`;
  return fromRoot;
}
const HOME_PATH = resolvePath('index_pc.html');
const DEX_PATH  = resolvePath('pages/dex/index.html');

const btnHome = document.getElementById("btnHome");
const btnDex  = document.getElementById("btnDex");
if (btnHome) btnHome.onclick = ()=> location.href = HOME_PATH;
if (btnDex)  btnDex.onclick  = ()=> location.href = DEX_PATH;

/* キーボードショートカット：H=ホーム / D=図鑑 */
window.addEventListener("keydown",(e)=>{
  const k = e.key.toLowerCase();
  if (k==="h") location.href = HOME_PATH;
  if (k==="d") location.href = DEX_PATH;
});

/* =========================
   XP / レベル / 称号（従来ロジック）
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

  let current = titles[0].name;
  for(const t of titles){ if(state.level >= t.minLv) current = t.name; }
  titleBadge.textContent = current;
}

/* =========================
   クエスト：確認 → 達成！ → 完了
========================= */
const QUESTS = [
  { id:"protein",   name:"たんぱく質 50–120g を目指す", xp:30, desc:"Pの目標レンジに入れる" },
  { id:"fat",       name:"脂質 40–70g に収める",        xp:30, desc:"Fの目標レンジに入れる" },
  { id:"carb",      name:"炭水化物 180–300g をキープ",  xp:30, desc:"Cの目標レンジに入れる" },
  { id:"total",     name:"総カロリー ±10% に収める",    xp:40, desc:"目標カロリーを達成", streak:true },
  { id:"newfood",   name:"新食材に挑戦（未登録）",       xp:25, desc:"未登録の食材を1つ追加" },
  { id:"addveg",    name:"野菜をもう1品追加",            xp:20, desc:"副菜を増やす" },
];

const questState = {}; // id: "check" | "ready" | "done"

function renderQuests(){
  const wrap = document.getElementById("questList");
  if(!wrap) return;
  wrap.innerHTML = "";

  QUESTS.forEach(q=>{
    questState[q.id] = questState[q.id] || "check";
    const el = document.createElement("div");
    el.className = "quest";
    el.id = `q-${q.id}`;
    el.innerHTML = `
      <div class="top">
        <div class="name">${q.name}<span class="state" id="state-${q.id}"></span></div>
        <div class="xp">+${q.xp} XP${q.streak?' ・<span title="連続達成で+10/日（最大+30）">🛈</span>':''}</div>
      </div>
      <div class="desc">${q.desc || ""}</div>
      <div class="actions">
        <button class="blue" id="btn-${q.id}"></button>
      </div>
    `;
    wrap.appendChild(el);
    updateQuestButton(q.id);
  });

  wrap.addEventListener("click",(e)=>{
    const btn = e.target.closest("button[id^='btn-']"); if(!btn) return;
    const id = btn.id.replace("btn-","");
    const st = questState[id];
    if(st==="check"){
      confirmQuest(id);
      questState[id] = "ready";
      updateQuestButton(id);
    }else if(st==="ready"){
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
    btn.textContent = "チェック"; btn.className = "blue"; btn.disabled = false;
    badge.textContent = "（未着手）"; card.classList.remove("done");
  }else if(st==="ready"){
    btn.textContent = "達成！"; btn.className = "green"; btn.disabled = false;
    badge.textContent = "（確認済）"; card.classList.remove("done");
  }else{
    btn.textContent = "完了"; btn.className = "green"; btn.disabled = true;
    badge.textContent = "（完了）"; card.classList.add("done");
  }
}

function confirmQuest(id){
  const q = QUESTS.find(x=>x.id===id);
  if(q) addLog(`チェック：${q.name}`);
}

function completeQuest(id){
  const q = QUESTS.find(x=>x.id===id); if(!q) return;
  let gained = q.xp;

  if(q.streak){
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
  logEl?.prepend(li);
}
quickClear?.addEventListener("click", ()=>{ if(logEl) logEl.innerHTML = ""; });

/* =========================
   キャラ：1体だけ・中央で前多め→時々横
========================= */
function ensureSingleChar(){
  const nodes = document.querySelectorAll(".char");
  nodes.forEach((n,i)=>{ if(i>0) n.remove(); }); // 2体目以降を除去
}
function setRow(dir){
  character.classList.remove("dir-front","dir-left","dir-right","dir-back");
  character.classList.add(`dir-${dir}`);
  character.classList.add("walking");
}
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function loopWalk(){
  let side = true;
  while(true){
    setRow("front"); await wait(5000);     // 正面：長め
    setRow(side ? "left" : "right");       // 横：短め（交互）
    side = !side;
    await wait(2000);
  }
}

/* 吹き出し */
function addSpeech(){
  const stage = document.querySelector(".stage");
  const b = document.createElement("div");
  b.className = "speech";
  b.textContent = "今日のPFCバランス、いい感じ？";
  stage.appendChild(b);
}

/* =========================
   初期化
========================= */
function init(){
  ensureSingleChar();
  character.style.backgroundPosition = `0px 0px`;
  setRow("front");
  addSpeech();
  renderQuests();
  refreshHeader();
  loopWalk();
}
init();
