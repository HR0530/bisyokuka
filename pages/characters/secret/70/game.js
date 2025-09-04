/* 美食家さん 激むず70（ボンバーマン型・最小実装）
   - 15x13 グリッド
   - 壊せない壁(1), 壊せる壁(2)
   - プレイヤー(3) は最初の3をスポーンとして読み取り
   - 敵スポーン(4) は読み取り後、初期敵を配置
   - ゴール(5) は全敵撃破で到達するとクリア
   - アイテム(6..9): 6=Pow+, 7=Cap+, 8=Speed+, 9=Cal(スコア)
*/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const HUD = {
  time: document.getElementById("time"),
  life: document.getElementById("life"),
  power: document.getElementById("power"),
  capacity: document.getElementById("capacity"),
  cal: document.getElementById("cal"),
};
const toastEl = document.getElementById("toast");

const COLS = 15, ROWS = 13, TILE = 40;
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
const COLORS = {
  void:"#121724", floor:"#1a2234", hard:"#3c4766", soft:"#6e7aa0",
  player:"#7cf29a", enemy:"#ffb36b", bomb:"#ffd166", flame:"#ff6b6b",
  item:"#8dd3ff", goal:"#a48bff",
};

// ===== マップ（外周硬壁＋柱、入口通路） =====
const baseMap = (()=>{
  const g = Array.from({length:ROWS}, ()=>Array(COLS).fill(2));
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if (y===0||y===ROWS-1||x===0||x===COLS-1){ g[y][x]=1; continue; }
      if (y%2===0 && x%2===0) g[y][x]=1;
      if ((x<=2 && y<=2) || (x>=COLS-3 && y>=ROWS-3)) g[y][x]=0;
    }
  }
  g[1][1] = 3; // プレイヤー
  g[ROWS-2][COLS-2] = 4; g[1][COLS-2] = 4; g[ROWS-2][1] = 4; // 敵
  g[(ROWS/2|0)][(COLS/2|0)] = 5; // ゴール
  return g;
})();

const state = {
  grid: JSON.parse(JSON.stringify(baseMap)),
  timeLeft: 180, life: 3, power: 2, capacity: 1, cal: 0,
  player: {x:1,y:1,px:40,py:40,speed:6,dir:"right",moving:false},
  enemies: [], bombs: [], flames: [], items: [], keys: new Set(),
  tick: 0, gameOver:false, cleared:false
};

// 敵とプレイヤー初期位置
function spawnEnemies(){
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(state.grid[y][x]===4){ state.grid[y][x]=0;
      state.enemies.push({x,y,px:x*TILE,py:y*TILE,dir:pick(["up","down","left","right"]),speed:4});
    }
  }
}
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  if(state.grid[y][x]===3){ state.grid[y][x]=0; Object.assign(state.player,{x,y,px:x*TILE,py:y*TILE}); }
}
spawnEnemies();

// 入力
document.addEventListener("keydown",(e)=>{
  if (e.key==="ArrowUp")state.keys.add("up");
  if (e.key==="ArrowDown")state.keys.add("down");
  if (e.key==="ArrowLeft")state.keys.add("left");
  if (e.key==="ArrowRight")state.keys.add("right");
  if (e.key===" ") placeBomb();
});
document.addEventListener("keyup",(e)=>{
  if (e.key==="ArrowUp")state.keys.delete("up");
  if (e.key==="ArrowDown")state.keys.delete("down");
  if (e.key==="ArrowLeft")state.keys.delete("left");
  if (e.key==="ArrowRight")state.keys.delete("right");
});
document.querySelectorAll(".btn.dir").forEach(btn=>{
  const dir = btn.dataset.dir, on=()=>state.keys.add(dir), off=()=>state.keys.delete(dir);
  btn.addEventListener("touchstart",(e)=>{e.preventDefault();on();},{passive:false});
  btn.addEventListener("touchend",(e)=>{e.preventDefault();off();},{passive:false});
  btn.addEventListener("mousedown",(e)=>{e.preventDefault();on();});
  btn.addEventListener("mouseup",(e)=>{e.preventDefault();off();});
  btn.addEventListener("mouseleave",(e)=>{e.preventDefault();off();});
});
document.getElementById("bombBtn").addEventListener("click", ()=>placeBomb());
document.getElementById("retry").addEventListener("click", ()=>resetGame());

