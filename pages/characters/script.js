// ===== スプライト基本設定 =====
const SPRITE_SRC = "./project-root/男_スーツ1.png"; // 好きなキャラPNGに差し替え可
const FRAME_W = 32, FRAME_H = 32;
const ROW_FRONT = 0, ROW_LEFT = 1, ROW_RIGHT = 2, ROW_BACK = 3;
const COL_LEFT = 0, COL_CENTER = 1, COL_RIGHT = 2;

// DOM
const cvs = document.getElementById("charCanvas");
const ctx = cvs.getContext("2d");
const speech = document.getElementById("speech");
const gaugeBar = document.getElementById("gaugeBar");
const gaugePct = document.getElementById("gaugePct");
const gaugeNote = document.getElementById("gaugeNote");

// 画像
const img = new Image();
img.src = SPRITE_SRC;

// 描画
function clear(){ ctx.clearRect(0,0,cvs.width,cvs.height);
  ctx.save();ctx.fillStyle="rgba(0,0,0,.35)";
  ctx.beginPath();ctx.ellipse(cvs.width/2,cvs.height*0.82,cvs.width*0.26,cvs.height*0.06,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawFrame(row,col,scale=4){
  const sx = col*FRAME_W, sy=row*FRAME_H;
  const dw=FRAME_W*scale, dh=FRAME_H*scale;
  const dx=(cvs.width-dw)/2, dy=(cvs.height-dh)/2+6;
  ctx.drawImage(img,sx,sy,FRAME_W,FRAME_H,dx,dy,dw,dh);
}
function setFrame(r,c){ clear(); drawFrame(r,c); }

// ===== アニメ（前回と同じ）=====
let animRAF=0, nowMode="idle", idleTick=0, sideTimer=null;
function loop(){
  idleTick++;
  if(nowMode==="idle"){
    const frame = Math.floor((idleTick/21))%3;
    const yShift = Math.sin(idleTick/18)*2;
    clear(); ctx.save(); ctx.translate(0,yShift*0.6);
    drawFrame(ROW_FRONT,[COL_LEFT,COL_CENTER,COL_RIGHT][frame]); ctx.restore();
  }
  animRAF=requestAnimationFrame(loop);
}
function sideWalkOnce(){
  if(nowMode!=="idle")return;
  nowMode="side";
  const isLeft=Math.random()<.5, row=isLeft?ROW_LEFT:ROW_RIGHT;
  const seq=[COL_LEFT,COL_CENTER,COL_RIGHT,COL_CENTER];
  let i=0; const stepMs=180;
  const run=()=>{ if(i>=seq.length){ nowMode="idle"; setFrame(ROW_FRONT,COL_CENTER); return;}
    setFrame(row,seq[i]); i++; sideTimer=setTimeout(run,stepMs); };
  run();
}
function scheduleSide(){ setTimeout(()=>{ sideWalkOnce(); scheduleSide(); }, (6+Math.random()*6)*1000); }

// ===== しゃべる =====
const lines=[
  "今日のPFCバランス、いい感じ？",
  "たんぱく質 50–120g を目安に！",
  "脂質は 40–70g がちょうどいいよ。",
  "炭水化物は 180–300g をキープ！",
  "総kcalは目標±10%に収めてみよう！",
];
function say(){ speech.textContent = lines[Math.floor(Math.random()*lines.length)];
  setTimeout(say,8000); }

// ===== ゲージ算出（今日の食事から）=====
function loadMeals(){ try{return JSON.parse(localStorage.getItem("bisyokuka_meals_v2")||"[]")}catch{return[]}}
function sumToday(meals){
  const key=new Date().toISOString().slice(0,10);
  const s={kcal:0,protein:0,fat:0,carbs:0};
  for(const m of meals){ const d=(m.date||"").slice(0,10);
    if(d!==key) continue;
    s.kcal+=+m.totals?.kcal||0; s.protein+=+m.totals?.protein||0;
    s.fat+=+m.totals?.fat||0; s.carbs+=+m.totals?.carbs||0;
  } return s;
}
function scoreRange(v,lo,hi){
  if(v===0) return 0; if(v>=lo&&v<=hi) return 100;
  const maxDev=(hi-lo)*0.75, dev=Math.abs(v - Math.min(Math.max(v,lo),hi));
  return Math.max(0, Math.round(80*(1-dev/(maxDev||1))));
}
function updateGauge(){
  const t=sumToday(loadMeals());
  const goal=+(localStorage.getItem("calorieGoal")||1580);
  const sP=scoreRange(t.protein,50,120);
  const sF=scoreRange(t.fat,40,70);
  const sC=scoreRange(t.carbs,180,300);
  const dev=Math.abs(t.kcal-goal)/(goal||1);
  const sK=Math.max(0, Math.round(100*(1-(dev-0.10)/0.20)));
  const pct=Math.round((sP+sF+sC+sK)/4);
  gaugeBar.style.width=pct+"%"; gaugePct.textContent=pct+"%";
  gaugeNote.textContent = pct>=90?"最高！今日は完璧なバランス！":
    pct>=70?"とても良い！あと少し整えよう":
    pct>=40?"ほどよい。もう一品でバランスUP":"まずは1食記録してみよう！";
  if(t.kcal>0) speech.textContent=`合計 ${t.kcal|0}kcal / P${t.protein|0} F${t.fat|0} C${t.carbs|0}`;
}

// 起動
img.onload=()=>{ setFrame(ROW_FRONT,COL_CENTER); loop(); scheduleSide(); say(); updateGauge(); };
