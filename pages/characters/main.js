/* =======================================================
   美食家さん｜キャラ育成  完成版 main.js
   - 状態は localStorage に保存
   - クエストは meal データから自動判定
   - キャラは中央で前向き歩行、時々横向き
   ======================================================= */

/* -------- DOM -------- */
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

/* -------- ナビ（ホーム/図鑑/分析） -------- */
function resolveHomePath(){
  // /pages/characters/index.html → ../../index_pc.html
  if (location.pathname.includes('/pages/')) return '../index_pc.html';
  return 'index_pc.html';
}
function resolveDexPath(){
  // /pages/characters/ からは dex/index.html、それ以外なら絶対相対で
  if (location.pathname.includes('/pages/characters/')) return 'dex/index.html';
  return 'pages/characters/dex/index.html';
}
function resolveInsightsPath(){
  if (location.pathname.includes('/pages/characters/')) return '../insights/index.html';
  if (location.pathname.includes('/pages/'))           return 'insights/index.html';
  return 'pages/insights/index.html';
}

document.getElementById("btnHome")?.addEventListener("click", ()=> location.href = resolveHomePath());
document.getElementById("btnDex") ?.addEventListener("click", ()=> location.href = resolveDexPath());
document.getElementById("fabHome")?.addEventListener("click", ()=> location.href = resolveHomePath());
document.getElementById("fabDex") ?.addEventListener("click", ()=> location.href = resolveDexPath());
document.getElementById("goInsights")?.addEventListener("click", ()=> location.href = resolveInsightsPath());

// ショートカット
window.addEventListener("keydown",(e)=>{
  const k = e.key.toLowerCase();
  if (k === "h") location.href = resolveHomePath();
  if (k === "d") location.href = resolveDexPath();
  if (k === "i") location.href = resolveInsightsPath();
});

/* -------- ユーティリティ -------- */
const STORAGE_VERSION = "v1";
const CHAR_STATE_KEY  = `bs_char_state_${STORAGE_VERSION}`;
const STREAK_KEY      = `bs_target_streak_${STORAGE_VERSION}`;
const QUEST_AWARD_D_PREFIX = `bs_quest_awards_${STORAGE_VERSION}_`;
const QUEST_STATE_D_PREFIX = `bs_quest_state_${STORAGE_VERSION}_`;

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const todayKey = () => todayStr().replaceAll("-","");

/* -------- キャラ状態 -------- */
const titles = [
  { minLv: 1, name: "見習いフーディー" },
  { minLv: 3, name: "美食研究家" },
  { minLv: 5, name: "美食家" },
  { minLv: 7, name: "食の達人" },
  { minLv:10, name: "グランド・グルメ" },
];

let state = loadCharState() || { level:1, xp:0, hp:100, satisfaction:50 };
function saveCharState(){ localStorage.setItem(CHAR_STATE_KEY, JSON.stringify(state)); }
function loadCharState(){
  try{ return JSON.parse(localStorage.getItem(CHAR_STATE_KEY) || "null"); }
  catch{ return null; }
}
function xpNeeded(lv){ return 100 + (lv - 1) * 50; }

function setXP(diff, reason=""){
  state.xp = Math.max(0, (state.xp ?? 0) + diff);
  if (reason) addLog(`+${diff} XP：${reason}`);

  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    addLog(`🎉 レベルアップ！ → Lv.${state.level}`);
    state.hp = Math.min(200, (state.hp ?? 100) + 5);
    state.satisfaction = Math.min(100, (state.satisfaction ?? 50) + 3);
  }
  saveCharState();
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

/* -------- クエスト定義 -------- */
const QUESTS = [
  { id:"protein", name:"たんぱく質 50–120g を目指す", xp:30, desc:"Pの目標レンジに入れる" },
  { id:"fat",     name:"脂質 40–70g に収める",         xp:30, desc:"Fの目標レンジに入れる" },
  { id:"carb",    name:"炭水化物 180–300g をキープ",   xp:30, desc:"Cの目標レンジに入れる" },
  { id:"total",   name:"総カロリー ±10% に収める",     xp:40, desc:"目標カロリーを達成", streak:true },
];

const questState = loadQuestStateForToday();
function saveQuestStateForToday(){
  localStorage.setItem(QUEST_STATE_D_PREFIX + todayKey(), JSON.stringify(questState));
}
function loadQuestStateForToday(){
  try{
    const raw = localStorage.getItem(QUEST_STATE_D_PREFIX + todayKey());
    if (raw) return JSON.parse(raw);
  }catch{}
  const obj = {}; QUESTS.forEach(q => obj[q.id] = "check"); // 既定
  return obj;
}