// 汎用
const toast=(m,ms=1200)=>{toastEl.textContent=m;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),ms);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cell=(x,y)=>state.grid[y]?.[x] ?? 1;
const setCell=(x,y,v)=>{if(state.grid[y]&&typeof state.grid[y][x]!=="undefined")state.grid[y][x]=v;};
const walkable=(x,y)=>{ const c=cell(x,y); if(c===1||c===2)return false; return !state.bombs.some(b=>!b.exploded&&b.x===x&&b.y===y); };
const pick = arr => arr[(Math.random()*arr.length)|0];

// 更新
function update(){
  if (state.gameOver||state.cleared) return;
  if (++state.tick%60===0){ state.timeLeft--; HUD.time.textContent=state.timeLeft; if(state.timeLeft<=0) die("時間切れ…"); }
  movePlayer(); moveEnemies(); updateBombs(); updateFlames();

  // クリア：敵ゼロで中央に到達
  if (state.enemies.length===0){
    const gx=(COLS/2|0), gy=(ROWS/2|0);
    if (state.player.x===gx && state.player.y===gy){ state.cleared=true; toast("🎉 クリア！"); }
  }
}

function movePlayer(){
  const p=state.player; let dx=0,dy=0;
  if(state.keys.has("up")){dy=-1;p.dir="up";}
  else if(state.keys.has("down")){dy=1;p.dir="down";}
  else if(state.keys.has("left")){dx=-1;p.dir="left";}
  else if(state.keys.has("right")){dx=1;p.dir="right";}
  p.moving = dx||dy;

  if(p.moving){
    const nx=clamp(p.x+dx,0,COLS-1), ny=clamp(p.y+dy,0,ROWS-1);
    if(walkable(nx,ny)){ p.x=nx;p.y=ny;p.px=nx*TILE;p.py=ny*TILE; pickupItem(nx,ny);
      if(cell(nx,ny)===5 && state.enemies.length>0) toast("敵を全滅させるとゴール解放！");
    }
  }
  if(state.enemies.some(e=>e.x===p.x && e.y===p.y)) die("敵にやられた…");
}

function moveEnemies(){
  for(const e of state.enemies){
    if (Math.random()<0.04) e.dir = pick(["up","down","left","right"]);
    const d = DIRS[e.dir], nx=clamp(e.x+d.x,0,COLS-1), ny=clamp(e.y+d.y,0,ROWS-1);
    if(walkable(nx,ny)){ e.x=nx;e.y=ny;e.px=nx*TILE;e.py=ny*TILE; } else { e.dir=pick(["up","down","left","right"]); }
  }
}

function placeBomb(){
  if(state.gameOver||state.cleared) return;
  if(state.bombs.filter(b=>!b.exploded).length>=state.capacity){ toast("💣 これ以上置けない！"); return; }
  const p=state.player; if(!walkable(p.x,p.y)){ toast("そこには置けない！"); return; }
  state.bombs.push({x:p.x,y:p.y,timer:120,range:state.power,exploded:false});
}

function updateBombs(){
  for(const b of state.bombs){ if(b.exploded) continue; if(--b.timer<=0){ explode(b); b.exploded=true; } }
}

function explode(b){
  addFlame(b.x,b.y);
  for(const dirName of ["up","down","left","right"]){
    const d=DIRS[dirName];
    for(let i=1;i<=b.range;i++){
      const tx=b.x+d.x*i, ty=b.y+d.y*i, c=cell(tx,ty);
      if(c===1) break;
      addFlame(tx,ty);
      if(c===2){ setCell(tx,ty,0); maybeSpawnItem(tx,ty); break; }
    }
  }
  checkFlameHits();
}

const addFlame=(x,y)=>state.flames.push({x,y,timer:24});
function updateFlames(){ state.flames = state.flames.filter(f=>--f.timer>0); }

function checkFlameHits(){
  const hits=new Set(state.flames.map(f=>`${f.x},${f.y}`));
  state.enemies = state.enemies.filter(e=>{
    const h=hits.has(`${e.x},${e.y}`);
    if(h){ state.cal+=50; HUD.cal.textContent=state.cal; if(Math.random()<0.15) maybeSpawnItem(e.x,e.y,true); }
    return !h;
  });
  const p=state.player;
  if(hits.has(`${p.x},${p.y}`)) die("爆風に巻き込まれた…");
}

