// ==== secret65.js : SECRET #65 unlocker (event-driven) ====
// 仕組み：runner 側から CustomEvent を 5種類飛ばすだけでOK。
// 'runner:title', 'runner:start', 'runner:jump', 'runner:coin', 'runner:gameover'({detail:{score}})

(function(){
  const DEX_KEY='dex_state_v1';
  const FLAGS_KEY='secret65_flags';
  const UNLOCKED_KEY='secret65_unlocked';

  // 条件
  const PI_SCORE_MIN = 314, PI_SCORE_MAX = 318;
  const PI_JUMPS = 3;      // ぴったり3回
  const PI_TIME_S = 15;    // 15秒以内
  const PACIFIST_TIME_S = 20; // 20秒以上
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

  // ラン時の一時カウンタ
  let jumps=0, coins=0, runStart=0, onTitle=true, konamiIdx=0, konamiListenerAdded=false;

  const j = (k,def={}) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(def)); } catch { return def; } };
  const s = (k,v) => localStorage.setItem(k, JSON.stringify(v));

  function toast(text){
    const n = document.createElement('div');
    Object.assign(n.style,{
      position:'fixed', right:'12px', bottom:'12px', padding:'8px 10px',
      background:'#ff00ff', color:'#111', fontWeight:'700', borderRadius:'8px', zIndex:9999,
      boxShadow:'0 6px 22px rgba(0,0,0,.35)'
    });
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(()=> n.remove(), 2400);
  }

  function mark(flag){
    const f = j(FLAGS_KEY, {});
    if (!f[flag]) { f[flag]=true; s(FLAGS_KEY, f); console.log('[secret65] flag ON:', flag); toast(flag.toUpperCase()); }
    maybeUnlock();
  }

  function maybeUnlock(){
    const f = j(FLAGS_KEY, {});
    if (f.pi && f.konami && f.pacifist && !localStorage.getItem(UNLOCKED_KEY)){
      const dex = j(DEX_KEY, {});
      dex.unlocked = Object.assign({}, dex.unlocked, { 64: true }); // 0始まりindex→ #65
      dex.secret65 = dex.secret65 || 'secret_65.png';                // 実体ファイル名
      s(DEX_KEY, dex);
      localStorage.setItem(UNLOCKED_KEY, '1');
      toast('SECRET #65 UNLOCKED!');
      // 図鑑タブを開いていれば即反映
      window.dispatchEvent(new StorageEvent('storage', { key: DEX_KEY, newValue: JSON.stringify(dex) }));
    }
  }

  function listenKonami(){
    if (konamiListenerAdded) return;
    konamiListenerAdded = true;
    window.addEventListener('keydown', (e)=>{
      if (!onTitle) return;
      const key = (e.key||'');
      const expect = KONAMI[konamiIdx];
      if (key.toLowerCase() === expect.toLowerCase()){
        konamiIdx++;
        if (konamiIdx >= KONAMI.length){
          konamiIdx = 0; mark('konami'); toast('古いコードがうずく…');
        }
      }else{
        // 先頭Upの連打で部分一致を多少許容
        konamiIdx = (key==='ArrowUp' && konamiIdx>0) ? 1 : 0;
      }
    }, { passive:true });
  }

  // ===== イベント連携 =====
  document.addEventListener('runner:title', ()=>{
    onTitle = true; jumps=0; coins=0; runStart=0; konamiIdx=0;
    listenKonami();
  });

  document.addEventListener('runner:start', ()=>{
    onTitle = false; jumps=0; coins=0; runStart = performance.now();
  });

  document.addEventListener('runner:jump', ()=>{ jumps++; });

  document.addEventListener('runner:coin', ()=>{ coins++; });

  document.addEventListener('runner:gameover', (e)=>{
    const score = +((e.detail && e.detail.score) || 0);
    const elapsed = runStart ? (performance.now() - runStart)/1000 : 0;

    // pi：314〜318点・ジャンプ3回・15秒以内
    if (score>=PI_SCORE_MIN && score<=PI_SCORE_MAX && jumps===PI_JUMPS && elapsed<=PI_TIME_S){
      mark('pi');
    }
    // pacifist：20秒以上・コイン0
    if (elapsed>=PACIFIST_TIME_S && coins===0){
      mark('pacifist');
    }
    // ベスト更新は runner 側でも行っている想定だが、なければここで冗長保存
    const best = Math.max(+localStorage.getItem('runner_best')||0, score);
    localStorage.setItem('runner_best', String(best));

    // 次のタイトル用
    onTitle = true;
    maybeUnlock();
  });

  // 初回起動時に、もしすでに全部満たしていたら即反映
  maybeUnlock();
})();
