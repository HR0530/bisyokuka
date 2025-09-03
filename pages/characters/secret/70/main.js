// ===== 図鑑パス解決 & 解放 =====
function resolveDexPath(){
  const p = location.pathname;
  // /pages/characters/secret/70/index.html → ../../dex/index.html が正
  if (p.includes('/pages/characters/secret/')) return '../../dex/index.html';
  if (p.includes('/pages/characters/'))        return 'dex/index.html';
  if (p.includes('/pages/'))                   return 'characters/dex/index.html';
  return '/pages/characters/dex/index.html';
}
function wireBack(elId){
  const a = document.getElementById(elId);
  if (!a) return;
  const href = resolveDexPath();
  a.setAttribute('href', href);
  a.addEventListener('click', (e)=>{ e.preventDefault(); location.href = href; });
}
wireBack('backBtn'); wireBack('backBtn2');

function unlock70(){
  if (typeof unlockSecret==='function'){ unlockSecret(70,'secret_70.png'); return; }
  const DEX_KEY='dex_state_v1', id=69;
  const dex = JSON.parse(localStorage.getItem(DEX_KEY)||'{}');
  dex.unlocked   = Object.assign({}, dex.unlocked,   {[id]:true});
  dex.secretFiles= Object.assign({}, dex.secretFiles,{[String(id)]:'secret_70.png'});
  if (!dex.selected) dex.selected='secret_70.png';
  localStorage.setItem(DEX_KEY, JSON.stringify(dex));
  try{ window.dispatchEvent(new StorageEvent('storage',{key:DEX_KEY,newValue:JSON.stringify(dex)})); }catch(_){}
}

// ===== スクロール抑止 =====
window.addEventListener('keydown',(e)=>{
  const k=e.code;
  if (k==='ArrowUp'||k==='ArrowDown'||k==='ArrowLeft'||k==='ArrowRight'||k==='Space') e.preventDefault();
},{passive:false});

// ===== Canvas & UI =====
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
window.addEventListener('resize', ()=>{ fitCanvas(); if (!state.playing) draw(); }, {passive:true});
fitCanvas();

// ===== 入力 =====
const keys={left:false,right:false,jump:false};
document.addEventListener('visibilitychange',()=>{ state.paused=document.hidden; });
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

// ===== 共通ユーティリティ =====
function U(){ return Math.max(18, Math.min(42, cv.clientHeight/22)); }
const PWk=1.2, PHk=1.8;
const G=1650, MOVE=340, JUMP_V=-540, COYOTE=0.09, FRICTION=0.9;
function PW(){ return U()*PWk; } function PH(){ return U()*PHk; }
function PR(){ return {x:state.px,y:state.py,w:PW(),h:PH()}; }
function overlap(a,b){ return !(a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h); }

const state = {
  playing:false, paused:false, raf:0,
  stageIdx:1, totalTime:0, stageTime:0,
  camX:0, worldW:2000,
  last:0, stageStartAt:0, globalStartAt:0,
  px:0, py:0, vx:0, vy:0, onGround:false, coyote:0,
  platforms:[], tiles:[], lasers:[], coins:[], spikes:[], goal:null,
  runner:null, survival:null, laserMaze:null, precision:null, tilesMode:null, gauntlet:null,
};
function clearEntities(){
  state.platforms.length=0; state.tiles.length=0; state.lasers.length=0;
  state.coins.length=0; state.spikes.length=0; state.goal=null;
  state.runner=state.survival=state.laserMaze=state.precision=state.tilesMode=state.gauntlet=null;
}
function setCond(t){ condEl.textContent=t; }

