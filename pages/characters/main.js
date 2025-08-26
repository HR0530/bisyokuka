/* =======================================================
   美食家さん｜キャラ育成  完成版 main.js
   - 状態は localStorage に保存（リロードしても続きから）
   - クエストは meal ページのデータを自動取得して判定
   - キャラは中央で常時歩行（前メイン→ときどき横）
   -------------------------------------------------------
   ■ meal データの想定（ローカル保存）
     下記のうち “どれか” に入っていれば自動で拾います。
     - "mealEntries" / "meals" / "mealRecords" / "bisyokuka_meals"
     - 形式の例（配列）：
        {
          date: "2025-08-26T12:34:56+09:00", // or "2025-08-26"
          protein: 25, fat: 12, carbs: 60, calories: 520,
          // 任意: ingredients: ["鶏むね","ブロッコリー"], isNewFood: true
        }
     - 目標カロリー（任意）：
        "calorieGoal" / "calorieTarget" / "bisyokuka_calorie_goal"
        または settings JSON の { calorieGoal: 1800 } 等
   ======================================================= */

/* ========== DOM参照 ========== */
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

/* ========== ナビ（ホーム/図鑑） ========== */
function resolvePath(fromRoot){
  if (location.pathname.includes('/pages/characters/')) return `../../${fromRoot}`;
  if (location.pathname.includes('/pages/'))           return `../${fromRoot}`;
  return fromRoot;
}
const HOME_PATH = resolvePath('index_pc.html');
const DEX_PATH  = resolvePath('pages/dex/index.html');
document.getElementById("btnHome")?.addEventListener("click", ()=> location.href = HOME_PATH);
document.getElementById("btnDex") ?.addEventListener("click", ()=> location.href = DEX_PATH);
window.addEventListener("keydown",(e)=>{
  const k = e.key.toLowerCase();
  if (k==="h") location.href = HOME_PATH;
  if (k==="d") location.href = DEX_PATH;
});

/* ========== ユーティリティ ========== */
const STORAGE_VERSION = "v1";
const CHAR_STATE_KEY  = `bs_char_state_${STORAGE_VERSION}`;                // レベル/XPなど
const STREAK_KEY      = `bs_target_streak_${STORAGE_VERSION}`;             // 目標達成の連続記録
const QUEST_AWARD_D_PREFIX = `bs_quest_awards_${STORAGE_VERSION}_`;         // + YYYYMMDD（同日に二重加算しない）
const QUEST_STATE_D_PREFIX = `bs_quest_state_${STORAGE_VERSION}_`;          // + YYYYMMDD（UI状態・任意）

