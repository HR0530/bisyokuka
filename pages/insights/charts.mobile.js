// ====== meal の保存形式から集計 ======
const meals = JSON.parse(localStorage.getItem("bisyokuka_meals_v2") || "[]");

function groupByDate(meals){
  const g = {};
  for(const m of meals){
    const d = (m.date || "").slice(0,10);
    if(!d) continue;
    const t = m.totals || { protein:0, fat:0, carbs:0, kcal:Number(m.kcal||0) };
    g[d] ??= { kcal:0, protein:0, fat:0, carbs:0 };
    g[d].kcal   += Number(t.kcal   || 0);
    g[d].protein+= Number(t.protein|| 0);
    g[d].fat    += Number(t.fat    || 0);
    g[d].carbs  += Number(t.carbs  || 0);
  }
  return g;
}
const grouped = groupByDate(meals);

function lastNDatesAsc(n){
  const res = [];
  const today = new Date();
  for(let i=n-1;i>=0;i--){
    const d = new Date(today); d.setDate(today.getDate()-i);
    res.push(d.toISOString().slice(0,10));
  }
  return res; // 古い→新しい
}

// 共通オプション（スマホ向けに凡例小さめ）
const commonOpts = {
  maintainAspectRatio: false,
  plugins:{
    legend:{ position:'bottom', labels:{ color:'#e5e7eb', boxWidth:14, boxHeight:14, font:{ size:11 } } },
    tooltip:{
      backgroundColor:'rgba(255,255,255,0.9)',
      titleColor:'#111827', bodyColor:'#111827',
      borderColor:'#e5e7eb', borderWidth:1
    }
  },
  scales:{
    x:{ ticks:{ color:'#e5e7eb', font:{ size:11 } }, grid:{ color:'rgba(255,255,255,.06)' } },
    y:{ ticks:{ color:'#e5e7eb', font:{ size:11 } }, grid:{ color:'rgba(255,255,255,.06)' } }
  }
};

// ====== 今日（円＋棒）======
function drawToday(){
  const todayKey = new Date().toISOString().slice(0,10);
  const t = grouped[todayKey] || {kcal:0,protein:0,fat:0,carbs:0};

  // 円グラフ
  new Chart(document.getElementById("chartTodayPFC").getContext("2d"), {
    type: 'doughnut',
    data: {
      labels: ['たんぱく質','脂質','炭水化物'],
      datasets: [{
        data: [t.protein, t.fat, t.carbs],
        backgroundColor: ['#34d399','#fbbf24','#60a5fa'],
        borderWidth: 0
      }]
    },
    options: {
      ...commonOpts,
      cutout: '55%',
      plugins: {
        ...commonOpts.plugins,
        tooltip:{
          ...commonOpts.plugins.tooltip,
          callbacks:{
            label:(c)=>{
              const v = Number(c.raw)||0;
              const total = (t.protein+t.fat+t.carbs)||1;
              const pct = (v/total*100).toFixed(1);
              return `${c.label}: ${v} g (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // 棒グラフ（量）
  new Chart(document.getElementById("chartTodayPFCBar").getContext("2d"), {
    type:'bar',
    data:{
      labels:['たんぱく質','脂質','炭水化物'],
      datasets:[{
        label:'量 (g)',
        data:[t.protein, t.fat, t.carbs],
        backgroundColor:['#34d399','#fbbf24','#60a5fa'],
        borderWidth:0
      }]
    },
    options:{ ...commonOpts, plugins:{ ...commonOpts.plugins, legend:{ display:false } } }
  });
}

// ====== 直近7日 ======
function draw7days(){
  const d7 = lastNDatesAsc(7);
  const kcal7 = d7.map(d => grouped[d]?.kcal || 0);
  const p7    = d7.map(d => grouped[d]?.protein || 0);
  const f7    = d7.map(d => grouped[d]?.fat || 0);
  const c7    = d7.map(d => grouped[d]?.carbs || 0);

  // 総カロリー
  new Chart(document.getElementById("chartKcal7").getContext("2d"), {
    type:'bar',
    data:{
      labels:d7,
      datasets:[{ label:'カロリー(kcal)', data:kcal7, backgroundColor:'#0ea5e9', borderWidth:0 }]
    },
    options:{ ...commonOpts }
  });

  // P/F/C スタック
  new Chart(document.getElementById("chartPFC7").getContext("2d"), {
    type:'bar',
    data:{
      labels:d7,
      datasets:[
        { label:'たんぱく質(g)', data:p7, backgroundColor:'#34d399', borderWidth:0 },
        { label:'脂質(g)',       data:f7, backgroundColor:'#fbbf24', borderWidth:0 },
        { label:'炭水化物(g)',   data:c7, backgroundColor:'#60a5fa', borderWidth:0 },
      ]
    },
    options:{
      ...commonOpts,
      scales:{
        x:{ stacked:true, ticks:{ color:'#e5e7eb', font:{ size:11 } }, grid:{ color:'rgba(255,255,255,.06)' } },
        y:{ stacked:true, ticks:{ color:'#e5e7eb', font:{ size:11 } }, grid:{ color:'rgba(255,255,255,.06)' } }
      }
    }
  });
}

// ====== すべて展開/畳む ======
const expandAllBtn = document.getElementById('expandAll');
const collapseAllBtn = document.getElementById('collapseAll');
const detailsEls = () => Array.from(document.querySelectorAll('#chartsPanel details'));
expandAllBtn.addEventListener('click', () => detailsEls().forEach(d => d.open = true));
collapseAllBtn.addEventListener('click', () => detailsEls().forEach(d => d.open = false));

// 初期描画
drawToday();
draw7days();