// ===== ビルダー =====
function buildRunner(p){
  clearEntities(); state.camX=0;
  const gy = cv.clientHeight - U()*2;
  state.platforms.push({x:0,y:gy,w:999999,h:U()*0.9,type:'ground'});
  state.runner={timeNeed:p.sec, coinNeed:p.coinsNeed, scrollVX:p.speed, endSpeed:p.endSpeed, spawnTimer:0};
  state.px=U()*3; state.py=gy-PH(); state.vx=state.vy=0; state.onGround=true; state.coyote=0;
  state.worldW=999999;
  setCond(`条件：${p.sec}s 生存 ＋ コイン ${p.coinsNeed}枚`);
}
function spawnRunnerPack(){
  const gy = cv.clientHeight - U()*2;
  if (Math.random()<0.5){
    const w=U()*(1.2+Math.random()*1.2), hh=U()*(1.1+Math.random()*2.2);
    state.platforms.push({x:state.camX+cv.clientWidth+U()*1.2,y:gy-hh,w,h:hh,type:'wall'});
    if (Math.random()<0.7) state.coins.push({x:state.camX+cv.clientWidth+U()*1.2+w/2, y:gy-hh-U()*1.2, r:U()*0.45,taken:false});
  }else{
    const w=U()*(1.8+Math.random()*1.8);
    state.spikes.push({x:state.camX+cv.clientWidth+U()*1.2,y:gy-U()*0.8,w,h:U()*0.8,type:'spike'});
    state.coins.push({x:state.camX+cv.clientWidth+U()*0.9, y:gy-U()*2.4, r:U()*0.45,taken:false});
    if (Math.random()<0.5) state.coins.push({x:state.camX+cv.clientWidth+U()*1.4, y:gy-U()*2.6, r:U()*0.45,taken:false});
  }
}

