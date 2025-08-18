// ===== 設定 =====
const STORAGE_MEALS = "bisyokuka_meals_v2";
const STORAGE_DEX   = "dex_state"; // { unlocked: {id:true,...}, xp: number, level: number }
const XP_MAX_BASE   = 100;

// ===== ユーティリティ =====
const fmt = n => new Intl.NumberFormat("ja-JP",{maximumFractionDigits:0}).format(n);
const todayKey = () => new Date().toISOString().slice(0,10);
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

function loadMeals(){ try{ return JSON.parse(localStorage.getItem(STORAGE_MEALS)||"[]"); }catch{ return []; } }
function saveDex(state){ localStorage.setItem(STORAGE_DEX, JSON.stringify(state)); }
function loadDex(){
  try{
    const d = JSON.parse(localStorage.getItem(STORAGE_DEX)||"{}");
    return { unlocked: d.unlocked||{0:true}, xp: d.xp||0, level: d.level||1 };
  }catch{
    return { unlocked:{0:true}, xp:0, level:1 };
  }
}

// ===== 今日の栄養合計 =====
function sumToday(){
  const meals = loadMeals().filter(m => (m.date||"").startsWith(todayKey()));
  return meals.reduce((a,m)=>({
    kcal:  a.kcal  + (Number(m.totals?.kcal)||0),
    p:     a.p     + (Number(m.totals?.protein)||0),
    f:     a.f     + (Number(m.totals?.fat)||0),
    c:     a.c     + (Number(m.totals?.carbs)||0),
    count: a.count + 1
  }), {kcal:0,p:0,f:0,c:0,count:0});
}

// ===== 成長（バランス判定→EXP） =====
// 目安: P:体重×1.0~1.5, F:20~70g, C:150~300g くらいをざっくり最適域に
function computeDailyXP(sum){
  if(sum.count===0) return {xp:0, comment:"まずは1食記録してみよう！"};
  let xp = 10; // 記録ボーナス
  let tips = [];
  // バランス評価（かなりざっくり）
  if(sum.p >= 50 && sum.p <= 120){ xp += 20; } else tips.push("たんぱく質を50–120gに");
  if(sum.f >= 20 && sum.f <= 70){  xp += 20; } else tips.push("脂質を20–70gに");
  if(sum.c >= 150 && sum.c <= 300){xp += 20; } else tips.push("炭水化物を150–300gに");

  // カロリー超過/不足ペナルティ軽く
  if(sum.kcal >= 1400 && sum.kcal <= 2600){ xp += 15; } else tips.push("総カロリーを1400–2600kcalに");

  // 3食以上でボーナス
  if(sum.count >= 3) xp += 15;

  const comment = tips.length ? `今日は${tips[0]}近づけると育成が進むよ！` : "バランス良いね、その調子！";
  return { xp: clamp(xp, 0, 90), comment };
}

// ===== レベル・称号 =====
function xpMaxFor(level){ return XP_MAX_BASE + (level-1)*20; }
function titleFor(level){
  if(level>=20) return "伝説の美食家";
  if(level>=15) return "究極の食通";
  if(level>=10) return "一流フーディー";
  if(level>=6)  return "健やかグルメ";
  if(level>=3)  return "期待の新人";
  return "見習いフーディー";
}

// ===== UI参照 =====
const els = {
  xpFill: document.getElementById("xpFill"),
  xpNow:  document.getElementById("xpNow"),
  xpMax:  document.getElementById("xpMax"),
  level:  document.getElementById("levelNum"),
  title:  document.getElementById("titleText"),
  speech: document.getElementById("speech"),
  sprite: document.getElementById("sprite"),
  quests: document.getElementById("quests"),
  challenges: document.getElementById("challenges"),
  refreshQuests: document.getElementById("refreshQuests"),
};

// ===== スプライトアニメ（3コマ×4方向） =====
const FRAME_W = 32, FRAME_H = 32;
let frame=0, dir=0; // 0:下,1:左,2:右,3:上
function updateSpriteBackground(){
  // スプライト原寸は 96x128（3×4）。表示はCSSで2倍に拡大。
  const x = -FRAME_W * frame;
  const y = -FRAME_H * dir;
  els.sprite.style.backgroundPosition = `${x}px ${y}px`;
}
function loop(){
  frame = (frame+1)%3;
  updateSpriteBackground();
  requestAnimationFrame(()=> setTimeout(loop, 220));
}
updateSpriteBackground();
loop();

