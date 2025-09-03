/* ========= 図鑑パス解決 & 解放 ========= */
function resolveDexPath(){
  const p = location.pathname;
  if (p.includes('/pages/characters/secret/')) return '../../dex/index.html';
  if (p.includes('/pages/characters/'))        return 'dex/index.html';
  if (p.includes('/pages/'))                   return 'characters/dex/index.html';
  return '/pages/characters/dex/index.html';
}
['backBtn','backBtn2'].forEach(id=>{
  const a=document.getElementById(id); if(!a) return;
  const href=resolveDexPath(); a.setAttribute('href',href);
  a.addEventListener('click',(e)=>{ e.preventDefault(); location.href=href; });
});

function unlock70(){
  if (typeof unlockSecret==='function'){ unlockSecret(70,'secret_70.png'); return; }
  // フォールバック
  const DEX_KEY='dex_state_v1', id=69; // 0始まり: 70→69
  const dex=JSON.parse(localStorage.getItem(DEX_KEY)||'{}');
  dex.unlocked=Object.assign({},dex.unlocked,{[id]:true});
  dex.secretFiles=Object.assign({},dex.secretFiles,{[String(id)]:'secret_70.png'});
  if(!dex.selected) dex.selected='secret_70.png';
  localStorage.setItem(DEX_KEY, JSON.stringify(dex));
  try{ window.dispatchEvent(new StorageEvent('storage',{key:DEX_KEY,newValue:JSON.stringify(dex)})); }catch(_){}
}

/* ========= スクロール抑止 ========= */
window.addEventListener('keydown',(e)=>{
  const k=e.code;
  if (k==='ArrowUp'||k==='ArrowDown'||k==='ArrowLeft'||k==='ArrowRight'||k==='Space') e.preventDefault();
},{passive:false});

/* ========= Canvas & UI ========= */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const timeEl   = document.getElementById('time');
const stageEl  = document.getElementById('stage');
const condEl   = document.getElementById('cond');
const ov       = document.getElementById('ov');
const ovMsg    = document.getElementById('ovMsg');
const ovSub    = document.getElementById('ovSub');