const SAFE_BASE=0.54, BONUS_C=0.12, BONUS_A=0.08, PEN_V=0.18, VY_REF=760, BREAK_DELAY=0.35;
function observeTile(t){
  if (t.observed) return;
  const speed=Math.sqrt(state.vx*state.vx+state.vy*state.vy), horiz=Math.abs(state.vx)/(speed+1e-6);
  const cx=Math.abs((state.px+PW()/2)-(t.x+t.w/2)); const center=1-Math.min(1,cx/(t.w/2));
  let p=SAFE_BASE + center*BONUS_C + horiz*BONUS_A - Math.min(1,Math.abs(state.vy)/VY_REF)*PEN_V;
  p=Math.max(0.2, Math.min(0.9,p));
  t.observed=true;
  if (Math.random()<0.04){ t.safe=false; t.state='broken'; return; }
  t.safe=Math.random()<p;
  if(!t.safe){ t.state='crack'; t.breakAt=state.stageTime+BREAK_DELAY; t.shake=1; } else t.state='solid';
}
function buildTiles(p){
  clearEntities(); state.camX=0;
  const gy = cv.clientHeight - U()*2;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9};
  state.platforms.push(start);
  let baseX=start.x+start.w+U()*1.0;
  for(let i=0;i<p.cols;i++){
    const lane=(i%2===0)?0:1, tx=baseX+i*(U()*2.1+U()*1.0);
    const ty=gy - U()*(2.8 + lane*1.15 + Math.random()*0.7);
    state.tiles.push({x:tx,y:ty,w:U()*2.1,h:U()*0.75,observed:false,safe:null,breakAt:0,state:'unknown',shake:0});
  }
  const last=state.tiles[state.tiles.length-1];
  state.goal={x:last.x+U()*2.1+U()*1.2,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  const minX=start.x+start.w+U()*4, maxX=state.goal.x-U()*4, count=Math.max(1,Math.floor(p.cols/8));
  for(let i=0;i<count;i++){
    const y=gy-U()*(2.0+Math.random()*2.8), w=U()*0.35, spd=110+Math.random()*80, ph=Math.random();
    state.lasers.push({x:minX+(maxX-minX)*ph, y, w, h:cv.clientHeight, minX, maxX, spd:(Math.random()<0.5?-1:1)*spd});
  }
  state.px=start.x+start.w*0.5-PW()/2; state.py=start.y-PH(); state.vx=state.vy=0; state.onGround=true; state.coyote=0;
  state.worldW=state.goal.x+U()*6;
  setCond('条件：ゴール到達（量子床。割れる床は0.35s後に崩落）');
}
function buildLaserMaze(p){
  clearEntities(); state.camX=0;
  const gy=cv.clientHeight-U()*2;
  let x=U()*2, y=gy-U()*2.8;
  for(let i=0;i<p.segments;i++){
    const w=U()*(4.6+Math.random()*2.0);
    state.platforms.push({x,y,w,h:U()*0.9});
    const minX=x+U()*0.6, maxX=x+w-U()*0.6, ly=y-U()*(1.6+Math.random()*1.2);
    state.lasers.push({x:(minX+maxX)/2,y:ly,w:U()*0.35,h:U()*0.35,minX,maxX,spd:(Math.random()<0.5?-1:1)*(130+i*30+Math.random()*40),horiz:true});
    x+=w+U()*2.2; y=gy-U()*(2.0+Math.random()*4.0);
  }
  state.goal={x:x+U()*1.2,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  state.worldW=state.goal.x+U()*6;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9}; state.platforms.push(start);
  state.px=start.x+start.w*0.5-PW()/2; state.py=start.y-PH(); state.vx=state.vy=0; state.onGround=true; state.coyote=0;
  setCond('条件：ゴール到達（移動レーザー）');
}
function buildSurvival(p){
  clearEntities(); state.camX=0;
  const w=Math.max(cv.clientWidth, U()*28), h=cv.clientHeight, gy=h-U()*2;
  state.platforms.push({x:0,y:gy,w:999999,h:U()*0.9,type:'ground'});
  state.platforms.push({x:-U()*2,y:0,w:U()*2,h:999999});
  state.platforms.push({x: w+U()*2,y:0,w:U()*2,h:999999});
  state.survival={timeNeed:p.sec, withLaser:p.withLaser, spikeTimer:0};
  if (p.withLaser){
    const minX=U()*2, maxX=w-U()*2, count=2;
    for(let i=0;i<count;i++){
      const lw=U()*0.35, spd=120+Math.random()*60, ph=Math.random();
      state.lasers.push({x:minX+(maxX-minX)*ph, y:0, w:lw, h:h, minX, maxX, spd:(Math.random()<0.5?-1:1)*spd});
    }
  }
  state.worldW=w;
  state.px=U()*4; state.py=gy-PH(); state.vx=state.vy=0; state.onGround=true; state.coyote=0;
  setCond(`条件：${p.sec}s 生存${p.withLaser?'（＋移動レーザー回避）':''}`);
}
function buildPrecision(){
  clearEntities(); state.camX=0;
  const gy=cv.clientHeight-U()*2;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9}; state.platforms.push(start);
  let x=start.x+start.w+U()*1.2;
  for(let i=0;i<8;i++){
    const w=U()*(2.0+Math.random()*0.8), y=gy-U()*(2.4+(i%2?1.4:0.8)+Math.random()*1.0);
    state.platforms.push({x,y,w,h:U()*0.8});
    state.spikes.push({x,y:gy-U()*0.8,w,h:U()*0.8});
    if (i%2===1){
      const minX=x-U()*3.0, maxX=x+w+U()*1.0, ly=y-U()*1.0, spd=(Math.random()<0.5?-1:1)*(130+Math.random()*50);
      state.lasers.push({x:(minX+maxX)/2,y:ly,w:U()*0.35,h:U()*0.35,minX,maxX,spd,horiz:true});
    }
    x+=w+U()*2.4;
  }
  state.goal={x:x+U()*1.6,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  state.worldW=state.goal.x+U()*6;
  state.px=start.x+start.w/2-PW()/2; state.py=start.y-PH(); state.vx=state.vy=0; state.onGround=true; state.coyote=0;
  setCond('条件：ゴール到達（狭い足場＋移動レーザー＋下スパイク）');
}
function buildGauntlet(){
  clearEntities(); state.camX=0;
  const gy=cv.clientHeight-U()*2;
  const start={x:U()*1.0,y:gy,w:U()*4,h:U()*0.9}; state.platforms.push(start);
  let x=start.x+start.w+U()*1.2;

  for(let i=0;i<6;i++){
    const w=U()*(1.4+Math.random()*1.4), hh=U()*(1.2+Math.random()*2.2);
    state.platforms.push({x:x+i*(U()*3.2), y:gy-hh, w, h:hh});
    if (Math.random()<0.6) state.coins.push({x:x+i*(U()*3.2)+w/2, y:gy-hh-U()*1.6, r:U()*0.45, taken:false});
  }
  x+=U()*3.2*6+U()*2;

  const cols=10;
  for(let i=0;i<cols;i++){
    const tx=x+i*(U()*2.1+U()*0.9), ty=gy-U()*(2.6+(i%2?1.2:0.6)+Math.random()*0.6);
    state.tiles.push({x:tx,y:ty,w:U()*2.1,h:U()*0.75,observed:false,safe:null,breakAt:0,state:'unknown',shake:0});
  }
  x+=(U()*2.1+U()*0.9)*cols+U()*2.0;

  for(let i=0;i<4;i++){
    const w=U()*(4.4+Math.random()*1.6), y=gy-U()*(2.0+Math.random()*3.0);
    state.platforms.push({x:x,y,w,h:U()*0.9});
    const minX=x+U()*0.6,maxX=x+w-U()*0.6, ly=y-U()*(1.4+Math.random()*1.0);
    state.lasers.push({x:(minX+maxX)/2,y:ly,w:U()*0.35,h:U()*0.35,minX,maxX,spd:(Math.random()<0.5?-1:1)*(140+Math.random()*40),horiz:true});
    x+=w+U()*2.0;
  }
  state.goal={x:x+U()*2.0,y:gy-U()*3.0,w:U()*3.0,h:U()*1.0};
  state.worldW=state.goal.x+U()*6;
  state.px=start.x+start.w/2-PW()/2; state.py=start.y-PH(); state.vx=state.vy=0; state.onGround=true; state.coyote=0;
  setCond('条件：ゴール到達（総合：Runner→量子床→レーザー）');
}

