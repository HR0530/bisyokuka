/* ===== DOM ===== */
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");
const levelText = document.getElementById("levelText");
const titleBadge = document.getElementById("titleBadge");
const logEl = document.getElementById("activityLog");
const hpText = document.getElementById("hpText");
const satiText = document.getElementById("satisfactionText");
const character = document.getElementById("character");
const speech = document.getElementById("speech");

/* ===== 画像パスを最初に強制適用（階層ズレ保険） ===== */
(async ()=>{
  const candidates = [
    './project-root/char.png',
    'project-root/char.png',
    '../project-root/char.png',
    '/project-root/char.png'
  ];
  for (const p of candidates){
    const ok = await new Promise(res=>{
      const img = new Image();
      img.onload = ()=>res(true);
      img.onerror = ()=>res(false);
      img.src = p + '?v=' + Date.now();
    });
    if (ok){ character.style.backgroundImage = `url("${p}")`; break; }
  }
})();

/* ===== ルーティング（必要なら使う） ===== */
function resolveHomePath(){
  if (location.pathname.includes('/pages/characters/')) return '../../index_pc.html';
  if (location.pathname.includes('/pages/'))           return '../index_pc.html';
  return 'index_pc.html';
}
function resolveDexPath(){
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

/* ===== ステータス／XP ===== */
const STORAGE_VERSION = "v1";
const CHAR_KEY  = `bs_char_state_${STORAGE_VERSION}`;
const STREAK_KEY = `bs_target_streak_${STORAGE_VERSION}`;
const AWARD_D_PREFIX = `bs_quest_awards_${STORAGE_VERSION}_`;
const QSTATE_D_PREFIX= `bs_quest_state_${STORAGE_VERSION}_`;

const titles = [
  { minLv: 1, name: "見習いフーディー" },
  { minLv: 3, name: "美食研究家" },
  { minLv: 5, name: "美食家" },
  { minLv: 7, name: "食の達人" },
  { minLv:10, name: "グランド・グルメ" },
];

let state = load(CHAR_KEY) || { level:1, xp:0, hp:100, satisfaction:50 };
function load(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch{ return null; } }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function xpNeeded(lv){ return 100 + (lv-1)*50; }

function addLog(t){
  if(!logEl) return;
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()}  ${t}`;
  logEl.prepend(li);
}

function setXP(diff, reason=''){
  state.xp = Math.max(0, (state.xp||0) + diff);
  if (reason) addLog(`+${diff} XP：${reason}`);
  while(state.xp >= xpNeeded(state.level)){
    state.xp -= xpNeeded(state.level);
    state.level++;
    addLog(`🎉 レベルアップ！ → Lv.${state.level}`);
    state.hp = Math.min(200, (state.hp||100)+5);
    state.satisfaction = Math.min(100, (state.satisfaction||50)+3);
  }
  save(CHAR_KEY, state);
  refreshHeader();
}

function refreshHeader(){
  const need = xpNeeded(state.level);
  const pct = Math.min(100, Math.round((state.xp/need)*100));
  xpFill.style.width = `${pct}%`;
  xpText.textContent = `${state.xp} / ${need} XP`;
  levelText.textContent = `Lv.${state.level}`;
  hpText.textContent = state.hp;
  satiText.textContent = state.satisfaction;
  const t = titles.reduce((acc,cur)=> state.level>=cur.minLv ? cur.name : acc, titles[0].name);
  titleBadge.textContent = t;
}
refreshHeader();

/* ===== クエスト（UI） ===== */
const QUESTS = [
  { id:"protein", name:"たんぱく質 50–120g を目指す", xp:30, desc:"Pの目標レンジに入れる" },
  { id:"fat",     name:"脂質 40–70g に収める",         xp:30, desc:"Fの目標レンジに入れる" },
  { id:"carb",    name:"炭水化物 180–300g をキープ",   xp:30, desc:"Cの目標レンジに入れる" },
  { id:"total",   name:"総カロリー ±10% に収める",     xp:40, desc:"目標カロリーを達成", streak:true },
];
const todayStr = ()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const todayKey = ()=> todayStr().replaceAll('-','');

const qState = load(QSTATE_D_PREFIX + todayKey()) || Object.fromEntries(QUESTS.map(q=>[q.id,'check']));
function saveQState(){ save(QSTATE_D_PREFIX + todayKey(), qState); }

function renderQuests(){
  const wrap = document.getElementById('questList');
  wrap.innerHTML = '';
  QUESTS.forEach(q=>{
    const el = document.createElement('div');
    el.className = 'quest'; el.id = `q-${q.id}`;
    el.innerHTML = `
      <div class="top">
        <div class="name">${q.name}<span class="state" id="state-${q.id}"></span></div>
        <div class="xp">+${q.xp} XP${q.streak?' ・<span title="連続達成で +10/日（最大+30）">🛈</span>':''}</div>
      </div>
      <div class="desc">${q.desc||''}</div>
      <div class="actions"><button class="blue" id="btn-${q.id}">確認する</button></div>
    `;
    wrap.appendChild(el);
    el.querySelector(`#btn-${q.id}`).addEventListener('click', ()=> location.href = resolveInsightsPath());
  });
}
function setQuestUI(id,status){
  const btn = document.getElementById(`btn-${id}`);
  const badge = document.getElementById(`state-${id}`);
  const card = document.getElementById(`q-${id}`);
  qState[id] = status;
  if(status==='check'){
    btn.textContent='確認する'; btn.className='blue'; btn.disabled=false;
    badge.textContent='（未達成）'; card.classList.remove('done');
  }else if(status==='ready'){
    btn.textContent='達成！'; btn.className='green'; btn.disabled=false;
    badge.textContent='（達成）'; card.classList.remove('done');
  }else{
    btn.textContent='完了'; btn.className='green'; btn.disabled=true;
    badge.textContent='（完了）'; card.classList.add('done');
  }
  saveQState();
}