const todayStr = () => {
  const d = new Date(); // ローカル日付
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const todayKey = () => todayStr().replaceAll("-","");

/* ========== キャラ状態（永続化） ========== */
const titles = [
  { minLv: 1, name: "見習いフーディー" },
  { minLv: 3, name: "美食研究家" },
  { minLv: 5, name: "美食家" },
  { minLv: 7, name: "食の達人" },
  { minLv:10, name: "グランド・グルメ" },
];

let state = loadCharState() || {
  level: 1,
  xp: 0,
  hp: 100,
  satisfaction: 50
};
function saveCharState(){
  localStorage.setItem(CHAR_STATE_KEY, JSON.stringify(state));
}
function loadCharState(){
  try{
    const raw = localStorage.getItem(CHAR_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}
function xpNeeded(lv){ return 100 + (lv - 1) * 50; }

function setXP(diff, reason=""){
  state.xp = Math.max(0, (state.xp ?? 0) + diff);
  if(reason) addLog(`+${diff} XP：${reason}`);

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

/* ========== クエスト（自動判定） ========== */
/* 判定対象（PFCレンジ & 総カロリー±10%） */
const QUESTS = [
  { id:"protein", name:"たんぱく質 50–120g を目指す", xp:30, desc:"Pの目標レンジに入れる" },
  { id:"fat",     name:"脂質 40–70g に収める",         xp:30, desc:"Fの目標レンジに入れる" },
  { id:"carb",    name:"炭水化物 180–300g をキープ",   xp:30, desc:"Cの目標レンジに入れる" },
  { id:"total",   name:"総カロリー ±10% に収める",     xp:40, desc:"目標カロリーを達成", streak:true },
];

const questState = loadQuestStateForToday();   // UI表示用：check/ready/done を保持（自動で done まで進む）
function saveQuestStateForToday(){
  localStorage.setItem(QUEST_STATE_D_PREFIX + todayKey(), JSON.stringify(questState));
}
function loadQuestStateForToday(){
  try{
    const raw = localStorage.getItem(QUEST_STATE_D_PREFIX + todayKey());
    if(raw) return JSON.parse(raw);
  }catch{}
  // 既定は「check」
  const obj = {}; QUESTS.forEach(q => obj[q.id] = "check");
  return obj;
}

function getAwardsToday(){
  try{
    return JSON.parse(localStorage.getItem(QUEST_AWARD_D_PREFIX + todayKey()) || "{}");
  }catch{ return {}; }
}
function setAwardsToday(map){
  localStorage.setItem(QUEST_AWARD_D_PREFIX + todayKey(), JSON.stringify(map));
}

/* クエストUI生成（ボタンは“自動判定中”のラベルとして表示） */
function renderQuests(){
  const wrap = document.getElementById("questList");
  if(!wrap) return;
  wrap.innerHTML = "";

  QUESTS.forEach(q=>{
    const el = document.createElement("div");
    el.className = "quest";
    el.id = `q-${q.id}`;
    el.innerHTML = `
      <div class="top">
        <div class="name">${q.name}<span class="state" id="state-${q.id}"></span></div>
        <div class="xp">+${q.xp} XP${q.streak?' ・<span title="連続達成で +10/日（最大+30）">🛈</span>':''}</div>
      </div>
      <div class="desc">${q.desc || ""}</div>
      <div class="actions">
        <button class="blue" id="btn-${q.id}" disabled>自動判定中</button>
      </div>
    `;
    wrap.appendChild(el);
  });
}

/* 状態表示の更新 */
function updateQuestUI(id, status){ // status: "check" | "ready" | "done"
  const btn = document.getElementById(`btn-${id}`);
  const badge = document.getElementById(`state-${id}`);
  const card = document.getElementById(`q-${id}`);
  questState[id] = status;

  if(status === "check"){
    if(btn){ btn.textContent = "未達成"; btn.className = "blue"; btn.disabled = true; }
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

/* ========== meal から今日の栄養を集計 ========== */
const MEAL_KEYS = [
  "mealEntries","meals","mealRecords","bisyokuka_meals",
  "mealList","mealData","meals_today","bs_meals","mealHistory"
];

function getCalorieGoal(){
  // 例: 1580 のような数値を探す
  const candidates = [
    "calorieGoal","calorieTarget","bisyokuka_calorie_goal",
    "goalCalories","dailyCalorieGoal"
  ];
  for(const k of candidates){
    const v = localStorage.getItem(k);
    if(v && !isNaN(Number(v))) return Number(v);
  }
  // settings に入っている可能性
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
    // "YYYY-MM-DD" or ISO
    const d = new Date(any);
    if(!isNaN(d)) return toDateStrLocal(d);
    // 素の "YYYY-MM-DD" ならそのまま返す
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
    }catch{ /* ignore */ }
  }
  const today = todayStr();
  // 今日の分だけフィルタ
  items = items.filter(it=>{
    const ds = toDateStrLocal(it?.date ?? it?.day ?? it?.createdAt ?? it?.timestamp);
    return ds === today;
  });
  // 合算
  let P=0,F=0,C=0, K=0;
  for(const it of items){
    P += firstNumber(it, ["protein","prot","P","p"]);
    F += firstNumber(it, ["fat","lipid","F","f"]);
    C += firstNumber(it, ["carbs","carb","C","c","carbohydrate"]);
    K += firstNumber(it, ["calories","kcal","cal","energy"]);
  }
  return {P, F, C, K, count: items.length};
}

/* ========== 自動判定＆XP付与 ========== */
function evaluateAndAward(){
  const {P,F,C,K,count} = collectMealsToday();
  const goal = getCalorieGoal();
  const awards = getAwardsToday();

  // 判定
  const okProtein = (P >= 50 && P <= 120);
  const okFat     = (F >= 40 && F <= 70);
  const okCarb    = (C >= 180 && C <= 300);
  const okTotal   = (goal>0) ? Math.abs(K - goal) <= goal*0.10 : false;

  // UI（達成→完了の段階）
  updateQuestUI("protein", okProtein ? "ready" : "check");
  updateQuestUI("fat",     okFat     ? "ready" : "check");
  updateQuestUI("carb",    okCarb    ? "ready" : "check");
  updateQuestUI("total",   okTotal   ? "ready" : "check");

  // 付与（今日未付与のものだけ1回）
  QUESTS.forEach(q=>{
    const achieved = (q.id==="protein" && okProtein)
                  || (q.id==="fat"     && okFat)
                  || (q.id==="carb"    && okCarb)
                  || (q.id==="total"   && okTotal);
    if(achieved){
      // まだ付与していなければXP付与して完了表示
      if(!awards[q.id]){
        let gained = q.xp;
        if(q.streak){
          // 連続達成のXPボーナス（最大+30）
          const st = loadStreak();
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
          const yStr = toDateStrLocal(yesterday);
          if(st.last === yStr) st.count = Math.min(999, st.count + 1);
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

  // 参考ログ
  addOrUpdateNutritionBadge(P,F,C,K,goal,count);
}

/* ストリーク保存 */
function loadStreak(){
  try{
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
  }catch{ return {}; }
}
function saveStreak(obj){ localStorage.setItem(STREAK_KEY, JSON.stringify(obj||{})); }

/* 画面上に“今日の合計”の小バッジを出す */
function addOrUpdateNutritionBadge(P,F,C,K,goal,count){
  let el = document.getElementById("nutritionBadge");
  if(!el){
    el = document.createElement("div");
    el.id = "nutritionBadge";
    el.style.cssText = "margin-top:8px;color:#94a3b8;font-size:12px";
    const howto = document.querySelector(".howto");
    howto?.appendChild(el);
  }
  el.textContent = `今日の集計: P ${Math.round(P)}g / F ${Math.round(F)}g / C ${Math.round(C)}g / ${Math.round(K)}kcal（目標 ${goal}kcal）・記録 ${count}件`;
}

/* ========== 活動ログ ========== */
function addLog(text){
  if(!logEl) return;
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  logEl.prepend(li);
}
quickClear?.addEventListener("click", ()=>{ if(logEl) logEl.innerHTML = ""; });

/* ========== キャラ挙動（中央固定：前多め→横） ========== */
function ensureSingleChar(){
  const nodes = document.querySelectorAll(".char");
  nodes.forEach((n,i)=>{ if(i>0) n.remove(); });
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

/* ========== 初期化 ========== */
function init(){
  ensureSingleChar();
  character.style.backgroundPosition = `0px 0px`;
  setRow("front");
  addSpeech();

  renderQuests();
  refreshHeader();

  // 初回評価
  evaluateAndAward();

  // meal ページで記録→戻ってきた時の再評価
  window.addEventListener("focus", evaluateAndAward);

  // 他タブの localStorage 変更を拾う
  window.addEventListener("storage", (e)=>{
    if(!e.key) return;
    // mealデータ or 目標カロリーに関係する変更なら再評価
    if (MEAL_KEYS.includes(e.key) || ["calorieGoal","calorieTarget","bisyokuka_calorie_goal","settings","userSettings","bs_settings"].includes(e.key)){
      evaluateAndAward();
    }
  });

  // 念のためのポーリング（10秒間隔）
  setInterval(evaluateAndAward, 10000);

  // 歩行ループ
  loopWalk();
}
init();