function buildByType(cfg){
  switch(cfg.type){
    case 'runner':    buildRunner(cfg.params); break;
    case 'tiles':     buildTiles(cfg.params); break;
    case 'laser':     buildLaserMaze(cfg.params); break;
    case 'survival':  buildSurvival(cfg.params); break;
    case 'precision': buildPrecision(); break;
    case 'gauntlet':  buildGauntlet(); break;
    default:          buildRunner({sec:8,coinsNeed:10,speed:260,endSpeed:400});
  }
}

// ===== 進行 =====
function startGame(){
  if (!Array.isArray(window.STAGES) || window.STAGES.length===0){
    ov.style.display='grid';
    ovMsg.textContent='ステージが読み込めませんでした';
    ovSub.textContent='stages/*.js の <script> が正しく読み込まれているか確認してください。';
    return;
  }
  STAGES = window.STAGES; // ← ここで取得
  state.playing=true; state.paused=false; state.stageIdx=1; state.totalTime=0; state.stageTime=0; state.camX=0;
  state.globalStartAt=performance.now(); state.stageStartAt=state.globalStartAt; state.last=state.globalStartAt;
  buildByType(STAGES[0]); stageEl.textContent=state.stageIdx; ov.style.display='none';
  cancelAnimationFrame(state.raf); state.raf=requestAnimationFrame(loop);
}
function nextStage(){
  state.stageIdx++;
  if (state.stageIdx>STAGES.length){
    state.playing=false; cancelAnimationFrame(state.raf);
    unlock70();
    ovMsg.textContent='完全制覇！ #70 解放';
    ovSub.textContent='図鑑で選択できます。';
    ov.style.display='grid';
    return;
  }
  state.stageTime=0;
  state.stageStartAt=performance.now();
  state.camX=0;
  buildByType(STAGES[state.stageIdx-1]);
  stageEl.textContent=state.stageIdx;
}
function fail(msg){
  state.playing=false; cancelAnimationFrame(state.raf);
  ovMsg.textContent='失敗…';
  ovSub.textContent=msg||'もう一度挑戦しよう';
  ov.style.display='grid';
}