/* ===== meal 集計 & 判定（簡略版：あなたの前コードを踏襲） ===== */
const MEAL_KEYS = ["bisyokuka_meals_v2","mealEntries","meals","mealRecords","bisyokuka_meals","mealList","mealData","meals_today","bs_meals","mealHistory"];
function getCalorieGoal(){
  const ks = ["calorieGoal","calorieTarget","bisyokuka_calorie_goal","goalCalories","dailyCalorieGoal"];
  for(const k of ks){ const v = localStorage.getItem(k); if(v && !isNaN(+v)) return +v; }
  for(const sk of ["settings","userSettings","bs_settings"]){
    try{
      const o = JSON.parse(localStorage.getItem(sk)||'null');
      const cand = o?.calorieGoal ?? o?.calorie_target ?? o?.calorieTarget;
      if(cand && !isNaN(+cand)) return +cand;
    }catch{}
  }
  return 1580;
}
function dateStr(any){
  if(!any) return todayStr();
  if(typeof any==='string'){
    if(/^\d{4}-\d{2}-\d{2}$/.test(any)) return any;
    const d = new Date(any); if(!isNaN(d)) return dateStr(d);
  }
  if(any instanceof Date){
    const y = any.getFullYear(), m = String(any.getMonth()+1).padStart(2,'0'), d = String(any.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  return todayStr();
}
function num(obj, keys){
  for(const k of keys){
    const v = obj?.[k];
    if(typeof v==='number' && !isNaN(v)) return v;
    if(typeof v==='string' && v.trim()!=='' && !isNaN(+v)) return +v;
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
  items = items.filter(it => dateStr(it?.date ?? it?.day ?? it?.createdAt ?? it?.timestamp) === today);

  let P=0,F=0,C=0,K=0;
  for(const it of items){
    if(it?.totals){
      P += +it.totals.protein || 0;
      F += +it.totals.fat     || 0;
      C += +it.totals.carbs   || 0;
      K += (+it.totals.kcal)  || 0;
    }else{
      P += num(it,["protein","prot","P","p"]);
      F += num(it,["fat","lipid","F","f"]);
      C += num(it,["carbs","carb","C","c","carbohydrate"]);
      K += num(it,["calories","kcal","cal","energy"]);
    }
  }
  return {P,F,C,K,count:items.length};
}
function loadStreak(){ return load(STREAK_KEY) || {}; }
function saveStreak(v){ save(STREAK_KEY, v||{}); }

function evaluate(){
  const {P,F,C,K,count} = collectMealsToday();
  const goal = getCalorieGoal();
  const awards = load(AWARD_D_PREFIX + todayKey()) || {};

  const okP = (P>=50 && P<=120);
  const okF = (F>=40 && F<=70);
  const okC = (C>=180 && C<=300);
  const okT = goal>0 ? Math.abs(K-goal) <= goal*0.10 : false;

  setQuestUI("protein", okP?'ready':'check');
  setQuestUI("fat",     okF?'ready':'check');
  setQuestUI("carb",    okC?'ready':'check');
  setQuestUI("total",   okT?'ready':'check');

  // バッジ表示（今日の集計）
  const badge = document.getElementById('nutritionBadge');
  badge.textContent = `今日の集計: P ${Math.round(P)}g / F ${Math.round(F)}g / C ${Math.round(C)}g / ${Math.round(K)}kcal（目標 ${goal}kcal）・記録 ${count}件`;

  // 初回達成時にXP付与
  for(const q of QUESTS){
    const hit = (q.id==="protein"&&okP)||(q.id==="fat"&&okF)||(q.id==="carb"&&okC)||(q.id==="total"&&okT);
    if(hit && !awards[q.id]){
      let gain = q.xp;
      if(q.streak){
        const st = loadStreak();
        const y = new Date(); y.setDate(y.getDate()-1);
        const yStr = dateStr(y);
        st.count = (st.last===yStr) ? (st.count||0)+1 : 1;
        st.last = todayStr(); saveStreak(st);
        gain += Math.min(3, st.count)*10;
        addLog(`🎯 目標達成ストリーク：${st.count}日`);
      }
      setXP(gain, `クエスト「${q.name}」`);
      awards[q.id] = true;
      save(AWARD_D_PREFIX + todayKey(), awards);
      setQuestUI(q.id,'done');
    }
  }
}

/* ===== 初期化 ===== */
function init(){
  renderQuests();
  refreshHeader();
  evaluate();

  // 吹き出しを数秒後にフェードアウト
// ---- 吹き出しサイズを初期文言の大きさで固定 ----
function lockSpeechSize() {
  const el = document.getElementById('speech');
  if (!el) return;
  // 自動サイズで一度レイアウト
  const prevW = el.style.width, prevH = el.style.height;
  el.style.width = ''; el.style.height = '';
  requestAnimationFrame(() => {
    const w = Math.ceil(el.offsetWidth);
    const h = Math.ceil(el.offsetHeight);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  });
}

// ---- 文言だけ差し替える（サイズは固定のまま）----
function setSpeechText(text) {
  const el = document.getElementById('speech');
  if (!el) return;
  el.style.opacity = 0;
  setTimeout(() => {
    el.textContent = text;
    el.style.opacity = 1;
  }, 150);
}


// 交代させたい台詞たち（自由に追加OK）
const SPEECH_LINES = [
  "今日のPFCバランス、いい感じ？",
  "お水を一杯どうぞ💧",
  "写真を撮って記録しよ📷",
  "ストレッチでリフレッシュ🧘",
  "たんぱく質は意識できた？🍗"
];

let spIndex = 0;
function rotateSpeech() {
  if (!speech) return;
  spIndex = (spIndex + 1) % SPEECH_LINES.length;
  speech.style.opacity = 0;
  setTimeout(() => {
    speech.textContent = SPEECH_LINES[spIndex];
    speech.style.opacity = 1;
  }, 220); // フェード時間と合わせる
}

 function init(){
   renderQuests();
   refreshHeader();
   evaluate();

+  // 初期文言の見た目サイズで吹き出しを固定
+  lockSpeechSize();

   // 動作トリガ
   window.addEventListener('focus', evaluate);
   window.addEventListener('storage', (e)=>{
     ...
   });
   setInterval(evaluate, 10000);
 }


// 9秒ごとに台詞変更（好みで調整）
setInterval(rotateSpeech, 9000);


  // 動作トリガ
  window.addEventListener('focus', evaluate);
  window.addEventListener('storage', (e)=>{
    if(!e.key) return;
    const keys = ["bisyokuka_meals_v2","mealEntries","meals","mealRecords","bisyokuka_meals","mealList","mealData","meals_today","bs_meals","mealHistory",
                  "calorieGoal","calorieTarget","bisyokuka_calorie_goal","settings","userSettings","bs_settings"];
    if (keys.includes(e.key)) evaluate();
  });
  setInterval(evaluate, 10000);
}

init();