function getAwardsToday(){
  try{ return JSON.parse(localStorage.getItem(QUEST_AWARD_D_PREFIX + todayKey()) || "{}"); }
  catch{ return {}; }
}
function setAwardsToday(map){
  localStorage.setItem(QUEST_AWARD_D_PREFIX + todayKey(), JSON.stringify(map));
}

function renderQuests(){
  const wrap = document.getElementById("questList");
  if (!wrap) return;
  wrap.innerHTML = "";
  QUESTS.forEach(q=>{
    const el = document.createElement("div");
    el.className = "quest"; el.id = `q-${q.id}`;
    el.innerHTML = `
      <div class="top">
        <div class="name">${q.name}<span class="state" id="state-${q.id}"></span></div>
        <div class="xp">+${q.xp} XP${q.streak?' ・<span title="連続達成で +10/日（最大+30）">🛈</span>':''}</div>
      </div>
      <div class="desc">${q.desc || ""}</div>
      <div class="actions">
        <button class="blue" id="btn-${q.id}">確認する</button>
      </div>
    `;
    wrap.appendChild(el);
    // 「確認する」は分析へ
    el.querySelector(`#btn-${q.id}`).addEventListener("click", ()=>{
      location.href = resolveInsightsPath();
    });
  });
}

function updateQuestUI(id, status){ // "check" | "ready" | "done"
  const btn = document.getElementById(`btn-${id}`);
  const badge = document.getElementById(`state-${id}`);
  const card = document.getElementById(`q-${id}`);
  questState[id] = status;

  if(status === "check"){
    if(btn){ btn.textContent = "確認する"; btn.className = "blue"; btn.disabled = false; }
    if(badge) badge.textContent = "（未達成）";
    card?.classList.remove("done");
  }else if(status === "ready"){
    if(btn){ btn.textContent = "達成！"; btn.className = "green"; btn.disabled = true; }
    if(badge) badge.textContent = "（達成）";
    card?.classList.remove("done");
  }else{
    if(btn){ btn.textContent = "完了"; btn.className = "green"; btn.disabled = true; }
    if(badge) badge.textContent = "（完了）";
    card?.classList.add("done");
  }
  saveQuestStateForToday();
}

/* -------- meal 集計 -------- */
const MEAL_KEYS = [
  "bisyokuka_meals_v2",                // ← 追加
  "mealEntries","meals","mealRecords","bisyokuka_meals",
  "mealList","mealData","meals_today","bs_meals","mealHistory"
];

