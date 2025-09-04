/* 美食家さん 激むず70（ボンバーマン型・最小実装）
   - 15x13 グリッド
   - 壊せない壁(1), 壊せる壁(2)
   - プレイヤー(3) は最初の3をスポーンとして読み取り
   - 敵スポーン(4) は読み取り後、初期敵を配置
   - ゴール(5) は全敵撃破で出現（今回は地面表示のみ・近づくとクリア）
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

// ===== 基本パラメータ =====
const COLS = 15;
const ROWS = 13;
const TILE = 40; // 論理タイルサイズ（実描画はスケールで調整）
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const DIRS = {
  up:    {x:0,y:-1},
  down:  {x:0,y:1},
  left:  {x:-1,y:0},
  right: {x:1,y:0},
};

const COLORS = {
  void: "#121724",
  floor:"#1a2234",
  hard : "#3c4766",
  soft : "#6e7aa0",
  player:"#7cf29a",
  enemy:"#ffb36b",
  bomb:"#ffd166",
  flame:"#ff6b6b",
  item:"#8dd3ff",
  goal:"#a48bff",
};

// ===== マップ定義（簡単な初期レイアウト） =====
// 外周はハード壁、中はチェッカーでハード壁を置き、残りはソフト壁多め。
const baseMap = (()=>{
  const g = Array.from({length:ROWS}, ()=>Array(COLS).fill(2));
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if (y===0||y===ROWS-1||x===0||x===COLS-1){ g[y][x]=1; continue; }
      if (y%2===0 && x%2===0) g[y][x]=1; // 固定壁の柱
      // 入口周りだけ通路
      if ((x<=2 && y<=2) || (x>=COLS-3 && y>=ROWS-3)) g[y][x]=0;
    }
  }
  // プレイヤー開始 (左上)
  g[1][1] = 3;
  // 敵スポーン数か所
  g[ROWS-2][COLS-2] = 4;
  g[1][COLS-2] = 4;
  g[ROWS-2][1] = 4;
  // ゴール（出現条件用に床に置いておく）
  g[Math.floor(ROWS/2)][Math.floor(COLS/2)] = 5; // 中央
  return g;
})();

// ===== ゲーム状態 =====
const state = {
  grid: JSON.parse(JSON.stringify(baseMap)),
  timeLeft: 180,
  life: 3,
  power: 2,
  capacity: 1,
  cal: 0,

  player: {x:1, y:1, speed: 6, moving:false, dir:"right", px:1*TILE, py:1*TILE},
  enemies: [],
  bombs: [],
  flames: [],
  items: [],
  keys: new Set(),
  tick: 0,
  gameOver: false,
  cleared: false
};

// 敵初期化
function spawnEnemies(){
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if(state.grid[y][x]===4){
        state.grid[y][x]=0;
        state.enemies.push({x, y, px:x*TILE, py:y*TILE, dir: pickRandom(["up","down","left","right"]), speed:4});
      }
    }
  }
}
spawnEnemies();

// プレイヤー開始地点取得
for(let y=0;y<ROWS;y++){
  for(let x=0;x<COLS;x++){
    if(state.grid[y][x]===3){
      state.grid[y][x]=0;
      state.player.x = x; state.player.y = y;
      state.player.px = x*TILE; state.player.py = y*TILE;
    }
  }
}

// ===== 入力 =====
document.addEventListener("keydown", (e)=>{
  if (e.key==="ArrowUp") state.keys.add("up");
  if (e.key==="ArrowDown") state.keys.add("down");
  if (e.key==="ArrowLeft") state.keys.add("left");
  if (e.key==="ArrowRight") state.keys.add("right");
  if (e.key==="' " || e.key===" " ) placeBomb();
});
document.addEventListener("keyup", (e)=>{
  if (e.key==="ArrowUp") state.keys.delete("up");
  if (e.key==="ArrowDown") state.keys.delete("down");
  if (e.key==="ArrowLeft") state.keys.delete("left");
  if (e.key==="ArrowRight") state.keys.delete("right");
});

// タッチパッド
document.querySelectorAll(".btn.dir").forEach(btn=>{
  const dir = btn.dataset.dir;
  const on = ()=>state.keys.add(dir);
  const off= ()=>state.keys.delete(dir);
  btn.addEventListener("touchstart", (e)=>{e.preventDefault(); on();},{passive:false});
  btn.addEventListener("touchend", (e)=>{e.preventDefault(); off();},{passive:false});
  btn.addEventListener("mousedown",(e)=>{e.preventDefault(); on();});
  btn.addEventListener("mouseup",(e)=>{e.preventDefault(); off();});
  btn.addEventListener("mouseleave",(e)=>{e.preventDefault(); off();});
});
document.getElementById("bombBtn").addEventListener("click", ()=>placeBomb());

document.getElementById("retry").addEventListener("click", ()=>resetGame());
document.getElementById("back").addEventListener("click", ()=>history.back());

// ===== 便利関数 =====
function showToast(msg, ms=1200){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"), ms);
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function cell(x,y){ return state.grid[y]?.[x] ?? 1; }
function setCell(x,y,val){ if(state.grid[y] && typeof state.grid[y][x] !== "undefined") state.grid[y][x]=val; }
function walkable(x,y){ // 爆弾上は歩けない
  const c = cell(x,y);
  if (c===1||c===2) return false;
  // 爆弾占有チェック
  return !state.bombs.some(b=>b.x===x && b.y===y);
}
function pickRandom(arr){ return arr[(Math.random()*arr.length)|0]; }

// ===== ゲームロジック =====
function update(dt){
  if (state.gameOver || state.cleared) return;

  state.tick++;
  if (state.tick%60===0){
    state.timeLeft--;
    HUD.time.textContent = state.timeLeft;
    if (state.timeLeft<=0){ die("時間切れ…"); }
  }

  movePlayer(dt);
  moveEnemies(dt);

  updateBombs(dt);
  updateFlames(dt);

  // クリア判定：敵がいなくなり、中央ゴールに到達
  if (state.enemies.length===0){
    const gx = (COLS/2|0), gy = (ROWS/2|0);
    if (state.player.x===gx && state.player.y===gy){
      state.cleared = true;
      showToast("🎉 クリア！おめでとう！");
    }
  }
}

function movePlayer(dt){
  const p = state.player;
  let dx=0, dy=0;
  if (state.keys.has("up"))    {dy=-1; p.dir="up";}
  else if (state.keys.has("down")) {dy= 1; p.dir="down";}
  else if (state.keys.has("left")) {dx=-1; p.dir="left";}
  else if (state.keys.has("right")){dx= 1; p.dir="right";}
  p.moving = (dx!==0 || dy!==0);

  // タイル単位のスナップ移動（カジュアル）
  if (p.moving){
    const nx = clamp(p.x+dx, 0, COLS-1);
    const ny = clamp(p.y+dy, 0, ROWS-1);
    if (walkable(nx, ny)){
      p.x = nx; p.y = ny;
      p.px = p.x*TILE; p.py = p.y*TILE;
      // アイテム取得
      pickupItem(p.x, p.y);
      // ゴールマス演出
      if (cell(p.x,p.y)===5 && state.enemies.length>0){
        showToast("敵を全滅させるとゴール解放！");
      }
    }
  }

  // 敵と接触で死亡
  if (state.enemies.some(e=>e.x===p.x && e.y===p.y)){
    die("敵にやられた…");
  }
}

function moveEnemies(dt){
  for (const e of state.enemies){
    // たまに方向転換
    if (Math.random()<0.04){
      e.dir = pickRandom(["up","down","left","right"]);
    }
    const d = DIRS[e.dir];
    const nx = clamp(e.x + d.x, 0, COLS-1);
    const ny = clamp(e.y + d.y, 0, ROWS-1);
    if (walkable(nx, ny)){
      e.x = nx; e.y = ny;
      e.px = e.x*TILE; e.py = e.y*TILE;
    }else{
      e.dir = pickRandom(["up","down","left","right"]);
    }
  }
}

function placeBomb(){
  if (state.gameOver || state.cleared) return;
  const at = state.bombs.filter(b=>!b.exploded).length;
  if (at >= state.capacity){ showToast("💣 これ以上置けない！"); return; }
  const p = state.player;
  // 既に爆弾がある or 壁はNG
  if (!walkable(p.x, p.y)){ showToast("そこには置けない！"); return; }

  state.bombs.push({
    x:p.x, y:p.y, timer: 120, range: state.power, exploded:false
  });
}

function updateBombs(dt){
  for (const b of state.bombs){
    if (b.exploded) continue;
    b.timer--;
    if (b.timer<=0){
      explode(b);
      b.exploded = true;
    }
  }
}

function explode(bomb){
  addFlame(bomb.x, bomb.y);

  // 4方向に伸ばす
  for (const dirName of ["up","down","left","right"]){
    const d = DIRS[dirName];
    for(let i=1;i<=bomb.range;i++){
      const tx = bomb.x + d.x*i;
      const ty = bomb.y + d.y*i;
      const c = cell(tx,ty);
      // 壁
      if (c===1){ break; } // 硬い壁は貫通なし
      addFlame(tx,ty);
      if (c===2){ // 壊せる壁は破壊して停止
        setCell(tx,ty,0);
        // 壊れたところに一定確率でアイテム／カロリー
        maybeSpawnItem(tx,ty);
        break;
      }
      // それ以外(床/ゴール/アイテム)は貫通継続
    }
  }

  // 爆風で敵/プレイヤーをチェック
  checkFlameHits();
}

function addFlame(x,y){
  state.flames.push({x,y,timer:24});
}
function updateFlames(dt){
  state.flames = state.flames.filter(f=>{
    f.timer--;
    return f.timer>0;
  });
}

function checkFlameHits(){
  // 敵ヒット
  const hits = new Set(state.flames.map(f=>`${f.x},${f.y}`));
  state.enemies = state.enemies.filter(e=>{
    const h = hits.has(`${e.x},${e.y}`);
    if (h){
      // 敵を倒したらカロリー付与
      state.cal += 50;
      HUD.cal.textContent = state.cal;
      // ごく稀に追加アイテム
      if (Math.random() < 0.15) maybeSpawnItem(e.x,e.y,true);
    }
    return !h;
  });
  // プレイヤーヒット
  const p = state.player;
  if (hits.has(`${p.x},${p.y}`)){
    die("爆風に巻き込まれた…");
  }
}

function maybeSpawnItem(x,y,force=false){
  const r = Math.random();
  if (!force && r < 0.65) return; // 出ないことが多い
  // 6..9 のいずれか
  const pool = [6,7,8,9];
  const type = pool[(Math.random()*pool.length)|0];
  state.items.push({x,y,type});
}
function pickupItem(x,y){
  const idx = state.items.findIndex(it=>it.x===x && it.y===y);
  if (idx<0) return;
  const it = state.items[idx];
  state.items.splice(idx,1);
  switch(it.type){
    case 6: state.power = clamp(state.power+1, 1, 8);  HUD.power.textContent = state.power; showToast("🔥 パワーアップ！"); break;
    case 7: state.capacity = clamp(state.capacity+1, 1, 5); HUD.capacity.textContent = state.capacity; showToast("💣 同時設置+1！"); break;
    case 8: state.player.speed = clamp(state.player.speed+1, 4, 10); showToast("🏃 スピードUP！"); break;
    case 9: state.cal += 30; HUD.cal.textContent = state.cal; showToast("🍙 カロリーGET！"); break;
  }
}

// ===== ライフ・リセット =====
function die(reason="やられた…"){
  if (state.gameOver || state.cleared) return;
  state.life--;
  HUD.life.textContent = state.life;
  showToast(`💥 ${reason}`);

  if (state.life<=0){
    state.gameOver = true;
    showToast("💀 GAME OVER");
    return;
  }
  // リスポーン
  state.player.x=1; state.player.y=1;
  state.player.px=TILE; state.player.py=TILE;
}

function resetGame(){
  state.grid = JSON.parse(JSON.stringify(baseMap));
  state.timeLeft = 180; state.life=3; state.power=2; state.capacity=1; state.cal=0;
  HUD.time.textContent = state.timeLeft; HUD.life.textContent = state.life;
  HUD.power.textContent = state.power; HUD.capacity.textContent = state.capacity; HUD.cal.textContent = state.cal;

  state.player = {x:1,y:1,px:TILE,py:TILE,dir:"right",moving:false,speed:6};
  state.bombs.length = 0;
  state.flames.length = 0;
  state.items.length = 0;
  state.enemies.length = 0;
  state.gameOver=false; state.cleared=false;

  // 3,4 を処理
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if (state.grid[y][x]===3){
        state.grid[y][x]=0; state.player.x=x; state.player.y=y; state.player.px=x*TILE; state.player.py=y*TILE;
      }
    }
  }
  spawnEnemies();
}

// ===== 描画 =====
function draw(){
  // 背景
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // マス描画
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const c = cell(x,y);
      const px = x*TILE, py = y*TILE;
      // 床
      ctx.fillStyle = COLORS.floor;
      ctx.fillRect(px,py,TILE,TILE);

      if (c===1){
        ctx.fillStyle = COLORS.hard;
        ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
      }else if (c===2){
        ctx.fillStyle = COLORS.soft;
        ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
      }else if (c===5){
        // ゴール（中央）
        ctx.strokeStyle = COLORS.goal;
        ctx.lineWidth = 3;
        ctx.strokeRect(px+6,py+6,TILE-12,TILE-12);
      }
    }
  }

  // アイテム
  for (const it of state.items){
    const px = it.x*TILE, py = it.y*TILE;
    ctx.fillStyle = COLORS.item;
    ctx.beginPath();
    ctx.arc(px+TILE/2, py+TILE/2, TILE*0.28, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#0d0f13";
    ctx.font = "bold 18px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    const sym = {6:"P",7:"C",8:"S",9:"K"}[it.type]; // Pow,Cap,Speed,Kal(=Cal)
    ctx.fillText(sym, px+TILE/2, py+TILE/2+1);
  }

  // 爆弾
  for (const b of state.bombs){
    if (b.exploded) continue;
    const px = b.x*TILE, py = b.y*TILE;
    ctx.fillStyle = COLORS.bomb;
    ctx.beginPath();
    ctx.arc(px+TILE/2, py+TILE/2, TILE*0.3, 0, Math.PI*2);
    ctx.fill();
    // ヒューズ
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    ctx.moveTo(px+TILE/2, py+TILE/2);
    ctx.lineTo(px+TILE*0.75, py+TILE*0.25);
    ctx.stroke();
  }

  // 炎
  for (const f of state.flames){
    const px = f.x*TILE, py = f.y*TILE;
    ctx.fillStyle = COLORS.flame;
    const pad = 6 + (f.timer%4); // ちょいチラつき
    ctx.fillRect(px+pa
