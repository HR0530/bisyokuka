/* 美食家さん｜激むず70（ボンバーマン型・拡張）
 * 仕様：
 * - プレイヤー：離散 1マス移動
 * - 目標：右下(NPC位置だった場所)に置かれたゴールへ到達
 * - マップ：外周硬壁／内部ランダム生成（硬壁は互いに隣接しない）
 * - 爆弾：従来通り（爆風は硬壁で停止、ソフト壁破壊）
 * - ゴースト：ソフト壁破壊時に25%で出現。プレイヤー追尾、接触でミス。爆弾無効
 */

window.addEventListener("load", () => {
  try { boot(); } catch (e) {
    console.error("[hard70] boot error:", e);
    alert("ゲーム初期化エラー。コンソールをご確認ください。");
  }
});

function boot(){
  // ===== DOM =====
  const canvas = document.getElementById("game");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) throw new Error("canvas/context 取得失敗");

  const HUD = {
    time: document.getElementById("time"),
    life: document.getElementById("life"),
    power: document.getElementById("power"),
    capacity: document.getElementById("capacity"),
    cal: document.getElementById("cal"),
  };
  const toastEl = document.getElementById("toast");
  const toast=(m,ms=1100)=>{ if(!toastEl) return; toastEl.textContent=m; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),ms); };
  const safeBind=(el,ev,fn,opts)=>{ if(!el){console.warn("[bind-skip]",ev);return;} el.addEventListener(ev,fn,opts); };

  // ===== 定数 =====
  // ゴーストの歩幅：60fps想定で 12tick ≒ 0.20秒/歩
  const GHOST_STEP_TICKS = 70; // 遅くしたいほど数値を大きく（例: 14〜16）
  const GHOST_TURN_CHANCE = 0.20; 

  const COLS=15, ROWS=13, TILE=40;
  canvas.width = COLS*TILE; canvas.height = ROWS*TILE;

  const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const DIR_KEYS = new Map([["ArrowUp","up"],["ArrowDown","down"],["ArrowLeft","left"],["ArrowRight","right"]]);

  // セル種別
  const HARD = 1;   // 硬い壁
  const SOFT = 2;   // 壊せる壁
  const P_SPAWN = 3;
  const GOAL = 5;   // ゴール
  const FLOOR = 0;

  // 色
  const C = {
    floor:"#1a2234", hard:"#3c4766", soft:"#6e7aa0", goal:"#a48bff",
    bomb:"#ffd166", flame:"#ff6b6b", item:"#8dd3ff",
    player:"#7cf29a", ghost:"#b784ff"
  };

  // ===== 状態 =====
  const state = {
    grid: null,
    timeLeft: 180, life: 3, power: 2, capacity: 1, cal: 0,
    player: { x:1, y:1, dir:"right" },
    bombs: [],     // {x,y,timer,range,exploded,owner:'player'}
    flames: [],    // {x,y,timer}
    items: [],     // 6=Pow,7=Cap,8=Boost(今回はCal+10に変換),9=Cal+30
    ghosts: [],    // {x,y,moveCD}
    cleared:false, gameOver:false,
    tick:0,
    goalPos: {x: COLS-2, y: ROWS-2} // 「元NPC位置」をゴールに
  };

  // ===== ユーティリティ =====
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
  const cell=(x,y)=>state.grid[y]?.[x] ?? HARD;
  const setCell=(x,y,v)=>{ if(state.grid[y] && typeof state.grid[y][x]!=="undefined") state.grid[y][x]=v; };
  const rnd=(a,b)=>Math.random()*(b-a)+a;
  const maybe=(p)=>Math.random()<p;
  const same=(a,b)=>a.x===b.x && a.y===b.y;

  // ===== マップ生成：外周硬壁、内部ランダム、硬壁が隣接しない制約 =====
  function generateMap(){
    const g = Array.from({length:ROWS}, ()=>Array(COLS).fill(FLOOR));

    // 外周は硬壁
    for(let x=0;x<COLS;x++){ g[0][x]=HARD; g[ROWS-1][x]=HARD; }
    for(let y=0;y<ROWS;y++){ g[y][0]=HARD; g[y][COLS-1]=HARD; }

    // 内側：硬壁候補をランダム配置。ただし上下左右に既存硬壁があるところは禁止
    // 密度は 0.18 程度
    const hardProb = 0.18;
    for(let y=1;y<ROWS-1;y++){
      for(let x=1;x<COLS-1;x++){
        if ((x===1 && y===1) || (x===state.goalPos.x && y===state.goalPos.y)) continue; // スタート/ゴールは避ける
        if (maybe(hardProb) && canPlaceHard(g,x,y)){
          g[y][x] = HARD;
        }
      }
    }

    // 残りの床に ソフト壁 をそこそこ配置（0.55くらい）
    for(let y=1;y<ROWS-1;y++){
      for(let x=1;x<COLS-1;x++){
        if (g[y][x]===FLOOR && (x!==1||y!==1) && (x!==state.goalPos.x||y!==state.goalPos.y)){
          g[y][x] = maybe(0.55) ? SOFT : FLOOR;
        }
      }
    }

    // スタート周りとゴール周りは通路確保（2x2を床に）
    for (const p of [{x:1,y:1},{x:state.goalPos.x,y:state.goalPos.y}]){
      for(let dy=0; dy<=1; dy++){
        for(let dx=0; dx<=1; dx++){
          const xx = clamp(p.x+dx,1,COLS-2);
          const yy = clamp(p.y+dy,1,ROWS-2);
          g[yy][xx] = FLOOR;
        }
      }
    }

    // プレイヤー/ゴール印
    g[1][1] = P_SPAWN;
    g[state.goalPos.y][state.goalPos.x] = GOAL;

    return g;
  }

  function canPlaceHard(g,x,y){
    // 上下左右のどれかに HARD があるなら不可（隣接禁止）
    const n = [[0,-1],[0,1],[-1,0],[1,0]];
    for(const [dx,dy] of n){
      const xx=x+dx, yy=y+dy;
      if (!inBounds(xx,yy)) continue;
      if (g[yy][xx]===HARD) return false;
    }
    return true;
  }

  // ===== 初期化 =====
  state.grid = generateMap();
  // プレイヤー座標セット
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if (state.grid[y][x]===P_SPAWN){ state.grid[y][x]=FLOOR; state.player.x=x; state.player.y=y; }
  }

  // HUD初期
  if (HUD.time) HUD.time.textContent = state.timeLeft;
  if (HUD.life) HUD.life.textContent = state.life;
  if (HUD.power) HUD.power.textContent = state.power;
  if (HUD.capacity) HUD.capacity.textContent = state.capacity;
  if (HUD.cal) HUD.cal.textContent = state.cal;

  // ===== 入力（1押し=1マス） =====
  document.addEventListener("keydown",(e)=>{
    if (state.gameOver || state.cleared) return;
    if (DIR_KEYS.has(e.key)) { e.preventDefault(); tryMovePlayer(DIR_KEYS.get(e.key)); }
    else if (e.key===" ") { e.preventDefault(); placeBomb(); }
  });
  // タッチ
  document.querySelectorAll(".btn.dir").forEach(btn=>{
    const dir = btn.dataset.dir;
    safeBind(btn,"click",(e)=>{e.preventDefault(); tryMovePlayer(dir);});
    safeBind(btn,"touchstart",(e)=>{e.preventDefault(); tryMovePlayer(dir);},{passive:false});
  });
  safeBind(document.getElementById("bombBtn"),"click",()=>placeBomb());
  safeBind(document.getElementById("retry"),"click",()=>resetGame());

  // ===== プレイヤー移動 =====
  function tryMovePlayer(dirName){
    const d = DIRS[dirName]; if(!d) return;
    state.player.dir = dirName;
    const nx = clamp(state.player.x + d.x, 0, COLS-1);
    const ny = clamp(state.player.y + d.y, 0, ROWS-1);
    // 爆弾の上は歩けない
    const bombHere = state.bombs.some(b=>!b.exploded && b.x===nx && b.y===ny);
    if (!bombHere && cell(nx,ny)!==HARD && cell(nx,ny)!==SOFT){
      state.player.x=nx; state.player.y=ny;
      pickupItem(nx,ny);
      // ゴール到達
      if (nx===state.goalPos.x && ny===state.goalPos.y){
        state.cleared=true; toast("🎉 クリア！");
      }
    }
    // ゴースト接触
    if (state.ghosts.some(g=>g.x===state.player.x && g.y===state.player.y)){
      die("ゴーストに触れた…");
    }
  }

  // ===== ゴースト（爆弾無効・追尾）=====
  // --- ランダム徘徊AI（追尾しない） ---