function getCalorieGoal(){
  const candidates = [
    "calorieGoal","calorieTarget","bisyokuka_calorie_goal",
    "goalCalories","dailyCalorieGoal"
  ];
  for(const k of candidates){
    const v = localStorage.getItem(k);
    if(v && !isNaN(Number(v))) return Number(v);
  }
  const settingsKeys = ["settings","userSettings","bs_settings"];
  for(const sk of settingsKeys){
    try{
      const o = JSON.parse(localStorage.getItem(sk) || "null");
      if(o){
        const cand = o.calorieGoal ?? o.calorie_target ?? o.calorieTarget;
        if(cand && !isNaN(Number(cand))) return Number(cand);
      }
    }catch{}
  }
  return 1580; // 既定
}
function toDateStrLocal(any){
  if(any == null) return todayStr();
  if(typeof any === "number") return toDateStrLocal(new Date(any));
  if(typeof any === "string"){
    const d = new Date(any);
    if(!isNaN(d)) return toDateStrLocal(d);
    if(/^\d{4}-\d{2}-\d{2}$/.test(any)) return any;
  }
  if(any instanceof Date){
    const y = any.getFullYear();
    const m = String(any.getMonth()+1).padStart(2,"0");
    const d = String(any.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  return todayStr();
}
function firstNumber(obj, keys){
  for(const k of keys){
    const v = obj?.[k];
    if(typeof v === "number" && !isNaN(v)) return v;
    if(typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function collectMealsToday(){
  let items = [];
  for(const key of MEAL_KEYS){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const data = JSON.parse(raw);
      let arr = [];
      if(Array.isArray(data)) arr = data;
      else if(Array.isArray(data?.items)) arr = data.items;
      else if(Array.isArray(data?.data))  arr = data.data;
      if(arr.length) items = items.concat(arr);
    }catch{}
  }
  const today = todayStr();
  items = items.filter(it=>{
    const ds = toDateStrLocal(it?.date ?? it?.day ?? it?.createdAt ?? it?.timestamp);
    return ds === today;
  });
  let P=0,F=0,C=0, K=0;
  for(const it of items){
    P += firstNumber(it, ["protein","prot","P","p"]);
    F += firstNumber(it, ["fat","lipid","F","f"]);
    C += firstNumber(it, ["carbs","carb","C","c","carbohydrate"]);
    K += firstNumber(it, ["calories","kcal","cal","energy"]);
  }
  return {P, F, C, K, count: items.length};
}

/* -------- 自動判定＆XP付与 -------- */
function evaluateAndAward(){
  const {P,F,C,K,count} = collectMealsToday();
  const goal = getCalorieGoal();
  const awards = getAwardsToday();

  const okProtein = (P >= 50 && P <= 120);
  const okFat     = (F >= 40 && F <= 70);
  const okCarb    = (C >= 180 && C <= 300);
  const okTotal   = (goal>0) ? Math.abs(K - goal) <= goal*0.10 : false;

  updateQuestUI("protein", okProtein ? "ready" : "check");
  updateQuestUI("fat",     okFat     ? "ready" : "check");
  updateQuestUI("carb",    okCarb    ? "ready" : "check");
  updateQuestUI("total",   okTotal   ? "ready" : "check");

  QUESTS.forEach(q=>{
    const achieved = (q.id==="protein" && okProtein)
                  || (q.id==="fat"     && okFat)
                  || (q.id==="carb"    && okCarb)
                  || (q.id==="total"   && okTotal);
    if(achieved){
      if(!awards[q.id]){
        let gained = q.xp;
        if(q.streak){
          const st = loadStreak();
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
          const yStr = toDateStrLocal(yesterday);
          if(st.last === yStr) st.count = Math.min(999, (st.count||0) + 1);
          else st.count = 1;
          st.last = todayStr();
          saveStreak(st);
          gained += Math.min(3, st.count) * 10;
          addLog(`🎯 目標達成ストリーク：${st.count}日`);
        }
        setXP(gained, `クエスト「${q.name}」`);
        awards[q.id] = true;
        setAwardsToday(awards);
      }
      updateQuestUI(q.id, "done");
    }
  });

  addOrUpdateNutritionBadge(P,F,C,K,goal,count);
}
function loadStreak(){ try{ return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}"); }catch{ return {}; } }
function saveStreak(obj){ localStorage.setItem(STREAK_KEY, JSON.stringify(obj||{})); }

function addOrUpdateNutritionBadge(P,F,C,K,goal,count){
  let el = document.getElementById("nutritionBadge");
  if(!el){
    el = document.createElement("div");
    el.id = "nutritionBadge";
    el.style.cssText = "margin-top:8px;color:#94a3b8;font-size:12px";
    document.querySelector(".howto")?.appendChild(el);
  }
  el.textContent = `今日の集計: P ${Math.round(P)}g / F ${Math.round(F)}g / C ${Math.round(C)}g / ${Math.round(K)}kcal（目標 ${goal}kcal）・記録 ${count}件`;
}

/* -------- 活動ログ -------- */
function addLog(text){
  if(!logEl) return;
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  logEl.prepend(li);
}
quickClear?.addEventListener("click", ()=>{ if(logEl) logEl.innerHTML = ""; });

/* -------- キャラ挙動 -------- */
function ensureSingleChar(){
  const nodes = document.querySelectorAll(".char");
  nodes.forEach((n,i)=>{ if(i>0) n.remove(); });
}
function setRow(dir){
  character.classList.remove("dir-front","dir-left","dir-right","dir-back");
  character.classList.add(`dir-${dir}`);
}
const wait = ms => new Promise(r=>setTimeout(r,ms));

let running = true;
toggleBtn?.addEventListener("click", ()=>{
  running = !running;
  toggleBtn.textContent = running ? "一時停止" : "再開";
  character.classList.toggle("walking", running);
});

async function loopWalk(){
  character.classList.add("walking");
  let side = true;
  while(true){
    // 一時停止中は待機
    while(!running) await wait(150);

    setRow("front");
    for(let t=0; t<25; t++){ if(!running) break; await wait(200); } // ~5秒

    while(!running) await wait(150);
    setRow(side ? "left" : "right");
    side = !side;
    for(let t=0; t<10; t++){ if(!running) break; await wait(200); } // ~2秒
  }
}

function addSpeech(){
  const stage = document.querySelector(".stage");
  const b = document.createElement("div");
  b.className = "speech";
  b.textContent = "今日のPFCバランス、いい感じ？";
  stage.appendChild(b);
}

/* -------- 初期化 -------- */
function init(){
  ensureSingleChar();
  setRow("front");
  addSpeech();
  renderQuests();
  refreshHeader();

  evaluateAndAward();
  window.addEventListener("focus", evaluateAndAward);
  window.addEventListener("storage", (e)=>{
    if(!e.key) return;
    if (MEAL_KEYS.includes(e.key) || ["calorieGoal","calorieTarget","bisyokuka_calorie_goal","settings","userSettings","bs_settings"].includes(e.key)){
      evaluateAndAward();
    }
  });
  setInterval(evaluateAndAward, 10000);

  loopWalk();
}
init();
