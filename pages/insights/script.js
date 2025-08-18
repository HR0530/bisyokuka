// ===== insights script.js =====
const STORAGE_KEY = "bisyokuka_meals_v2";

const jp = new Intl.NumberFormat("ja-JP");
const byDay = (iso) => (iso || "").slice(0,10);

// ---- データ取得＆整形 ----
function loadMeals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function isoTodayLocal() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function groupDaily(meals) {
  const map = new Map();
  for (const m of meals) {
    const k = byDay(m.date);
    if (!k) continue;
    const kcal = Number(m?.totals?.kcal ?? m?.kcal ?? 0);
    const p = Number(m?.totals?.protein ?? 0);
    const f = Number(m?.totals?.fat ?? 0);
    const c = Number(m?.totals?.carbs ?? 0);
    if (!map.has(k)) map.set(k, { kcal:0, p:0, f:0, c:0, count:0 });
    const v = map.get(k);
    v.kcal += kcal; v.p += p; v.f += f; v.c += c; v.count += 1;
  }
  return map; // key: YYYY-MM-DD
}

function getRangeDates(days) {
  const arr = [];
  const end = new Date(); // 今日含む
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
    arr.push(`${y}-${m}-${dd}`);
  }
  return arr;
}

// ---- KPI計算 ----
function calcKPI(meals) {
  const goal = parseInt(localStorage.getItem("calorieGoal")) || 1580;
  const todayKey = isoTodayLocal();
  const todaySum = meals
    .filter(m => byDay(m.date) === todayKey)
    .reduce((a,m)=> a + Number(m?.totals?.kcal ?? m?.kcal ?? 0), 0);

  // 連続達成（直近からさかのぼり、目標±10%内を達成とみなす例）
  const daily = groupDaily(meals);
  let streak = 0;
  for (let i=0;;i++){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!daily.has(k)) break;
    const kcal = daily.get(k).kcal;
    const ok = goal > 0 ? (kcal >= goal*0.9 && kcal <= goal*1.1) : kcal > 0;
    if (ok) streak++; else break;
    if (i > 365) break;
  }
  return { goal, todaySum, streak };
}

// ---- チャート描画 ----
let calorieChart, pfcDonut, pfcStacked;

function drawAll(rangeDays) {
  const meals = loadMeals();
  const days = getRangeDates(rangeDays);
  const daily = groupDaily(meals);
  const labels = days.map(d => d.slice(5)); // MM-DD

  // カロリー系列＆目標線
  const kcalData = days.map(d => daily.get(d)?.kcal ?? 0);
  const goal = parseInt(localStorage.getItem("calorieGoal")) || 1580;
  const goalData = new Array(days.length).fill(goal);

  // P/F/C 系列
  const pData = days.map(d => daily.get(d)?.p ?? 0);
  const fData = days.map(d => daily.get(d)?.f ?? 0);
  const cData = days.map(d => daily.get(d)?.c ?? 0);

  // 平均PFC（ドーナツ）
  const sumP = pData.reduce((a,b)=>a+b,0);
  const sumF = fData.reduce((a,b)=>a+b,0);
  const sumC = cData.reduce((a,b)=>a+b,0);
  const avgP = sumP / (rangeDays || 1);
  const avgF = sumF / (rangeDays || 1);
  const avgC = sumC / (rangeDays || 1);

  // 既存チャート破棄
  for (const ch of [calorieChart, pfcDonut, pfcStacked]) { if (ch) ch.destroy?.(); }

  // 1) カロリーチャート（棒 + 目標の実線）
  const ctx1 = document.getElementById("calorieChart");
  calorieChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "kcal", data: kcalData, borderWidth: 1 },
        { label: "目標", data: goalData, type: "line", pointRadius: 0, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e5e7eb" } } },
      scales: {
        x: { ticks: { color:"#cbd5e1" }, grid: { color:"rgba(255,255,255,.08)"} },
        y: { ticks: { color:"#cbd5e1" }, grid: { color:"rgba(255,255,255,.08)"} }
      }
    }
  });

  // 2) PFCドーナツ（平均）
  const ctx2 = document.getElementById("pfcDonut");
  pfcDonut = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: ["Protein(g)", "Fat(g)", "Carbs(g)"],
      datasets: [{ data: [avgP, avgF, avgC] }]
    },
    options: {
      plugins: { legend: { labels: { color: "#e5e7eb" } } }
    }
  });

  // 3) P/F/C 推移（積み上げ棒）
  const ctx3 = document.getElementById("pfcStacked");
  pfcStacked = new Chart(ctx3, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"P", data:pData, stack:"pfc" },
        { label:"F", data:fData, stack:"pfc" },
        { label:"C", data:cData, stack:"pfc" }
      ]
    },
    options: {
      plugins: { legend:{ labels:{ color:"#e5e7eb" } } },
      responsive:true,
      scales:{
        x:{ stacked:true, ticks:{ color:"#cbd5e1" }, grid:{ color:"rgba(255,255,255,.08)"} },
        y:{ stacked:true, ticks:{ color:"#cbd5e1" }, grid:{ color:"rgba(255,255,255,.08)"} }
      }
    }
  });

  // KPI
  const { goal: g, todaySum, streak } = calcKPI(meals);
  const kpiBar = document.getElementById("kpiBar");
  const pct = g ? Math.round(Math.min(100, (todaySum/g)*100)) : 0;
  kpiBar.innerHTML = `
    <div class="pill">今日: <b>${jp.format(todaySum)}</b> kcal</div>
    <div class="pill">目標: <b>${jp.format(g)}</b> kcal</div>
    <div class="pill">達成率: <b>${pct}%</b></div>
    <div class="pill">連続達成: <b>${streak}</b> 日</div>
  `;
}

// ---- イベント ----
document.addEventListener("DOMContentLoaded", () => {
  // デフォルト7日
  drawAll(7);

  // レンジ切替
  const btn7 = document.getElementById("btn7");
  const btn30 = document.getElementById("btn30");
  btn7.addEventListener("click", () => {
    btn7.classList.add("active"); btn30.classList.remove("active");
    drawAll(7);
  });
  btn30.addEventListener("click", () => {
    btn30.classList.add("active"); btn7.classList.remove("active");
    drawAll(30);
  });

  // 他タブ更新にも追従
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) drawAll(document.getElementById("btn30").classList.contains("active") ? 30 : 7);
  });
  // タブ復帰時にも更新
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      drawAll(document.getElementById("btn30").classList.contains("active") ? 30 : 7);
    }
  });
});