// 方向切替（セリフのたびにちょっと向きを変える）
function nudgeDir(){ dir = (dir+1)%4; updateSpriteBackground(); }

// ===== クエスト生成（今日の合計ベース） =====
function buildQuests(sum){
  const qs = [];
  qs.push({
    text:`たんぱく質を 70g 以上にする（現在 ${fmt(sum.p)}g）`,
    done: sum.p >= 70
  });
  qs.push({
    text:`脂質を 70g 未満にする（現在 ${fmt(sum.f)}g）`,
    done: sum.f < 70
  });
  qs.push({
    text:`炭水化物を 180g 以上にする（現在 ${fmt(sum.c)}g）`,
    done: sum.c >= 180
  });
  qs.push({
    text:`3食以上 記録する（現在 ${sum.count} 食）`,
    done: sum.count >= 3
  });
  return qs;
}
function renderQuests(qs){
  els.quests.innerHTML = "";
  for(const q of qs){
    const li = document.createElement("li");
    li.className = "quest-item";
    li.innerHTML = `
      <span>${q.text}</span>
      <span class="badge ${q.done?'ok':'warn'}">${q.done?'達成':'未達'}</span>
    `;
    els.quests.appendChild(li);
  }
}

// ===== チャレンジ（実績） =====
function buildChallenges(){
  const meals = loadMeals();
  const days = new Set(meals.map(m => (m.date||"").slice(0,10)));
  const kinds = new Set(meals.map(m => m.food||""));

  return [
    { text:`通算 10 食 記録`, done: meals.length>=10 },
    { text:`通算 30 食 記録`, done: meals.length>=30 },
    { text:`ユニーク料理 10 種`, done: kinds.size>=10 },
    { text:`7 日連続 記録`,     done: consecutiveDays(meals)>=7 },
  ];
}
function consecutiveDays(meals){
  const set = new Set(meals.map(m => (m.date||"").slice(0,10)));
  let streak=0;
  let d = new Date();
  while(set.has(d.toISOString().slice(0,10))){
    streak++; d.setDate(d.getDate()-1);
  }
  return streak;
}
function renderChallenges(cs){
  els.challenges.innerHTML = "";
  for(const c of cs){
    const li = document.createElement("li");
    li.className = "challenge-item";
    li.innerHTML = `
      <span>${c.text}</span>
      <span class="badge ${c.done?'ok':'warn'}">${c.done?'達成':'未達'}</span>
    `;
    els.challenges.appendChild(li);
  }
}

// ===== 図鑑連動（解放） =====
function maybeUnlockByProgress(state){
  const meals = loadMeals();
  const kinds = new Set(meals.map(m => m.food||""));
  // 例: ユニーク料理 5/10/20/30 で 4,8,16,24 番を解放
  const unlocks = [
    { need:5,  id:4 },
    { need:10, id:8 },
    { need:20, id:16 },
    { need:30, id:24 },
  ];
  for(const u of unlocks){
    if(kinds.size>=u.need) state.unlocked[u.id]=true;
  }
  saveDex(state);
}

// ===== 初期化 =====
function init(){
  const state = loadDex();
  const sum = sumToday();
  const {xp, comment} = computeDailyXP(sum);

  // XP反映（1日1回の概念は簡易化：ページロード時に仮加算）
  state.xp += xp;
  while(state.xp >= xpMaxFor(state.level)){
    state.xp -= xpMaxFor(state.level);
    state.level++;
  }
  saveDex(state);
  maybeUnlockByProgress(state);

  // ゲージ/称号
  const max = xpMaxFor(state.level);
  document.getElementById("xpMax").textContent = max;
  document.getElementById("xpNow").textContent = state.xp;
  document.getElementById("levelNum").textContent = state.level;
  document.getElementById("titleText").textContent = titleFor(state.level);
  const pct = Math.round(state.xp / max * 100);
  document.getElementById("xpFill").style.width = `${pct}%`;

  // セリフ
  els.speech.textContent = comment;
  nudgeDir();

  // クエスト/チャレンジ
  renderQuests(buildQuests(sum));
  renderChallenges(buildChallenges());

  // 更新ボタン
  els.refreshQuests.addEventListener("click", ()=>{
    const s = sumToday();
    renderQuests(buildQuests(s));
    els.speech.textContent = computeDailyXP(s).comment;
    nudgeDir();
  });
}

init();
