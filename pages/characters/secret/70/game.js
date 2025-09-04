/* 美食家さん｜激むず70（ボンバーマン型・3フェーズ：崩落P3）
 * P1: ランダムマップ → ゴールで P2
 * P2: ボス戦（HP=3・弾）… A:ゆる判定＋硬直 / B:炎寿命延長 / D:射撃後硬直
 * P3: 崩落（15s耐久）… ランダムに床がヒビ→崩落（穴）。穴に触れると失敗
 * CLEAR: unlockSecret(70,"secret_70.png")
 */

window.addEventListener("load", () => {
  try { boot(); } catch (e) {
    console.error("[hard70] boot error:", e);
    alert("ゲーム初期化エラー。コンソールをご確認ください。");
  }
});

function boot(){
  if (window.__hard70Booted) { console.warn("hard70: already booted"); return; }
  window.__hard70Booted = true;

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
  const GHOST_STEP_TICKS = 50;
  const GHOST_TURN_CHANCE = 0.20;

  const BOSS_STEP_TICKS  = 70;
  const BOSS_HP_MAX      = 3;

  const BULLET_STEP_TICKS   = 5;
  const BOSS_SHOOT_COOLDOWN = 48;
  const BOSS_PATTERN_ALT    = true;

  const BOMB_ARM_TICKS = 8; // 誤爆防止

  // Phase3（崩落）
  const PH3_TIME_SEC     = 15;  // 生存秒
  const PH3_SPAWN_TICKS  = 28;  // 新規ヒビの発生間隔（tick）
  const PH3_CRACK_TTL    = 36;  // ヒビ→崩落までのtick（≈0.6s）
  const PH3_SAFE_RADIUS  = 1;   // プレイヤー近傍はヒビ対象外（Chebyshev距離）
  const PH3_BATCH_MIN    = 3;   // 1バッチの最小ヒビ数
  const PH3_BATCH_MAX    = 7;   // 1バッチの最大ヒビ数（時間経過で上限寄りに）

  const COLS=15, ROWS=13, TILE=40;
  canvas.width = COLS*TILE; canvas.height = ROWS*TILE;

  const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const DIR_KEYS = new Map([["ArrowUp","up"],["ArrowDown","down"],["ArrowLeft","left"],["ArrowRight","right"]]);
  const dirs = ["up","down","left","right"];
  const randDir = ()=>dirs[(Math.random()*4)|0];

  // セル種別
  const HARD = 1, SOFT = 2, P_SPAWN = 3, GOAL = 5, FLOOR = 0, VOID = 9; // VOID=穴

  // 色
  const C = {
    floor:"#1a2234", hard:"#3c4766", soft:"#6e7aa0", goal:"#a48bff",
    bomb:"#ffd166", flame:"#ff6b6b", item:"#8dd3ff",
    player:"#7cf29a", ghost:"#b784ff", boss:"#ff5bb0", bullet:"#ffe06b",
    crack:"#ef4444", hole:"#05070c"
  };

  // ===== 状態 =====
  const state = {
    phase: 1, // 1=通常, 2=ボス, 3=崩落, 4=完全クリア
    grid: null,
    timeLeft: 180, life: 3, power: 2, capacity: 1, cal: 0,
    player: { x:1, y:1, dir:"right" },
    bombs: [], flames: [], items: [],
    ghosts: [],    // {x,y,moveCD,dir}
    boss:   null,  // {x,y,moveCD,dir,hp,shootCD,shootAlt,stun}
    bullets: [],   // {x,y,dx,dy,moveCD}
    // P3 崩落管理
    ph3: { tLeft: PH3_TIME_SEC, spawnCD: PH3_SPAWN_TICKS, cracks: [] }, // cracks: {x,y,ttl}
    cleared:false, gameOver:false,
    tick:0,
    goalPos: {x: COLS-2, y: ROWS-2}
  };

  // ===== ユーティリティ =====
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
  const cell=(x,y)=>state.grid[y]?.[x] ?? HARD;
  const setCell=(x,y,v)=>{ if(state.grid[y] && typeof state.grid[y][x]!=="undefined") state.grid[y][x]=v; };
  const maybe=(p)=>Math.random()<p;
  const cheb=(ax,ay,bx,by)=>Math.max(Math.abs(ax-bx),Math.abs(ay-by));

  // ===== マップ生成 =====
  function generateStageMap(){
    const g = Array.from({length:ROWS}, ()=>Array(COLS).fill(FLOOR));
    for(let x=0;x<COLS;x++){ g[0][x]=HARD; g[ROWS-1][x]=HARD; }
    for(let y=0;y<ROWS;y++){ g[y][0]=HARD; g[y][COLS-1]=HARD; }
    const hardProb = 0.18;
    for(let y=1;y<ROWS-1;y++){
      for(let x=1;x<COLS-1;x++){
        if ((x===1 && y===1) || (x===state.goalPos.x && y===state.goalPos.y)) continue;
        if (maybe(hardProb) && canPlaceHard(g,x,y)) g[y][x] = HARD;
      }
    }
    for(let y=1;y<ROWS-1;y++){
      for(let x=1;x<COLS-1;x++){
        if (g[y][x]===FLOOR && (x!==1||y!==1) && (x!==state.goalPos.x||y!==state.goalPos.y)){
          g[y][x] = maybe(0.55) ? SOFT : FLOOR;
        }
      }
    }
    for (const p of [{x:1,y:1},{x:state.goalPos.x,y:state.goalPos.y}]){
      for(let dy=0; dy<=1; dy++) for(let dx=0; dx<=1; dx++){
        const xx = clamp(p.x+dx,1,COLS-2), yy = clamp(p.y+dy,1,ROWS-2);
        g[yy][xx] = FLOOR;
      }
    }
    g[1][1] = P_SPAWN;
    g[state.goalPos.y][state.goalPos.x] = GOAL;
    return g;
  }

  function generateBossArena(){
    const g = Array.from({length:ROWS}, ()=>Array(COLS).fill(FLOOR));
    for(let x=0;x<COLS;x++){ g[0][x]=HARD; g[ROWS-1][x]=HARD; }
    for(let y=0;y<ROWS;y++){ g[y][0]=HARD; g[y][COLS-1]=HARD; }
    const pillarProb = 0.12;
    for(let y=2;y<ROWS-2;y++){
      for(let x=2;x<COLS-2;x++){
        if ((x%2===0 && y%2===0) && canPlaceHard(g,x,y) && maybe(pillarProb)){
          g[y][x] = HARD;
        }
      }
    }
    return g;
  }

  function generateCollapseArena(){
    // 柱少なめの広めアリーナ
    const g = Array.from({length:ROWS}, ()=>Array(COLS).fill(FLOOR));
    for(let x=0;x<COLS;x++){ g[0][x]=HARD; g[ROWS-1][x]=HARD; }
    for(let y=0;y<ROWS;y++){ g[y][0]=HARD; g[y][COLS-1]=HARD; }
    const pillarProb = 0.08;
    for(let y=2;y<ROWS-2;y++){
      for(let x=2;x<COLS-2;x++){
        if ((x%2===0 && y%2===0) && canPlaceHard(g,x,y) && maybe(pillarProb)){
          g[y][x] = HARD;
        }
      }
    }
    return g;
  }

  function canPlaceHard(g,x,y){
    const n = [[0,-1],[0,1],[-1,0],[1,0]];
    for(const [dx,dy] of n){
      const xx=x+dx, yy=y+dy;
      if (!inBounds(xx,yy)) continue;
      if (g[yy][xx]===HARD) return false;
    }
    return true;
  }

  // ===== 初期化 =====
  enterPhase1();

  // HUD初期
  if (HUD.time) HUD.time.textContent = state.timeLeft;
  if (HUD.life) HUD.life.textContent = state.life;
  if (HUD.power) HUD.power.textContent = state.power;
  if (HUD.capacity) HUD.capacity.textContent = state.capacity;
  if (HUD.cal) HUD.cal.textContent = state.cal;

  // ===== 入力 =====
  document.addEventListener("keydown",(e)=>{
    if (e.repeat) return;
    if (state.gameOver || state.cleared) return;
    if (DIR_KEYS.has(e.key)) { e.preventDefault(); tryMovePlayer(DIR_KEYS.get(e.key)); }
    else if (e.key === " ") { e.preventDefault(); placeBomb(); }
  });

  document.querySelectorAll(".btn.dir").forEach(btn=>{
    const dir = btn.dataset.dir;
    safeBind(btn,"click",(e)=>{e.preventDefault(); tryMovePlayer(dir);});
    safeBind(btn,"touchstart",(e)=>{e.preventDefault(); tryMovePlayer(dir);},{passive:false});
  });
  safeBind(document.getElementById("bombBtn"),"click",()=>placeBomb());
  safeBind(document.getElementById("retry"),"click",()=>resetGame());

  // ===== フェーズ管理 =====
  function enterPhase1(){
    state.phase = 1;
    state.grid = generateStageMap();
    state.bombs.length=0; state.flames.length=0; state.items.length=0;
    state.ghosts.length=0; state.bullets.length=0;
    state.boss = null;
    // プレイヤー初期位置
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if (state.grid[y][x]===P_SPAWN){ state.grid[y][x]=FLOOR; state.player.x=x; state.player.y=y; }
    }
    toast("Stage 1 開始！");
  }

  function startBossBattle(){
    state.phase = 2;
    state.grid = generateBossArena();
    state.bombs.length=0; state.flames.length=0; state.items.length=0;
    state.ghosts.length=0; state.bullets.length=0;
    state.player.x = 1; state.player.y = 1;
    const bx = (COLS/2)|0, by = (ROWS/2)|0;
    state.boss = {
      x: bx, y: by, moveCD: BOSS_STEP_TICKS, dir: randDir(),
      hp: BOSS_HP_MAX, shootCD: BOSS_SHOOT_COOLDOWN, shootAlt: false, stun: 0
    };
    toast("⚔️ ボス戦開始！");
  }

  function startPhase3(){
    state.phase = 3;
    state.grid = generateCollapseArena();
    state.bombs.length=0; state.flames.length=0; state.items.length=0;
    state.ghosts.length=0; state.bullets.length=0;
    state.boss = null;
    state.player.x = 1; state.player.y = 1;
    state.ph3 = { tLeft: PH3_TIME_SEC, spawnCD: PH3_SPAWN_TICKS, cracks: [] };
    toast("⚠️ 最終ステージ：崩落を耐えろ（15s）！");
  }

  function finalClear(){
    state.cleared = true;
    state.phase = 4;
    toast("🎉 CLEAR! コンプリート！");
    try { window.unlockSecret?.(70, "secret_70.png"); } catch (e) { console.warn("unlockSecret failed:", e); }
  }

  // ===== プレイヤー移動 =====
  function tryMovePlayer(dirName){
    const d = DIRS[dirName]; if(!d) return;
    state.player.dir = dirName;
    const nx = clamp(state.player.x + d.x, 0, COLS-1);
    const ny = clamp(state.player.y + d.y, 0, ROWS-1);

    // 爆弾上は禁止
    const bombHere = state.bombs.some(b=>!b.exploded && b.x===nx && b.y===ny);
    if (!bombHere && cell(nx,ny)!==HARD && cell(nx,ny)!==SOFT){
      state.player.x=nx; state.player.y=ny;
      if (state.phase===1) pickupItem(nx,ny);
      if (state.phase===1 && nx===state.goalPos.x && ny===state.goalPos.y){
        startBossBattle();
      }
    }

    // P1 接触
    if (state.phase===1 && state.ghosts.some(g=>g.x===state.player.x && g.y===state.player.y)) die("ゴーストに触れた…");
    // P2 接触
    if (state.phase===2 && state.boss && state.boss.x===state.player.x && state.boss.y===state.player.y) die("ボスに触れた…");

    // P3 穴チェック（移動直後）
    if (state.phase===3 && cell(state.player.x, state.player.y)===VOID) die("穴に落ちた…");
  }

  // ===== ゴースト（Phase1のみ）=====
  function updateGhosts(){
    if (state.phase!==1) return;
    for (const g of state.ghosts){
      if (--g.moveCD > 0) continue;
      g.moveCD = GHOST_STEP_TICKS;
      if (!g.dir || Math.random() < GHOST_TURN_CHANCE) g.dir = randDir();
      let tries = 0;
      while (tries < 4){
        const d = DIRS[g.dir];
        const nx = clamp(g.x + d.x, 0, COLS-1);
        const ny = clamp(g.y + d.y, 0, ROWS-1);
        if (cell(nx,ny) !== HARD){ g.x = nx; g.y = ny; break; }
        g.dir = randDir(); tries++;
      }
      if (g.x === state.player.x && g.y === state.player.y) die("ゴーストに触れた…");
    }
  }

  // ===== ボス（Phase2）=====
  function updateBoss(){
    if (state.phase!==2 || !state.boss) return;
    const b = state.boss;
    if (b.stun && --b.stun > 0) return;
    if (--b.moveCD <= 0){
      b.moveCD = BOSS_STEP_TICKS;
      let tries = 0;
      if (!b.dir) b.dir = randDir();
      while (tries < 4){
        const d = DIRS[b.dir];
        const nx = clamp(b.x + d.x, 0, COLS-1);
        const ny = clamp(b.y + d.y, 0, ROWS-1);
        if (cell(nx,ny) !== HARD){ b.x = nx; b.y = ny; break; }
        b.dir = randDir(); tries++;
      }
      if (b.x===state.player.x && b.y===state.player.y) die("ボスに触れた…");
    }
    if (--b.shootCD <= 0){
      b.shootCD = BOSS_SHOOT_COOLDOWN;
      if (BOSS_PATTERN_ALT){ b.shootAlt = !b.shootAlt; if (b.shootAlt) shootAimed(b); else shootCross(b); }
      else { shootAimed(b); }
      b.stun = Math.max(b.stun||0, 10); // 射撃後硬直
    }
  }

  // --- 射撃（P2） ---
  function shootAimed(b){
    const dx = state.player.x - b.x, dy = state.player.y - b.y;
    const dir = (Math.abs(dx) >= Math.abs(dy)) ? (dx>=0?"right":"left") : (dy>=0?"down":"up");
    pushBulletFrom(b.x, b.y, dir);
    toast("🔸 ボスが撃ってきた！");
  }
  function shootCross(b){
    pushBulletFrom(b.x, b.y, "up");
    pushBulletFrom(b.x, b.y, "down");
    pushBulletFrom(b.x, b.y, "left");
    pushBulletFrom(b.x, b.y, "right");
    toast("✝ ボスが十字弾を放った！");
  }

  // ===== 崩落（Phase3）=====
  function updatePhase3Collapse(){
    if (state.phase!==3) return;

    // 残り時間カウント（1秒単位）
    if (state.tick % 60 === 0){
      state.ph3.tLeft--;
      if (state.ph3.tLeft <= 0){ finalClear(); return; }
    }

    // 既存ヒビの寿命→穴化
    const nextCracks = [];
    for (const c of state.ph3.cracks){
      c.ttl--;
      if (c.ttl <= 0){
        // 穴に変化
        if (cell(c.x,c.y)!==HARD) setCell(c.x,c.y,VOID);
      }else{
        nextCracks.push(c);
      }
    }
    state.ph3.cracks = nextCracks;

    // 穴の上に立っていたらアウト（足元が崩れた）
    if (cell(state.player.x, state.player.y)===VOID) { die("床が崩れた…"); return; }

    // 新規ヒビの発生
    if (--state.ph3.spawnCD <= 0){
      // 経過に応じて数を増やす（終盤ほど多い）
      const prog = 1 - (state.ph3.tLeft/PH3_TIME_SEC); // 0→1
      const bmin = PH3_BATCH_MIN;
      const bmax = PH3_BATCH_MAX;
      const batch = Math.floor(bmin + (bmax-bmin)*prog + 0.5);

      spawnCracks(batch);
      state.ph3.spawnCD = PH3_SPAWN_TICKS;
    }
  }

  function spawnCracks(n){
    // 対象候補：床 or ソフト（P3ではソフトは残してあるが、impassableじゃないのでOK）
    // ただし HARD と VOID は除外。既にヒビのセルも除外。プレイヤー周囲は除外。
    const px = state.player.x, py = state.player.y;
    const isCrackAt = (x,y)=>state.ph3.cracks.some(c=>c.x===x && c.y===y);
    const candidates = [];
    for(let y=1;y<ROWS-1;y++){
      for(let x=1;x<COLS-1;x++){
        const c = cell(x,y);
        if (c===HARD || c===VOID) continue;
        if (cheb(x,y,px,py) <= PH3_SAFE_RADIUS) continue;
        if (isCrackAt(x,y)) continue;
        candidates.push({x,y});
      }
    }
    // シャッフルして先頭n件
    for (let i=candidates.length-1;i>0;i--){
      const j=(Math.random()*(i+1))|0; const t=candidates[i]; candidates[i]=candidates[j]; candidates[j]=t;
    }
    const pick = candidates.slice(0,n);
    for (const p of pick){
      state.ph3.cracks.push({x:p.x, y:p.y, ttl: PH3_CRACK_TTL});
    }
    if (pick.length>0) toast("⚡ 床にヒビが入った！");
  }

  // ===== 弾ユーティリティ／更新 =====
  function pushBulletFrom(x,y,dirName){
    const d = DIRS[dirName]; if(!d) return;
    state.bullets.push({ x, y, dx:d.x, dy:d.y, moveCD: BULLET_STEP_TICKS });
  }
  function updateBullets(){
    if (state.bullets.length===0) return;
    const next = [];
    for (const blt of state.bullets){
      if (--blt.moveCD <= 0){
        blt.moveCD = BULLET_STEP_TICKS;
        const nx = clamp(blt.x + blt.dx, 0, COLS-1);
        const ny = clamp(blt.y + blt.dy, 0, ROWS-1);
        if (cell(nx,ny) === HARD) continue;
        blt.x = nx; blt.y = ny;
      }
      if (blt.x === state.player.x && blt.y === state.player.y){
        die("弾に当たった…"); continue;
      }
      next.push(blt);
    }
    state.bullets = next;
  }

  // ===== 爆弾 =====
  function placeBomb(){
    if(state.gameOver||state.cleared) return;
    const active = state.bombs.filter(b=>!b.exploded).length;
    if (active >= state.capacity){ toast("💣 これ以上置けない！"); return; }
    const {x,y} = state.player;
    if (state.bombs.some(b=>!b.exploded && b.x===x && b.y===y)){ toast("そこには置けない！"); return; }
    state.bombs.push({
      x, y, timer: 120, range: state.power, exploded: false, owner: "player",
      armTick: state.tick + BOMB_ARM_TICKS
    });
  }

  function updateBombs(){
    for(const b of state.bombs){
      if (b.exploded) continue;
      if (state.tick < (b.armTick || 0)) continue;
      if (--b.timer <= 0){ explode(b); b.exploded = true; }
    }
  }

  // ===== 爆発処理 =====
  function explode(b){
    const ttl = (state.phase===2 ? 36 : 24); // P2は炎寿命延長
    addFlame(b.x,b.y,ttl);
    for (const dirName of ["up","down","left","right"]){
      const d = DIRS[dirName];
      for(let i=1;i<=b.range;i++){
        const tx=b.x+d.x*i, ty=b.y+d.y*i;
        const c = cell(tx,ty);
        if (c===HARD) break;
        addFlame(tx,ty,ttl);
        if (state.phase===1 && c===SOFT){
          setCell(tx,ty,FLOOR);
          maybeSpawnItem(tx,ty);
          maybeSpawnGhost(tx,ty);
          break;
        }
      }
    }
    checkFlameHits();
  }

  const addFlame=(x,y,ttl=24)=>state.flames.push({x,y,timer:ttl});
  function updateFlames(){ state.flames = state.flames.filter(f=>--f.timer>0); }

  // ===== 爆風当たり判定 =====
  function checkFlameHits(){
    const hits = new Set(state.flames.map(f=>`${f.x},${f.y}`));
    // プレイヤー
    if (hits.has(`${state.player.x},${state.player.y}`)) die("爆風に巻き込まれた…");

    // ボス（P2のみ／ゆる判定＋硬直）
    if (state.phase===2 && state.boss){
      const b = state.boss;
      let bossHit = false;
      for (const f of state.flames){
        const dx = Math.abs(f.x - b.x), dy = Math.abs(f.y - b.y);
        if (Math.max(dx, dy) <= 1){ bossHit = true; break; }
      }
      if (bossHit){
        b.hp--; b.stun = Math.max(b.stun||0, 18);
        toast(`💥 ボスにダメージ！ (HP:${Math.max(0,b.hp)})`);
        if (b.hp<=0){ startPhase3(); }
      }
    }
  }

  // ===== ゴースト/アイテム（P1のみ）=====
  function maybeSpawnGhost(x,y){
    if (state.phase!==1) return;
    if (Math.random() < 0.25){
      state.ghosts.push({ x, y, moveCD: GHOST_STEP_TICKS, dir: randDir() });
      toast("👻 ゴーストが現れた！");
    }
  }
  function maybeSpawnItem(x,y){
    if (state.phase!==1) return;
    if (Math.random() < 0.35){
      const kinds = [6,7,8,9]; const type = kinds[(Math.random()*kinds.length)|0];
      state.items.push({x,y,type});
    }
  }
  function pickupItem(x,y){
    const i = state.items.findIndex(it=>it.x===x && it.y===y);
    if (i<0) return;
    const it = state.items[i]; state.items.splice(i,1);
    switch(it.type){
      case 6: state.power = clamp(state.power+1,1,8); if(HUD.power) HUD.power.textContent = state.power; toast("🔥 パワーUP！"); break;
      case 7: state.capacity = clamp(state.capacity+1,1,5); if(HUD.capacity) HUD.capacity.textContent = state.capacity; toast("💣 同時設置+1！"); break;
      case 8: state.cal+=10; if(HUD.cal) HUD.cal.textContent=state.cal; toast("📦 ブースト！（+10Cal）"); break;
      case 9: state.cal+=30; if(HUD.cal) HUD.cal.textContent = state.cal; toast("🍙 カロリーGET！"); break;
    }
  }

  // ===== ライフ・リセット =====
  function die(reason="やられた…"){
    if(state.gameOver||state.cleared) return;
    state.life--; if(HUD.life) HUD.life.textContent = state.life;
    toast(`💥 ${reason}`);
    if (state.life<=0){ state.gameOver=true; toast("💀 GAME OVER"); return; }
    // リスポーン
    state.player.x = 1; state.player.y = 1;
  }

  function resetGame(){
    state.bombs.length=0; state.flames.length=0; state.items.length=0;
    state.ghosts.length=0; state.bullets.length=0;
    Object.assign(state, {
      phase:1, timeLeft:180, life:3, power:2, capacity:1, cal:0,
      cleared:false, gameOver:false, tick:0, boss:null,
      ph3:{ tLeft: PH3_TIME_SEC, spawnCD: PH3_SPAWN_TICKS, cracks: [] }
    });
    enterPhase1();
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
    updateBoss();
    updatePhase3Collapse();
    updateBullets();
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // 地形
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const c=cell(x,y), px=x*TILE, py=y*TILE;
      // 床ベース
      ctx.fillStyle=C.floor; ctx.fillRect(px,py,TILE,TILE);
      if (c===HARD){ ctx.fillStyle=C.hard; ctx.fillRect(px+2,py+2,TILE-4,TILE-4); }
      else if (c===SOFT && state.phase===1){ ctx.fillStyle=C.soft; ctx.fillRect(px+4,py+4,TILE-8,TILE-8); }
      else if (state.phase===1 && x===state.goalPos.x && y===state.goalPos.y){ ctx.strokeStyle=C.goal; ctx.lineWidth=3; ctx.strokeRect(px+6,py+6,TILE-12,TILE-12); }
      else if (c===VOID){ ctx.fillStyle=C.hole; ctx.fillRect(px+4,py+4,TILE-8,TILE-8); }
    }
    // P3: ヒビ可視化
    if (state.phase===3){
      ctx.strokeStyle=C.crack; ctx.lineWidth=3;
      for (const c of state.ph3.cracks){
        const px=c.x*TILE, py=c.y*TILE;
        // ヒビ強度（残りTTLで太さを少し変える）
        const w = 2 + Math.max(0, (PH3_CRACK_TTL - c.ttl)/PH3_CRACK_TTL)*1.5;
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(px+6, py+6); ctx.lineTo(px+TILE-6, py+TILE-6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px+TILE-10, py+8); ctx.lineTo(px+8, py+TILE-10); ctx.stroke();
      }
      // 残り秒表示
      ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(0,0,canvas.width,34);
      ctx.fillStyle="#fff"; ctx.font="bold 20px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`崩落耐久：${state.ph3.tLeft}s`, canvas.width/2, 17);
    }

    // アイテム（P1のみ）
    if (state.phase===1){
      for(const it of state.items){
        const px=it.x*TILE, py=it.y*TILE;
        ctx.fillStyle=C.item; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.28,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#0d0f13"; ctx.font="bold 18px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText({6:"P",7:"C",8:"S",9:"K"}[it.type], px+TILE/2, py+TILE/2+1);
      }
    }
    // 爆弾
    for(const b of state.bombs){
      if (b.exploded) continue;
      const px=b.x*TILE, py=b.y*TILE;
      ctx.fillStyle=C.bomb; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#333"; ctx.beginPath(); ctx.moveTo(px+TILE/2,py+TILE/2); ctx.lineTo(px+TILE*0.75,py+TILE*0.25); ctx.stroke();
    }
    // 弾
    for(const blt of state.bullets){
      const px=blt.x*TILE, py=blt.y*TILE;
      ctx.fillStyle=C.bullet;
      ctx.fillRect(px+14, py+14, TILE-28, TILE-28);
    }
    // 炎
    for(const f of state.flames){
      const px=f.x*TILE, py=f.y*TILE, pad=6+(f.timer%4);
      ctx.fillStyle=C.flame; ctx.fillRect(px+pad,py+pad,TILE-pad*2,TILE-pad*2);
    }
    // ゴースト（P1）
    if (state.phase===1){
      for(const g of state.ghosts){
        const px=g.x*TILE, py=g.y*TILE;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle=C.ghost;
        ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, TILE*0.32, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle="#0d0f13"; ctx.fillRect(px+12,py+12,6,6); ctx.fillRect(px+TILE-18,py+12,6,6);
        ctx.globalAlpha = 1;
      }
    }
    // ボス（P2）
    if (state.phase===2 && state.boss){
      const b=state.boss, px=b.x*TILE, py=b.y*TILE;
      ctx.fillStyle=C.boss;
      ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, TILE*0.36, 0, Math.PI*2); ctx.fill();
      // HPバー
      ctx.fillStyle="#000"; ctx.fillRect(px+6, py+6, TILE-12, 6);
      ctx.fillStyle="#ffea00"; ctx.fillRect(px+6, py+6, (TILE-12)* (b.hp/BOSS_HP_MAX), 6);
    }

    // プレイヤー
    const p=state.player, ppx=p.x*TILE, ppy=p.y*TILE;
    ctx.fillStyle=C.player; ctx.fillRect(ppx+5,ppy+5,TILE-10,TILE-10);
    ctx.fillStyle="#0d0f13"; ctx.fillRect(ppx+12,ppy+12,6,6); ctx.fillRect(ppx+TILE-18,ppy+12,6,6);

    if(state.cleared||state.gameOver){
      ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#fff"; ctx.font="bold 36px system-ui,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(state.cleared?"🎉 CLEAR!":"💀 GAME OVER", canvas.width/2, canvas.height/2);
    }
  }

  // ===== ループ =====
  let last = 0;
  function loop(ts){
    const dt = (ts - last) / 16.67; last = ts;
    update(dt); draw();
    window.__hard70RafId = requestAnimationFrame(loop);
  }
  if (window.__hard70RafId) cancelAnimationFrame(window.__hard70RafId);
  window.__hard70RafId = requestAnimationFrame(loop);
}