function maybeSpawnItem(x,y,force=false){
  if(!force && Math.random()<0.65) return;
  const pool=[6,7,8,9]; const type=pool[(Math.random()*pool.length)|0];
  state.items.push({x,y,type});
}
function pickupItem(x,y){
  const i = state.items.findIndex(it=>it.x===x&&it.y===y);
  if(i<0) return;
  const it=state.items[i]; state.items.splice(i,1);
  switch(it.type){
    case 6: state.power=clamp(state.power+1,1,8); HUD.power.textContent=state.power; toast("🔥 パワーUP！"); break;
    case 7: state.capacity=clamp(state.capacity+1,1,5); HUD.capacity.textContent=state.capacity; toast("💣 同時設置+1！"); break;
    case 8: state.player.speed=clamp(state.player.speed+1,4,10); toast("🏃 スピードUP！"); break;
    case 9: state.cal+=30; HUD.cal.textContent=state.cal; toast("🍙 カロリーGET！"); break;
  }
}

function die(reason="やられた…"){
  if(state.gameOver||state.cleared) return;
  state.life--; HUD.life.textContent=state.life; toast(`💥 ${reason}`);
  if(state.life<=0){ state.gameOver=true; toast("💀 GAME OVER"); return; }
  Object.assign(state.player,{x:1,y:1,px:TILE,py:TILE,dir:"right"});
}

function resetGame(){
  state.grid = JSON.parse(JSON.stringify(baseMap));
  Object.assign(state,{timeLeft:180,life:3,power:2,capacity:1,cal:0,gameOver:false,cleared:false});
  HUD.time.textContent=state.timeLeft; HUD.life.textContent=state.life;
  HUD.power.textContent=state.power; HUD.capacity.textContent=state.capacity; HUD.cal.textContent=state.cal;
  Object.assign(state.player,{x:1,y:1,px:TILE,py:TILE,dir:"right",moving:false,speed:6});
  state.bombs.length=0; state.flames.length=0; state.items.length=0; state.enemies.length=0;
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(state.grid[y][x]===3){
    state.grid[y][x]=0; Object.assign(state.player,{x,y,px:x*TILE,py:y*TILE});
  }
  spawnEnemies();
}

// 描画
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const c=cell(x,y), px=x*TILE, py=y*TILE;
    ctx.fillStyle="#1a2234"; ctx.fillRect(px,py,TILE,TILE);
    if(c===1){ ctx.fillStyle="#3c4766"; ctx.fillRect(px+2,py+2,TILE-4,TILE-4); }
    else if(c===2){ ctx.fillStyle="#6e7aa0"; ctx.fillRect(px+4,py+4,TILE-8,TILE-8); }
    else if(c===5){ ctx.strokeStyle="#a48bff"; ctx.lineWidth=3; ctx.strokeRect(px+6,py+6,TILE-12,TILE-12); }
  }
  for(const it of state.items){
    const px=it.x*TILE, py=it.y*TILE;
    ctx.fillStyle="#8dd3ff"; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#0d0f13"; ctx.font="bold 18px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText({6:"P",7:"C",8:"S",9:"K"}[it.type], px+TILE/2, py+TILE/2+1);
  }
  for(const b of state.bombs){ if(b.exploded) continue;
    const px=b.x*TILE, py=b.y*TILE; ctx.fillStyle="#ffd166"; ctx.beginPath();
    ctx.arc(px+TILE/2,py+TILE/2,TILE*0.3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#333"; ctx.beginPath(); ctx.moveTo(px+TILE/2,py+TILE/2); ctx.lineTo(px+TILE*0.75,py+TILE*0.25); ctx.stroke();
  }
  for(const f of state.flames){ const px=f.x*TILE, py=f.y*TILE, pad=6+(f.timer%4);
    ctx.fillStyle="#ff6b6b"; ctx.fillRect(px+pad,py+pad,TILE-pad*2,TILE-pad*2);
  }
  for(const e of state.enemies){ const px=e.px, py=e.py;
    ctx.fillStyle="#ffb36b"; ctx.fillRect(px+6,py+6,TILE-12,TILE-12);
    ctx.fillStyle="#0d0f13"; ctx.fillRect(px+12,py+12,6,6); ctx.fillRect(px+TILE-18,py+12,6,6);
  }
  const p=state.player;
  ctx.fillStyle="#7cf29a"; ctx.fillRect(p.px+5,p.py+5,TILE-10,TILE-10);
  ctx.fillStyle="#0d0f13"; ctx.fillRect(p.px+12,p.py+12,6,6); ctx.fillRect(p.px+TILE-18,p.py+12,6,6);

  if(state.cleared||state.gameOver){
    ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff"; ctx.font="bold 36px system-ui,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(state.cleared?"🎉 CLEAR!":"💀 GAME OVER", canvas.width/2, canvas.height/2);
  }
}

// ループ
let last=0; function loop(ts){ update((ts-last)/16.67); last=ts; draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