function fitCanvas(){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  const w=cv.clientWidth, h=cv.clientHeight;
  cv.width=Math.floor(w*dpr); cv.height=Math.floor(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', ()=>{ fitCanvas(); if (!playing) draw(); }, {passive:true});
fitCanvas();

/* ========= 入力 ========= */
const keys={left:false,right:false,jump:false};
document.addEventListener('visibilitychange',()=>{ paused=document.hidden; });
window.addEventListener('keydown',(e)=>{ if(e.repeat) return;
  if(e.code==='ArrowLeft'||e.code==='KeyA') keys.left=true;
  if(e.code==='ArrowRight'||e.code==='KeyD') keys.right=true;
  if(e.code==='Space') keys.jump=true;
});
window.addEventListener('keyup',(e)=>{
  if(e.code==='ArrowLeft'||e.code==='KeyA') keys.left=false;
  if(e.code==='ArrowRight'||e.code==='KeyD') keys.right=false;
  if(e.code==='Space') keys.jump=false;
});

/* ========= 基本パラメータ ========= */
function U(){ return Math.max(18, Math.min(42, cv.clientHeight/22)); }
const PWk=1.2, PHk=1.8;
const G=1650, MOVE=340, JUMP_V=-540, COYOTE=0.09, FRICTION=0.9;
function PW(){ return U()*PWk; } function PH(){ return U()*PHk; }
function PR(){ return {x:px,y:py,w:PW(),h:PH()}; }
function overlap(a,b){ return !(a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h); }

/* ========= ゲーム状態 ========= */
let playing=false, paused=false, raf=0;
let stageIdx=1, totalTime=0, stageTime=0;
let camX=0, worldW=2000;
let last=0, stageStartAt=0, globalStartAt=0;
let px=0, py=0, vx=0, vy=0, onGround=false, coyote=0;

// エンティティ
let platforms=[], tiles=[], lasers=[], coins=[], spikes=[], goal=null;
let runner=null, survival=null;

function clearEntities(){ platforms=[]; tiles=[]; lasers=[]; coins=[]; spikes=[]; goal=null; runner=null; survival=null; }
function setCond(t){ condEl.textContent=t; }

/* ========= ステージビルド ========= */
// Runner
function buildRunner({sec=8, coinsNeed=10, speed=260, endSpeed=420}){
  clearEntities(); camX=0;
  const gy = cv.clientHeight - U()*2;
  platforms.push({x:0,y:gy,w:999999,h:U()*0.9,type:'ground'});
  runner={timeNeed:sec, coinNeed:coinsNeed, scrollVX:speed, endSpeed, spawnTimer:0};
  px=U()*3; py=gy-PH(); vx=vy=0; onGround=true; coyote=0;
  worldW=999999;
  setCond(`条件：${sec}s 生存 ＋ コイン ${coinsNeed}枚`);
}
function spawnRunnerPack(k=1){
  const gy = cv.clientHeight - U()*2;
  if (Math.random()<0.5){
    const w=U()*(1.2+Math.random()*1.2), hh=U()*(1.1+Math.random()*2.2);
    platforms.push({x:camX+cv.clientWidth+U()*1.2,y:gy-hh,w,h:hh,type:'wall'});
    if (Math.random()<0.7) coins.push({x:camX+cv.clientWidth+U()*1.2+w/2, y:gy-hh-U()*1.2, r:U()*0.45,taken:false});
  }else{
    const w=U()*(1.8+Math.random()*1.8);
    spikes.push({x:camX+cv.clientWidth+U()*1.2,y:gy-U()*0.8,w,h:U()*0.8,type:'spike'});
    coins.push({x:camX+cv.clientWidth+U()*0.9, y:gy-U()*2.4, r:U()*0.45,taken:false});
    if (Math.random()<0.5) coins.push({x:camX+cv.clientWidth+U()*1.2+w*0.7, y:gy-U()*2.6, r:U()*0.45,taken:false});
  }
}

// Tiles
const SAFE_BASE=0.54, BONUS_C=0.12, BONUS_A=0.08, PEN_V=0.18, VY_REF=760, BREAK_DELAY=0.35;
function observeTile(t){
  if (t.observed) return;
  const speed=Math.sqrt(vx*vx+vy*vy), horiz=Math.abs(vx)/(speed+1e-6);
  const cx=Math.abs((px+PW()/2)-(t.x+t.w/2)); const center=1-Math.min(1,cx/(t.w/2));
  let p=SAFE_BASE + center*BONUS_C + horiz*BONUS_A - Math.min(1,Math.abs(vy)/VY_REF)*PEN_V;
  p=Math.max(0.2, Math.min(0.9,p));
  t.observed=true;
  if (Math.random()<0.04){ t.safe=false; t.state='broken'; return; }
  t.safe=Math.random()<p;
  if(!t.safe){ t.state='crack'; t.breakAt=stageTime+BREAK_DELAY; t.shake=1; } else t.state='solid';
}
function buildTiles({cols=16}){
  clearEntities(); camX=0;
  const gy = cv.clientHeight - U()*2;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9};
  platforms.push(start);
  let baseX=start.x+start.w+U()*1.0;
  for(let i=0;i<cols;i++){
    const lane=(i%2===0)?0:1, tx=baseX+i*(U()*2.1+U()*1.0);
    const ty=gy - U()*(2.8 + lane*1.15 + Math.random()*0.7);
    tiles.push({x:tx,y:ty,w:U()*2.1,h:U()*0.75,observed:false,safe:null,breakAt:0,state:'unknown',shake:0});
  }
  const last=tiles[tiles.length-1];
  goal={x:last.x+U()*2.1+U()*1.2,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  const minX=start.x+start.w+U()*4, maxX=goal.x-U()*4, count=Math.max(1,Math.floor(cols/8));
  for(let i=0;i<count;i++){
    const y=gy-U()*(2.0+Math.random()*2.8), w=U()*0.35, spd=110+Math.random()*80, ph=Math.random();
    lasers.push({x:minX+(maxX-minX)*ph, y, w, h:cv.clientHeight, minX, maxX, spd:(Math.random()<0.5?-1:1)*spd});
  }
  px=start.x+start.w*0.5-PW()/2; py=start.y-PH(); vx=vy=0; onGround=true; coyote=0;
  worldW=goal.x+U()*6;
  setCond('条件：ゴール到達（量子床。割れる床は0.35s後に崩落）');
}

// Laser Maze
function buildLaserMaze({segments=3}){
  clearEntities(); camX=0;
  const gy=cv.clientHeight-U()*2;
  let x=U()*2, y=gy-U()*2.8;
  for(let i=0;i<segments;i++){
    const w=U()*(4.6+Math.random()*2.0);
    platforms.push({x,y,w,h:U()*0.9});
    const minX=x+U()*0.6, maxX=x+w-U()*0.6, ly=y-U()*(1.6+Math.random()*1.2);
    lasers.push({x:(minX+maxX)/2,y:ly,w:U()*0.35,h:U()*0.35,minX,maxX,spd:(Math.random()<0.5?-1:1)*(130+i*30+Math.random()*40),horiz:true});
    x+=w+U()*2.2; y=gy-U()*(2.0+Math.random()*4.0);
  }
  goal={x:x+U()*1.2,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  worldW=goal.x+U()*6;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9}; platforms.push(start);
  px=start.x+start.w*0.5-PW()/2; py=start.y-PH(); vx=vy=0; onGround=true; coyote=0;
  setCond('条件：ゴール到達（移動レーザー）');
}

// Survival
function buildSurvival({sec=10, withLaser=false}){
  clearEntities(); camX=0;
  const w=Math.max(cv.clientWidth, U()*28), h=cv.clientHeight, gy=h-U()*2;
  platforms.push({x:0,y:gy,w:999999,h:U()*0.9,type:'ground'});
  platforms.push({x:-U()*2,y:0,w:U()*2,h:999999});
  platforms.push({x: w+U()*2,y:0,w:U()*2,h:999999});
  survival={timeNeed:sec, spawnTimer:0, withLaser};
  if (withLaser){
    const minX=U()*2, maxX=w-U()*2, count=2;
    for(let i=0;i<count;i++){
      const lw=U()*0.35, spd=120+Math.random()*60, ph=Math.random();
      lasers.push({x:minX+(maxX-minX)*ph, y:0, w:lw, h:h, minX, maxX, spd:(Math.random()<0.5?-1:1)*spd});
    }
  }
  worldW=w;
  px=U()*4; py=gy-PH(); vx=vy=0; onGround=true; coyote=0;
  setCond(`条件：${sec}s 生存${withLaser?'（＋移動レーザー回避）':''}`);
}
function spawnFallingSpike(){
  const x=camX+Math.random()*cv.clientWidth+U()*2, w=U()*0.9, h=U()*0.9;
  spikes.push({x,y:-U()*2,w,h,vy:220+Math.random()*180});
}

// Precision
function buildPrecision(){
  clearEntities(); camX=0;
  const gy=cv.clientHeight-U()*2;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9}; platforms.push(start);
  let x=start.x+start.w+U()*1.2;
  for(let i=0;i<8;i++){
    const w=U()*(2.0+Math.random()*0.8), y=gy-U()*(2.4+(i%2?1.4:0.8)+Math.random()*1.0);
    platforms.push({x,y,w,h:U()*0.8});
    spikes.push({x,y:gy-U()*0.8,w,h:U()*0.8});
    if (i%2===1){
      const minX=x-U()*3.0, maxX=x+w+U()*1.0, ly=y-U()*1.0, spd=(Math.random()<0.5?-1:1)*(130+Math.random()*50);
      lasers.push({x:(minX+maxX)/2,y:ly,w:U()*0.35,h:U()*0.35,minX,maxX,spd,horiz:true});
    }
    x+=w+U()*2.4;
  }
  goal={x:x+U()*1.6,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  worldW=goal.x+U()*6;
  px=start.x+start.w/2-PW()/2; py=start.y-PH(); vx=vy=0; onGround=true; coyote=0;
  setCond('条件：ゴール到達（狭い足場＋移動レーザー＋下スパイク）');
}

// Gauntlet
function buildGauntlet(){
  clearEntities(); camX=0;
  const gy=cv.clientHeight-U()*2;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9}; platforms.push(start);
  let x=start.x+start.w+U()*1.2;

  // runner風
  for(let i=0;i<6;i++){
    const w=U()*(1.4+Math.random()*1.4), hh=U()*(1.2+Math.random()*2.2);
    platforms.push({x:x+i*(U()*3.2), y:gy-hh, w, h:hh});
    if (Math.random()<0.6) coins.push({x:x+i*(U()*3.2)+w/2, y:gy-hh-U()*1.6, r:U()*0.45, taken:false});
  }
  x+=U()*3.2*6+U()*2;

  // 量子床
  const cols=10;
  for(let i=0;i<cols;i++){
    const tx=x+i*(U()*2.1+U()*0.9), ty=gy-U()*(2.6+(i%2?1.2:0.6)+Math.random()*0.6);
    tiles.push({x:tx,y:ty,w:U()*2.1,h:U()*0.75,observed:false,safe:null,breakAt:0,state:'unknown',shake:0});
  }
  x+=(U()*2.1+U()*0.9)*cols+U()*2.0;

  // レーザー回廊
  for(let i=0;i<4;i++){
    const w=U()*(4.4+Math.random()*1.6), y=gy-U()*(2.0+Math.random()*3.0);
    platforms.push({x:x,y,w,h:U()*0.9});
    const minX=x+U()*0.6,maxX=x+w-U()*0.6, ly=y-U()*(1.4+Math.random()*1.0);
    lasers.push({x:(minX+maxX)/2,y:ly,w:U()*0.35,h:U()*0.35,minX,maxX,spd:(Math.random()<0.5?-1:1)*(140+Math.random()*40),horiz:true});
    x+=w+U()*2.0;
  }
  goal={x:x+U()*2.0,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  worldW=goal.x+U()*6;
  px=start.x+start.w/2-PW()/2; py=start.y-PH(); vx=vy=0; onGround=true; coyote=0;
  setCond('条件：ゴール到達（総合：Runner→量子床→レーザー）');
}

/* ステージ一覧（1..10） */
const STAGES=[
  ()=>buildRunner({sec:8,  coinsNeed:10, speed:260, endSpeed:400}),
  ()=>buildTiles({cols:16}),
  ()=>buildLaserMaze({segments:3}),
  ()=>buildSurvival({sec:10, withLaser:false}),
  ()=>buildRunner({sec:10, coinsNeed:15, speed:300, endSpeed:440}),
  ()=>buildTiles({cols:20}),
  ()=>buildLaserMaze({segments:5}),
  ()=>buildSurvival({sec:12, withLaser:true}),
  ()=>buildPrecision(),
  ()=>buildGauntlet(),
];

/* ========= 進行制御（←ここが“ステージが変わらない”対策の肝） ========= */
function startGame(){
  playing=true; paused=false; stageIdx=1; totalTime=0; stageTime=0; camX=0;
  globalStartAt=performance.now(); stageStartAt=globalStartAt; last=globalStartAt;
  STAGES[0](); stageEl.textContent=stageIdx; ov.style.display='none';
  cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
}

function nextStage(){
  stageIdx++;
  if (stageIdx>10){
    playing=false; cancelAnimationFrame(raf);
    unlock70();
    ovMsg.textContent='完全制覇！ #70 解放';
    ovSub.textContent='図鑑で選択できます。';
    ov.style.display='grid';
    return;
  }
  // ★ ステージ切替ごとにリセット（重要）
  stageTime=0;
  stageStartAt=performance.now();
  camX=0;
  STAGES[stageIdx-1]();
  stageEl.textContent=stageIdx;
}

/* ========= 失敗 ========= */
function fail(msg){
  playing=false; cancelAnimationFrame(raf);
  ovMsg.textContent='失敗…';
  ovSub.textContent=msg||'もう一度挑戦しよう';
  ov.style.display='grid';
}

/* ========= ループ ========= */
function loop(ts){
  if (!playing) return;
  if (!last) last=ts;
  const dt=Math.min(0.033, (ts-last)/1000); last=ts;
  if (paused){ raf=requestAnimationFrame(loop); return; }

  // タイム（合計／ステージ）
  stageTime = (ts - stageStartAt)/1000;
  totalTime = (ts - globalStartAt)/1000;
  timeEl.textContent = totalTime.toFixed(1);

  // 入力
  if (keys.left)  vx=-MOVE;
  if (keys.right) vx= MOVE;
  if (!keys.left && !keys.right) vx*=FRICTION;
  if (keys.jump){
    if (onGround || coyote>0){ vy=JUMP_V; onGround=false; coyote=0; }
    keys.jump=false;
  }

  // 重力 & 移動（Runnerのみ世界スクロール）
  vy+=G*dt;
  if (runner){
    const k=Math.min(1, stageTime/runner.timeNeed);
    const sc=runner.scrollVX+(runner.endSpeed-runner.scrollVX)*k;
    camX += sc*dt*0.75;
    runner.spawnTimer+=dt;
    const spawnInt=Math.max(0.55, 0.95-0.03*stageTime);
    if (runner.spawnTimer>=spawnInt){ runner.spawnTimer=0; spawnRunnerPack(k); }
    const flow=sc*dt;
    [platforms,spikes,coins].forEach(arr=>arr.forEach(o=>{ if(!o.static) o.x-=flow*0.25; }));
  }
  px+=vx*dt; py+=vy*dt;

  // 画面外
  if (py>cv.clientHeight+U()*4 || px<-U()*6 || px>worldW+U()*6){ fail('奈落に落ちた…'); return; }

  // 接地
  const P=PR(); onGround=false;
  platforms.forEach(p=>{
    const prevBottom=P.y+P.h - vy*dt;
    if (P.x+P.w>p.x && P.x<p.x+p.w){
      if (prevBottom<=p.y && P.y+P.h>=p.y){ py=p.y-P.h; vy=0; onGround=true; coyote=COYOTE; }
    }
  });

  // 量子床
  tiles.forEach(t=>{
    if (t.state==='broken') return;
    if (t.state==='crack' && stageTime>=t.breakAt){ t.state='broken'; return; }
    const prevBottom=P.y+P.h - vy*dt;
    if (P.x+P.w>t.x && P.x<t.x+t.w){
      if (prevBottom<=t.y && P.y+P.h>=t.y){
        observeTile(t);
        if (t.state!=='broken'){ py=t.y-P.h; vy=0; onGround=true; coyote=COYOTE; }
      }
    }
  });

  // コイン
  coins.forEach(c=>{
    if (c.taken) return;
    const dx=Math.abs(c.x-(P.x+P.w/2)), dy=Math.abs(c.y-(P.y+P.h/2));
    if (dx<(P.w/2+c.r) && dy<(P.h/2+c.r)) c.taken=true;
  });

  // レーザー（すべて移動式）
  for (const L of lasers){
    if (L.horiz){
      L.x+=L.spd*dt; if (L.x<L.minX){L.x=L.minX;L.spd*=-1;} if (L.x>L.maxX){L.x=L.maxX;L.spd*=-1;}
      const r={x:L.x-U()*0.2,y:L.y-U()*6,w:U()*0.4,h:U()*12};
      if (overlap(PR(),r)){ fail('レーザーに触れた…'); return; }
    }else{
      L.x+=L.spd*dt; if (L.x<L.minX){L.x=L.minX;L.spd*=-1;} if (L.x>L.maxX){L.x=L.maxX;L.spd*=-1;}
      const r={x:L.x-L.w/2,y:0,w:L.w,h:cv.clientHeight};
      if (overlap(PR(),r)){ fail('レーザーに触れた…'); return; }
    }
  }

  // スパイク
  for (const s of spikes){
    if (s.vy) s.y+=s.vy*dt;
    // 三角形だが矩形近似でOK（難化十分）
    const r={x:s.x, y:s.y, w:s.w, h:s.h};
    if (overlap(PR(),r)){ fail('トゲに当たった…'); return; }
  }

  // クリア判定
  if (survival && stageTime>=survival.timeNeed){ nextStage(); return; }
  if (runner){
    const need=runner.coinNeed, got=coins.filter(c=>c.taken).length;
    setCond(`条件：${runner.timeNeed}s 生存 ＋ コイン ${need}枚（現在 ${got}）`);
    if (stageTime>=runner.timeNeed && got>=need){ nextStage(); return; }
  }
  if (goal && overlap(PR(),goal)){ nextStage(); return; }

  // カメラ追従
  const view=cv.clientWidth;
  const target=Math.max(0, Math.min(px - view*0.35, worldW - view + U()*4));
  camX += (target - camX)*0.12;

  // 描画
  draw(); raf=requestAnimationFrame(loop);
}

/* ========= 描画 ========= */
function draw(){
  const w=cv.clientWidth, h=cv.clientHeight;
  ctx.clearRect(0,0,w,h);
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0f2238'); g.addColorStop(1,'#0b1626');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
  for(let y=0;y<h;y+=U()*2){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  ctx.save(); ctx.translate(-camX,0);

  // 床・足場
  platforms.forEach(p=>{
    ctx.fillStyle = p.type==='ground' ? '#0e243a' : '#334155';
    ctx.fillRect(p.x,p.y,p.w,p.h);
  });

  // 量子床
  tiles.forEach(t=>{
    let ox=0; if (t.shake>0){ ox=(Math.random()*2-1)*2; t.shake=Math.max(0,t.shake-0.08); }
    if (t.state==='unknown') ctx.fillStyle='#475569';
    else if (t.state==='solid') ctx.fillStyle='#64748b';
    else if (t.state==='crack') ctx.fillStyle='#ef4444';
    else ctx.fillStyle='rgba(239,68,68,.18)';
    ctx.fillRect(t.x+ox,t.y,t.w,t.h);
    if (t.state==='crack'){
      ctx.strokeStyle='#fde68a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(t.x+4+ox,t.y+2); ctx.lineTo(t.x+t.w-4+ox,t.y+t.h-2); ctx.stroke();
    }
  });

  // コイン
  coins.forEach(c=>{
    if (c.taken) return;
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.closePath();
    ctx.fillStyle='#fbbf24'; ctx.fill(); ctx.strokeStyle='#fde68a'; ctx.lineWidth=2; ctx.stroke();
  });

  // スパイク（三角）
  spikes.forEach(s=>{
    ctx.fillStyle='#ef4444';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y+s.h);
    ctx.lineTo(s.x+s.w, s.y+s.h);
    ctx.lineTo(s.x+s.w*0.5, s.y);
    ctx.closePath(); ctx.fill();
  });

  // レーザー（移動式）
  lasers.forEach(L=>{
    const x0 = L.horiz ? (L.x - U()*0.2) : (L.x - L.w/2);
    const ww = L.horiz ? U()*0.4 : L.w;
    const grad = ctx.createLinearGradient(x0,0,x0+ww,0);
    grad.addColorStop(0,'rgba(239,68,68,0)');
    grad.addColorStop(0.5,'rgba(239,68,68,0.9)');
    grad.addColorStop(1,'rgba(239,68,68,0)');
    ctx.fillStyle=grad;
    if (L.horiz) ctx.fillRect(x0, L.y-U()*6, ww, U()*12);
    else         ctx.fillRect(x0, 0, ww, h);
  });

  // ゴール
  if (goal){ ctx.fillStyle='#10b981'; ctx.fillRect(goal.x,goal.y,goal.w,goal.h); }

  // プレイヤー
  ctx.fillStyle='#22d3ee'; ctx.fillRect(px,py,PW(),PH());

  ctx.restore();
}

/* ========= 起動 ========= */
startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);

// 初期：ステージ1のレイアウトだけ表示（待機）
STAGES[0](); draw();