function updateGhosts(){
  for (const g of state.ghosts){
    // 1マスずつ、GHOST_STEP_TICKS ごとに動く
    if (--g.moveCD > 0) continue;
    g.moveCD = GHOST_STEP_TICKS;

    // たまに向きを変える
    if (!g.dir || Math.random() < GHOST_TURN_CHANCE){
      g.dir = ["up","down","left","right"][(Math.random()*4)|0];
    }

    // 進行方向が壁なら、回せるだけ回して進める方向を探す
    let tries = 0;
    while (tries < 4){
      const d = DIRS[g.dir];
      const nx = clamp(g.x + d.x, 0, COLS-1);
      const ny = clamp(g.y + d.y, 0, ROWS-1);
      // ゴーストは爆弾・爆風無視、硬い壁だけは通れない
      if (cell(nx,ny) !== 1 /* HARD */){
        g.x = nx; g.y = ny;
        break;
      }else{
        // 向きを変えて再試行
        g.dir = ["up","down","left","right"][(Math.random()*4)|0];
        tries++;
      }
    }

    // 接触したらアウト
    if (g.x === state.player.x && g.y === state.player.y){
      die("ゴーストに触れた…");
    }
  }
}

// --- 生成時：最初の向き＆クールダウン設定 ---
function maybeSpawnGhost(x,y){
  if (Math.random() < 0.25){ // 出現率はお好みで
    state.ghosts.push({
      x, y,
      moveCD: GHOST_STEP_TICKS,                        // 生成直後から「遅いテンポ」
      dir: ["up","down","left","right"][(Math.random()*4)|0]
    });
    toast("👻 ゴーストが現れた！");
  }
}


  // BFSで次の一歩（硬壁のみ障害、爆弾/炎は無視＝すり抜け）
  function nextStepTowards(from, to){
    const key=(x,y)=>`${x},${y}`;
    const q=[from];
    const prev=new Map();
    const seen=new Set([key(from.x,from.y)]);
    const neighbors = (x,y)=>[
      {x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}
    ].filter(p=>inBounds(p.x,p.y) && cell(p.x,p.y)!==HARD);

    while(q.length){
      const cur = q.shift();
      if (cur.x===to.x && cur.y===to.y) break;
      for(const nb of neighbors(cur.x,cur.y)){
        const k=key(nb.x,nb.y);
        if (seen.has(k)) continue;
        seen.add(k); prev.set(k,cur); q.push(nb);
      }
    }
    // 復元
    const goalKey = key(to.x,to.y);
    if (!prev.has(goalKey)) return null;
    // to から from まで戻って、最初の一歩を返す
    let cur = to;
    while (prev.has(key(cur.x,cur.y))){
      const p = prev.get(key(cur.x,cur.y));
      if (p.x===from.x && p.y===from.y) return cur;
      cur = p;
    }
    return null;
  }

  // ===== 爆弾 =====
  function placeBomb(){
    if(state.gameOver||state.cleared) return;
    const active = state.bombs.filter(b=>!b.exploded).length;
    if (active >= state.capacity){ toast("💣 これ以上置けない！"); return; }
    const {x,y} = state.player;
    // 足元に既に爆弾があると置けない
    if (state.bombs.some(b=>!b.exploded && b.x===x && b.y===y)){ toast("そこには置けない！"); return; }
    state.bombs.push({x,y,timer:120,range:state.power,exploded:false,owner:"player"});
  }

  function updateBombs(){
    for(const b of state.bombs){
      if (b.exploded) continue;
      if (--b.timer<=0){
        explode(b); b.exploded=true;
      }
    }
  }

  function explode(b){
    addFlame(b.x,b.y);
    for (const dirName of ["up","down","left","right"]){
      const d = DIRS[dirName];
      for(let i=1;i<=b.range;i++){
        const tx=b.x+d.x*i, ty=b.y+d.y*i;
        const c = cell(tx,ty);
        if (c===HARD) break;       // 硬壁で停止
        addFlame(tx,ty);
        if (c===SOFT){             // ソフトは破壊して停止＆抽選
          setCell(tx,ty,FLOOR);
          maybeSpawnItem(tx,ty);
          maybeSpawnGhost(tx,ty);  // ★ 破壊時にゴースト抽選
          break;
        }
      }
    }
    checkFlameHits();
  }

  const addFlame=(x,y)=>state.flames.push({x,y,timer:24});
  function updateFlames(){ state.flames = state.flames.filter(f=>--f.timer>0); }

  // 爆風当たり判定（プレイヤーのみ／ゴーストは無効）
  function checkFlameHits(){
    const hits = new Set(state.flames.map(f=>`${f.x},${f.y}`));
    if (hits.has(`${state.player.x},${state.player.y}`)) die("爆風に巻き込まれた…");
  }

  // ===== ゴースト出現（25%）=====
  function maybeSpawnGhost(x,y){
  if (Math.random() < 0.25){
    state.ghosts.push({ x, y, moveCD: GHOST_STEP_TICKS }); // ← 生成直後から遅いテンポ
    toast("👻 ゴーストが現れた！");
  }
}

  // ===== アイテム =====
  function maybeSpawnItem(x,y){
    if (!maybe(0.35)) return;
    const kinds = [6,7,8,9]; const type = kinds[(Math.random()*kinds.length)|0];
    state.items.push({x,y,type});
  }

  function pickupItem(x,y){
    const i = state.items.findIndex(it=>it.x===x && it.y===y);
    if (i<0) return;
    const it = state.items[i]; state.items.splice(i,1);
    switch(it.type){
      case 6: state.power = clamp(state.power+1,1,8); if(HUD.power) HUD.power.textContent = state.power; toast("🔥 パワーUP！"); break;
      case 7: state.capacity = clamp(state.capacity+1,1,5); if(HUD.capacity) HUD.capacity.textContent = state.capacity; toast("💣 同時設置+1！"); break;
      case 8: state.cal+=10; if(HUD.cal) HUD.cal.textContent=state.cal; toast("📦 ブースト！（+10Cal）"); break; // 速度は使わないのでCalに
      case 9: state.cal+=30; if(HUD.cal) HUD.cal.textContent=state.cal; toast("🍙 カロリーGET！"); break;
    }
  }

  // ===== ライフ・リセット =====
  function die(reason="やられた…"){
    if(state.gameOver||state.cleared) return;
    state.life--; if(HUD.life) HUD.life.textContent = state.life;
    toast(`💥 ${reason}`);
    if (state.life<=0){ state.gameOver=true; toast("💀 GAME OVER"); return; }
    // 初期位置へ
    state.player.x = 1; state.player.y = 1;
  }

  function resetGame(){
    state.grid = generateMap();
    state.bombs.length=0; state.flames.length=0; state.items.length=0; state.ghosts.length=0;
    Object.assign(state, {timeLeft:180, life:3, power:2, capacity:1, cal:0, cleared:false, gameOver:false, tick:0});
    // スタートセット
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if (state.grid[y][x]===P_SPAWN){ state.grid[y][x]=FLOOR; state.player.x=x; state.player.y=y; }
    }
    if (HUD.time) HUD.time.textContent = state.timeLeft;
    if (HUD.life) HUD.life.textContent = state.life;
    if (HUD.power) HUD.power.textContent = state.power;
    if (HUD.capacity) HUD.capacity.textContent = state.capacity;
    if (HUD.cal) HUD.cal.textContent = state.cal;
  }

  // ===== 更新・描画 =====
  function update(){
    if (state.gameOver || state.cleared) return;
    if (++state.tick % 60 === 0){
      state.timeLeft--; if (HUD.time) HUD.time.textContent = state.timeLeft;
      if (state.timeLeft<=0) die("時間切れ…");
    }
    updateBombs();
    updateFlames();
    updateGhosts();
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // 地形
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const c=cell(x,y), px=x*TILE, py=y*TILE;
      // 床
      ctx.fillStyle=C.floor; ctx.fillRect(px,py,TILE,TILE);
      if (c===HARD){ ctx.fillStyle=C.hard; ctx.fillRect(px+2,py+2,TILE-4,TILE-4); }
      else if (c===SOFT){ ctx.fillStyle=C.soft; ctx.fillRect(px+4,py+4,TILE-8,TILE-8); }
      else if (x===state.goalPos.x && y===state.goalPos.y){ ctx.strokeStyle=C.goal; ctx.lineWidth=3; ctx.strokeRect(px+6,py+6,TILE-12,TILE-12); }
    }
    // アイテム
    for(const it of state.items){
      const px=it.x*TILE, py=it.y*TILE;
      ctx.fillStyle=C.item; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.28,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#0d0f13"; ctx.font="bold 18px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText({6:"P",7:"C",8:"S",9:"K"}[it.type], px+TILE/2, py+TILE/2+1);
    }
    // 爆弾
    for(const b of state.bombs){
      if (b.exploded) continue;
      const px=b.x*TILE, py=b.y*TILE;
      ctx.fillStyle=C.bomb; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#333"; ctx.beginPath(); ctx.moveTo(px+TILE/2,py+TILE/2); ctx.lineTo(px+TILE*0.75,py+TILE*0.25); ctx.stroke();
    }
    // 炎
    for(const f of state.flames){
      const px=f.x*TILE, py=f.y*TILE, pad=6+(f.timer%4);
      ctx.fillStyle=C.flame; ctx.fillRect(px+pad,py+pad,TILE-pad*2,TILE-pad*2);
    }
    // ゴースト
    for(const g of state.ghosts){
      const px=g.x*TILE, py=g.y*TILE;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle=C.ghost;
      ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, TILE*0.32, 0, Math.PI*2); ctx.fill();
      // 目
      ctx.fillStyle="#0d0f13"; ctx.fillRect(px+12,py+12,6,6); ctx.fillRect(px+TILE-18,py+12,6,6);
      ctx.globalAlpha = 1;
    }
    // プレイヤー
    const p=state.player, ppx=p.x*TILE, ppy=p.y*TILE;
    ctx.fillStyle=C.player; ctx.fillRect(ppx+5,ppy+5,TILE-10,TILE-10);
    ctx.fillStyle="#0d0f13"; ctx.fillRect(ppx+12,ppy+12,6,6); ctx.fillRect(ppx+TILE-18,ppy+12,6,6);

    // 幕
    if(state.cleared||state.gameOver){
      ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#fff"; ctx.font="bold 36px system-ui,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(state.cleared?"🎉 CLEAR!":"💀 GAME OVER", canvas.width/2, canvas.height/2);
    }
  }

  // ===== ループ =====
  let last=0; function loop(ts){ const dt=(ts-last)/16.67; last=ts; update(dt); draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
}