// ===== ループ =====
let STAGES = window.STAGES || [];
function loop(ts){
  if (!state.playing) return;
  if (!state.last) state.last=ts;
  const dt=Math.min(0.033, (ts-state.last)/1000); state.last=ts;
  if (state.paused){ state.raf=requestAnimationFrame(loop); return; }

  state.stageTime = (ts - state.stageStartAt)/1000;
  state.totalTime = (ts - state.globalStartAt)/1000;
  timeEl.textContent = state.totalTime.toFixed(1);

  if (keys.left)  state.vx=-MOVE;
  if (keys.right) state.vx= MOVE;
  if (!keys.left && !keys.right) state.vx*=FRICTION;
  if (keys.jump){
    if (state.onGround || state.coyote>0){ state.vy=JUMP_V; state.onGround=false; state.coyote=0; }
    keys.jump=false;
  }
  state.vy+=G*dt;

  if (state.runner){
    const k=Math.min(1, state.stageTime/state.runner.timeNeed);
    const sc=state.runner.scrollVX+(state.runner.endSpeed-state.runner.scrollVX)*k;
    state.camX += sc*dt*0.75;
    state.runner.spawnTimer+=dt;
    const spawnInt=Math.max(0.55, 0.95-0.03*state.stageTime);
    if (state.runner.spawnTimer>=spawnInt){ state.runner.spawnTimer=0; spawnRunnerPack(); }
    const flow=sc*dt;
    [state.platforms,state.spikes,state.coins].forEach(arr=>arr.forEach(o=>{ if(!o.static) o.x-=flow*0.25; }));
  }

  state.px+=state.vx*dt; state.py+=state.vy*dt;
  if (state.py>cv.clientHeight+U()*4 || state.px<-U()*6 || state.px>state.worldW+U()*6){ fail('奈落に落ちた…'); return; }

  const P=PR(); state.onGround=false;
  state.platforms.forEach(p=>{
    const prevBottom=P.y+P.h - state.vy*dt;
    if (P.x+P.w>p.x && P.x<p.x+p.w){
      if (prevBottom<=p.y && P.y+P.h>=p.y){
        state.py=p.y-P.h; state.vy=0; state.onGround=true; state.coyote=COYOTE;
      }
    }
  });

  state.tiles.forEach(t=>{
    if (t.state==='broken') return;
    if (t.state==='crack' && state.stageTime>=t.breakAt){ t.state='broken'; return; }
    const prevBottom=P.y+P.h - state.vy*dt;
    if (P.x+P.w>t.x && P.x<t.x+t.w){
      if (prevBottom<=t.y && P.y+P.h>=t.y){
        observeTile(t);
        if (t.state!=='broken'){ state.py=t.y-P.h; state.vy=0; state.onGround=true; state.coyote=COYOTE; }
      }
    }
  });

  state.coins.forEach(c=>{
    if (c.taken) return;
    const dx=Math.abs(c.x-(P.x+P.w/2)), dy=Math.abs(c.y-(P.y+P.h/2));
    if (dx<(P.w/2+c.r) && dy<(P.h/2+c.r)) c.taken=true;
  });

  for (const L of state.lasers){
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

  for (const s of state.spikes){
    if (s.vy) s.y+=s.vy*dt;
    const r={x:s.x, y:s.y, w:s.w, h:s.h};
    if (overlap(PR(),r)){ fail('トゲに当たった…'); return; }
  }

  if (state.survival && state.stageTime>=state.survival.timeNeed){ nextStage(); return; }
  if (state.runner){
    const need=state.runner.coinNeed, got=state.coins.filter(c=>c.taken).length;
    setCond(`条件：${state.runner.timeNeed}s 生存 ＋ コイン ${need}枚（現在 ${got}）`);
    if (state.stageTime>=state.runner.timeNeed && got>=need){ nextStage(); return; }
  }
  if (state.goal && overlap(PR(),state.goal)){ nextStage(); return; }

  const view=cv.clientWidth;
  const target=Math.max(0, Math.min(state.px - view*0.35, state.worldW - view + U()*4));
  state.camX += (target - state.camX)*0.12;

  draw(); state.raf=requestAnimationFrame(loop);
}

// ===== 描画 =====
function draw(){
  const w=cv.clientWidth, h=cv.clientHeight;
  ctx.clearRect(0,0,w,h);
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0f2238'); g.addColorStop(1,'#0b1626');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
  for(let y=0;y<h;y+=U()*2){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  ctx.save(); ctx.translate(-state.camX,0);

  state.platforms.forEach(p=>{
    ctx.fillStyle = p.type==='ground' ? '#0e243a' : '#334155';
    ctx.fillRect(p.x,p.y,p.w,p.h);
  });

  state.tiles.forEach(t=>{
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

  state.coins.forEach(c=>{
    if (c.taken) return;
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.closePath();
    ctx.fillStyle='#fbbf24'; ctx.fill(); ctx.strokeStyle='#fde68a'; ctx.lineWidth=2; ctx.stroke();
  });

  state.spikes.forEach(s=>{
    ctx.fillStyle='#ef4444';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y+s.h);
    ctx.lineTo(s.x+s.w, s.y+s.h);
    ctx.lineTo(s.x+s.w*0.5, s.y);
    ctx.closePath(); ctx.fill();
  });

  state.lasers.forEach(L=>{
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

  if (state.goal){ ctx.fillStyle='#10b981'; ctx.fillRect(state.goal.x,state.goal.y,state.goal.w,state.goal.h); }
  ctx.fillStyle='#22d3ee'; ctx.fillRect(state.px,state.py,PW(),PH());
  ctx.restore();
}

// 初期プレビュー（ステージ1があれば描画）
if (Array.isArray(window.STAGES) && window.STAGES.length){
  buildByType(window.STAGES[0]); draw();
}

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
