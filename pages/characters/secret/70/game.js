/* 美食家さん｜激むず70（ボンバーマン型）
   ■変更点（ご要望反映）
   - プレイヤー移動：1マスずつの離散移動（速度なし）
   - NPC：1人のみ。1マス移動＆爆弾設置で戦闘
   - ゴール条件：NPC撃破後に中央ゴールへ到達
*/

window.addEventListener("load", () => {
  try { boot(); } catch (e) {
    console.error("[hard70] boot error:", e);
    alert("初期化エラー。コンソールをご確認ください。");
  }
});

function boot(){
  // ---- 取得
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
  const toast=(m,ms=1000)=>{ if(!toastEl) return; toastEl.textContent=m; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),ms); };
  const safeBind=(el,ev,fn,opts)=>{ if(!el){console.warn("[bind-skip]",ev);return;} el.addEventListener(ev,fn,opts); };

  // ---- 定数
  const COLS=15, ROWS=13, TILE=40;
  canvas.width = COLS*TILE; canvas.height = ROWS*TILE;

  const DIRS = {
    up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0}
  };
  const DIR_KEYS = new Map([["ArrowUp","up"],["ArrowDown","down"],["ArrowLeft","left"],["ArrowRight","right"]]);

  // ---- マップ生成
  const baseMap = (()=>{
    const g = Array.from({length:ROWS},()=>Array(COLS).fill(2)); // 2=壊せる
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        if(y===0||y===ROWS-1||x===0||x===COLS-1){ g[y][x]=1; continue; } // 1=硬い
        if(y%2===0 && x%2===0) g[y][x]=1; // 柱
        if((x<=2&&y<=2) || (x>=COLS-3 && y>=ROWS-3)) g[y][x]=0; // 通路
      }
    }
    // スポーン
    g[1][1] = 3;                    // プレイヤー
    g[ROWS-2][COLS-2] = 4;          // NPC 1
    g[(ROWS/2|0)][(COLS/2|0)] = 5;  // ゴール
    return g;
  })();

  // ---- 状態
  const state = {
    grid: JSON.parse(JSON.stringify(baseMap)),
    timeLeft: 180, life: 3, power: 2, capacity: 1, cal: 0,

    player: { x:1, y:1, dir:"right", bombsPlaced:0 },
    npc:    null,  // {x,y,dir, bombsPlaced, aiCooldown}
    bombs: [],     // {x,y,timer,range,exploded,owner:'player'|'npc'}
    flames: [],    // {x,y,timer}
    items: [],     // {x,y,type}
    cleared:false, gameOver:false,

    tick:0
  };

  // ---- ヘルパ
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const cell=(x,y)=>state.grid[y]?.[x] ?? 1;
  const setCell=(x,y,v)=>{ if(state.grid[y] && typeof state.grid[y][x]!=="undefined") state.grid[y][x]=v; };
  const same=(a,b)=>a.x===b.x && a.y===b.y;
  const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const walkable=(x,y)=>{
    const c=cell(x,y);
    if(c===1||c===2) return false;                 // 壁不可
    if(state.bombs.some(b=>!b.exploded && b.x===x && b.y===y)) return false; // 爆弾上は不可
    return true;
  };

  // ---- スポーン配置スキャン
  (function scanSpawns(){
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(state.grid[y][x]===3){ state.grid[y][x]=0; state.player.x=x; state.player.y=y; }
    }
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(state.grid[y][x]===4){
        state.grid[y][x]=0;
        state.npc = { x, y, dir:"left", bombsPlaced:0, aiCooldown:0 };
      }
    }
  })();

  // ---- 入力：1マス移動（keydown 1回で1歩）
  document.addEventListener("keydown",(e)=>{
    if(state.gameOver || state.cleared) return;
    if (DIR_KEYS.has(e.key)) {
      e.preventDefault();
      tryMovePlayer(DIR_KEYS.get(e.key));
    } else if (e.key===" ") {
      e.preventDefault();
      placeBomb("player");
    }
  });

  // タッチ操作は「クリック1回=1歩」
  document.querySelectorAll(".btn.dir").forEach(btn=>{
    const dir = btn.dataset.dir;
    safeBind(btn,"click",(e)=>{e.preventDefault(); tryMovePlayer(dir);});
    safeBind(btn,"touchstart",(e)=>{e.preventDefault(); tryMovePlayer(dir);},{passive:false});
  });
  safeBind(document.getElementById("bombBtn"),"click",()=>placeBomb("player"));
  safeBind(document.getElementById("retry"),"click",()=>resetGame());

  // ---- プレイヤー1マス移動
  function tryMovePlayer(dirName){
    const d = DIRS[dirName]; if(!d) return;
    state.player.dir = dirName;
    const nx = clamp(state.player.x + d.x, 0, COLS-1);
    const ny = clamp(state.player.y + d.y, 0, ROWS-1);
    if (walkable(nx,ny)) {
      state.player.x=nx; state.player.y=ny;
      pickupItem(nx,ny);
      // ゴール案内 or クリア
      const gx=(COLS/2|0), gy=(ROWS/2|0);
      const npcAlive = !!state.npc;
      if (nx===gx && ny===gy) {
        if (npcAlive) toast("NPCを倒すとゴール可能！");
        else { state.cleared=true; toast("🎉 クリア！"); }
      }
      // NPC接触はダメージ扱い（即死亡）
      if (state.npc && same(state.player, state.npc)) die("NPCにぶつかった…");
    }
  }

  // ---- NPC AI（1マス移動 & 爆弾設置）
  function updateNPC(){
    if (!state.npc) return;
    const npc = state.npc;

    // 爆風やプレイヤー接触の死亡は別で判定

    // 爆弾設置ロジック
    // ・プレイヤーと距離2以内なら高確率で設置
    // ・ランダムでもたまに設置
    const dist = manhattan(npc, state.player);
    const activeBombsByNPC = state.bombs.filter(b=>!b.exploded && b.owner==="npc").length;
    const canPlace = activeBombsByNPC < state.capacity && walkable(npc.x, npc.y); // 自分足元に置けるか（＝他に爆弾ない）
    if (canPlace) {
      if (dist<=2 && Math.random()<0.4) placeBomb("npc");
      else if (Math.random()<0.02) placeBomb("npc");
    }

    // 移動クールダウン（離散ステップ：だいたい0.15sに1歩）
    if (--npc.aiCooldown > 0) return;
    npc.aiCooldown = 9; // 9tick ≒ 0.15s（60fps想定）

    // 進行方向：基本はプレイヤーへ近づく
    const candidates = [];
    // 4方向候補を作る（プレイヤーに近づく方向を優先）
    const dirs = ["up","down","left","right"];
    dirs.sort((a,b)=>{
      const da = manhattan({x:clamp(npc.x+DIRS[a].x,0,COLS-1), y:clamp(npc.y+DIRS[a].y,0,ROWS-1)}, state.player);
      const db = manhattan({x:clamp(npc.x+DIRS[b].x,0,COLS-1), y:clamp(npc.y+DIRS[b].y,0,ROWS-1)}, state.player);
      return da - db;
    });
    for (const name of dirs){
      const d = DIRS[name];
      const nx = clamp(npc.x + d.x, 0, COLS-1);
      const ny = clamp(npc.y + d.y, 0, ROWS-1);
      if (walkable(nx,ny)) candidates.push({name,nx,ny});
    }
    // 候補があれば最優先（たまにランダムズラし）
    let step = candidates[0] || null;
    if (candidates.length>1 && Math.random()<0.2) step = candidates[(Math.random()*candidates.length)|0];
    if (step){
      npc.dir = step.name;
      npc.x = step.nx; npc.y = step.ny;
      // プレイヤー接触でプレイヤー死亡
      if (same(npc, state.player)) die("NPCにぶつかった…");
      // アイテムはNPCも拾わない（拾わせたいなら pickupItem 呼び出し）
    }
  }

  // ---- 爆弾・爆発
  function placeBomb(owner){
    if(state.gameOver||state.cleared) return;
    const active = state.bombs.filter(b=>!b.exploded && b.owner===owner).length;
    if (active >= state.capacity) { if(owner==="player") toast("💣 これ以上置けない！"); return; }
    const pos = owner==="player" ? state.player : state.npc;
    if (!pos) return;
    // 足元に既に爆弾があれば置けない
    if (!walkable(pos.x,pos.y)) { if(owner==="player") toast("そこには置けない！"); return; }
    state.bombs.push({ x:pos.x, y:pos.y, timer:120, range:state.power, exploded:false, owner });
  }

  function updateBombs(){
    for(const b of state.bombs){
      if (b.exploded) continue;
      if (--b.timer <= 0){
        explode(b); b.exploded = true;
      }
    }
  }

  function explode(b){
    addFlame(b.x,b.y);
    for(const dirName of ["up","down","left","right"]){
      const d=DIRS[dirName];
      for(let i=1;i<=b.range;i++){
        const tx=b.x+d.x*i, ty=b.y+d.y*i, c=cell(tx,ty);
        if (c===1) break; // 硬壁で停止
        addFlame(tx,ty);
        if (c===2){        // 壊壁は破壊して停止
          setCell(tx,ty,0);
          maybeSpawnItem(tx,ty);
          break;
        }
      }
    }
    checkFlameHits();
  }

  const addFlame=(x,y)=>state.flames.push({x,y,timer:24});
  function updateFlames(){ state.flames = state.flames.filter(f=>--f.timer>0); }

  function checkFlameHits(){
    const hits = new Set(state.flames.map(f=>`${f.x},${f.y}`));
    // プレイヤー
    if (hits.has(`${state.player.x},${state.player.y}`)) die("爆風に巻き込まれた…");
    // NPC
    if (state.npc && hits.has(`${state.npc.x},${state.npc.y}`)){
      // NPC撃破（たまにアイテム）
      if (Math.random()<0.3) maybeSpawnItem(state.npc.x, state.npc.y, true);
      state.npc = null;
      state.cal += 150; if (HUD.cal) HUD.cal.textContent = state.cal;
      toast("🏁 NPCを倒した！");
    }
  }

  // ---- アイテム
  function maybeSpawnItem(x,y,force=false){
    if(!force && Math.random()<0.65) return;
    const pool=[6,7,8,9];           // 6=Pow,7=Cap,8=Speed(無効化気味),9=Cal
    const type=pool[(Math.random()*pool.length)|0];
    state.items.push({x,y,type});
  }
  function pickupItem(x,y){
    const i = state.items.findIndex(it=>it.x===x && it.y===y);
    if (i<0) return;
    const it = state.items[i]; state.items.splice(i,1);
    switch(it.type){
      case 6: state.power = clamp(state.power+1,1,8); if(HUD.power) HUD.power.textContent = state.power; toast("🔥 パワーUP！"); break;
      case 7: state.capacity = clamp(state.capacity+1,1,5); if(HUD.capacity) HUD.capacity.textContent = state.capacity; toast("💣 同時設置+1！"); break;
      case 8: /* 速度は無効化。ただのハズレ防止でCal付与 */ state.cal+=10; if(HUD.cal) HUD.cal.textContent=state.cal; toast("📦 ブースト！(+Cal)"); break;
      case 9: state.cal += 30; if(HUD.cal) HUD.cal.textContent = state.cal; toast("🍙 カロリーGET！"); break;
    }
  }

  // ---- ライフ & リセット
  function die(reason="やられた…"){
    if(state.gameOver||state.cleared) return;
    state.life--; if(HUD.life) HUD.life.textContent = state.life;
    toast(`💥 ${reason}`);
    if(state.life<=0){ state.gameOver=true; toast("💀 GAME OVER"); return; }
    // 初期位置へ
    state.player.x=1; state.player.y=1;
  }

  function resetGame(){
    state.grid = JSON.parse(JSON.stringify(baseMap));
    Object.assign(state, {
      timeLeft:180, life:3, power:2, capacity:1, cal:0, cleared:false, gameOver:false, tick:0,
      bombs:[], flames:[], items:[]
    });
    // 再スポーン
    state.player = { x:1, y:1, dir:"right", bombsPlaced:0 };
    state.npc = null;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(state.grid[y][x]===3){ state.grid[y][x]=0; state.player.x=x; state.player.y=y; }
      if(state.grid[y][x]===4){ state.grid[y][x]=0; state.npc={x,y,dir:"left",bombsPlaced:0,aiCooldown:0}; }
    }
    if(HUD.time) HUD.time.textContent=state.timeLeft;
    if(HUD.life) HUD.life.textContent=state.life;
    if(HUD.power) HUD.power.textContent=state.power;
    if(HUD.capacity) HUD.capacity.textContent=state.capacity;
    if(HUD.cal) HUD.cal.textContent=state.cal;
  }

  // ---- 更新 & 描画
  function update(){
    if(state.gameOver || state.cleared) return;
    if(++state.tick%60===0){
      state.timeLeft--; if(HUD.time) HUD.time.textContent = state.timeLeft;
      if(state.timeLeft<=0) die("時間切れ…");
    }

    updateNPC();      // NPC 1マスAI
    updateBombs();
    updateFlames();

    // ゴール条件：NPCがいない（倒した）状態で中央へ
    const gx=(COLS/2|0), gy=(ROWS/2|0);
    if(!state.npc && state.player.x===gx && state.player.y===gy){
      state.cleared = true; toast("🎉 クリア！");
    }
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // 地形
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const c=cell(x,y), px=x*TILE, py=y*TILE;
      ctx.fillStyle="#1a2234"; ctx.fillRect(px,py,TILE,TILE);
      if(c===1){ ctx.fillStyle="#3c4766"; ctx.fillRect(px+2,py+2,TILE-4,TILE-4); }
      else if(c===2){ ctx.fillStyle="#6e7aa0"; ctx.fillRect(px+4,py+4,TILE-8,TILE-8); }
      else if(c===5){ ctx.strokeStyle="#a48bff"; ctx.lineWidth=3; ctx.strokeRect(px+6,py+6,TILE-12,TILE-12); }
    }

    // アイテム
    for(const it of state.items){
      const px=it.x*TILE, py=it.y*TILE;
      ctx.fillStyle="#8dd3ff"; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.28,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#0d0f13"; ctx.font="bold 18px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText({6:"P",7:"C",8:"S",9:"K"}[it.type], px+TILE/2, py+TILE/2+1);
    }

    // 爆弾
    for(const b of state.bombs){
      if(b.exploded) continue;
      const px=b.x*TILE, py=b.y*TILE;
      ctx.fillStyle="#ffd166"; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2,TILE*0.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#333"; ctx.beginPath(); ctx.moveTo(px+TILE/2,py+TILE/2); ctx.lineTo(px+TILE*0.75,py+TILE*0.25); ctx.stroke();
    }

    // 炎
    for(const f of state.flames){
      const px=f.x*TILE, py=f.y*TILE, pad=6+(f.timer%4);
      ctx.fillStyle="#ff6b6b"; ctx.fillRect(px+pad,py+pad,TILE-pad*2,TILE-pad*2);
    }

    // NPC
    if(state.npc){
      const e=state.npc, px=e.x*TILE, py=e.y*TILE;
      ctx.fillStyle="#ffb36b"; ctx.fillRect(px+6,py+6,TILE-12,TILE-12);
      ctx.fillStyle="#0d0f13"; ctx.fillRect(px+12,py+12,6,6); ctx.fillRect(px+TILE-18,py+12,6,6);
    }

    // プレイヤー
    const p=state.player, ppx=p.x*TILE, ppy=p.y*TILE;
    ctx.fillStyle="#7cf29a"; ctx.fillRect(ppx+5, ppy+5, TILE-10, TILE-10);
    ctx.fillStyle="#0d0f13"; ctx.fillRect(ppx+12, ppy+12, 6, 6); ctx.fillRect(ppx+TILE-18, ppy+12, 6, 6);

    if(state.cleared||state.gameOver){
      ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#fff"; ctx.font="bold 36px system-ui,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(state.cleared?"🎉 CLEAR!":"💀 GAME OVER", canvas.width/2, canvas.height/2);
    }
  }

  // ---- ループ
  let last=0;
  function loop(ts){ const dt=(ts-last)/16.67; last=ts; update(dt); draw(); requestAnimationFrame(loop); }
  // HUD初期表示
  if(HUD.time) HUD.time.textContent = state.timeLeft;
  if(HUD.life) HUD.life.textContent = state.life;
  if(HUD.power) HUD.power.textContent = state.power;
  if(HUD.capacity) HUD.capacity.textContent = state.capacity;
  if(HUD.cal) HUD.cal.textContent = state.cal;

  requestAnimationFrame(loop);
}
