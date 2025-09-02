/* ===== 共有キー ===== */
const DEX_KEY  = 'dex_state_v1';
const CHAR_KEY = 'bs_char_state_v1'; // 育成のレベルを参照

function loadDex(){ try{ return JSON.parse(localStorage.getItem(DEX_KEY)||'{}'); }catch{ return {}; } }
function saveDex(v){ localStorage.setItem(DEX_KEY, JSON.stringify(v||{})); }
function loadChar(){ try{ return JSON.parse(localStorage.getItem(CHAR_KEY)||'{}'); }catch{ return {}; } }

/* ===== 図鑑データ =====
   #1〜#64 = char_01.png..char_64.png
   #1〜#32: レベル、#33〜#64: ランナーBestで解放
   #65〜#70: シークレット（挑戦で解放）
*/
const ASSET_BASE = '../project-root/';

const CHARACTERS = Array.from({length:64}, (_,i)=>{
  const n  = i+1;
  const fn = `char_${String(n).padStart(2,'0')}.png`;
  const rarity = 1 + Math.floor(i/16);
  return {
    id:i,
    name:`キャラ #${n}`,
    filename:fn,
    rarity,
    unlockHint: i < 32
      ? `Lv${1 + i*3} 付近で解放`
      : `ベストスコア ${300 + (i-32)*100}+`
  };
});

/* #33〜#64：ベストスコア到達で解放（300,400,…,3400） */
const SCORE_MILESTONES = Array.from({length:32}, (_,i)=> 300 + i*100);
function unlockedByScore(best){
  const u = {};
  SCORE_MILESTONES.forEach((th, i)=>{
    if (best >= th) u[32+i] = true; // id 32..63（= #33〜#64）
  });
  return u;
}

/* --- Secret #65〜#70 を追加（idは0始まり → 65→64） --- */
[65,66,67,68,69,70].forEach((no, idx) => {
  const id = 64 + idx;
  CHARACTERS.push({
    id,
    name: '？？？',
    filename: null,                 // 解放までは非公開
    rarity: 5,
    secret: true,
    secretNo: no,                   // 65..70
    defaultFile: `secret_${no}.png`,
    unlockHint: '挑戦'
  });
});

/* ===== レベル解放（Lv1=1体, Lv4=2体, ...） ===== */
function unlockedByLevel(level){
  const maxCount = Math.min(32, Math.floor((level-1)/3) + 1);
  const u = {}; for(let i=0;i<maxCount;i++) u[i]=true;
  return u;
}

/* ===== DOM ===== */
const grid  = document.getElementById('grid');
const modal = document.getElementById('modal');
const mimg  = document.getElementById('mimg');
const mname = document.getElementById('mname');
const mr    = document.getElementById('mrarity');
const mhint = document.getElementById('mhint');
const useBtn= document.getElementById('useBtn');
const playBtn= document.getElementById('playBtn'); // ミニゲーム起動
document.getElementById('close')?.addEventListener('click', ()=> modal.hidden=true);

let current = null;

/* ===== Secret 遷移先を安全に解決 ===== */
function resolveSecretPath(no){
  if (location.pathname.includes('/pages/characters/dex/'))  return `../secret/${no}/index.html`;
  if (location.pathname.includes('/pages/characters/'))      return `secret/${no}/index.html`;
  if (location.pathname.includes('/pages/'))                 return `characters/secret/${no}/index.html`;
  return `pages/characters/secret/${no}/index.html`;
}
function goSecret(no){ location.href = resolveSecretPath(no); }

/* ====== カードクリック（一本化） ====== */
function handleCardClick(ch, isSecret, isUnlocked){
  if (isSecret && !isUnlocked){
    goSecret(ch.secretNo);           // 例: 65 → ../secret/65/index.html
    return;
  }
  openModal(ch, !isUnlocked);
}

/* ===== 画面構築 ===== */
function build(){
  // レベル解放＋スコア解放を反映
  const st  = loadChar();
  const lv  = +st?.level || 1;
  const dex = loadDex();

  dex.unlocked    = Object.assign({}, dex.unlocked||{}, unlockedByLevel(lv));
  dex.secretFiles = dex.secretFiles || {}; // { "64":"secret_65.png", ... }

  const best = +(localStorage.getItem('runner_best') || 0);
  Object.assign(dex.unlocked, unlockedByScore(best));

  if(!dex.selected) dex.selected = 'char.png';
  saveDex(dex);

  grid.innerHTML = '';
  CHARACTERS.forEach(ch=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = ch.id;

    const isSecret   = !!ch.secret;
    const isUnlocked = !!(dex.unlocked||{})[ch.id];

    // 画像
    const img = document.createElement('img');
    img.loading = 'lazy';
    if (isSecret && !isUnlocked) {
      img.src = ASSET_BASE + 'silhouette.png';
      img.alt = '？？？';
    } else {
      const file = isSecret
        ? (dex.secretFiles[String(ch.id)] || ch.defaultFile)
        : ch.filename;
      img.src = ASSET_BASE + file;
      img.alt = isSecret ? (ch.name || 'シークレット') : ch.name;
    }
    card.appendChild(img);

    // 名前
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = (isSecret && !isUnlocked) ? '？？？' : (ch.name || `#${ch.id+1}`);
    card.appendChild(name);

    // ロック膜
    if (!isUnlocked) {
      const lock = document.createElement('div');
      lock.className = 'lock';
      lock.textContent = isSecret ? '挑戦' : 'LOCKED';
      card.appendChild(lock);
    }

    // 選択強調
    if (isUnlocked) {
      const file = isSecret
        ? (dex.secretFiles[String(ch.id)] || ch.defaultFile)
        : ch.filename;
      if ((dex.selected||'') === file) card.classList.add('selected');
    }

    // クリック挙動（一本化）
    card.addEventListener('click', ()=> handleCardClick(ch, isSecret, isUnlocked));

    grid.appendChild(card);
  });
} // build

/* ===== モーダル ===== */
function openModal(ch, locked){
  current = ch;
  modal.hidden = false;

  const dex = loadDex();
  const isSecret = !!ch.secret;

  // 画像と名前
  if (isSecret && locked) {
    mimg.src = ASSET_BASE + 'silhouette.png';
    mname.textContent = '？？？';
  } else {
    const file = isSecret
      ? (dex.secretFiles[String(ch.id)] || ch.defaultFile)
      : ch.filename;
    mimg.src = ASSET_BASE + file;
    mname.textContent = ch.name;
  }

  mr.textContent    = `レア度：${'★'.repeat(ch.rarity||1)}`;
  mhint.textContent = locked
    ? (isSecret ? '挑戦して解放しよう' : (ch.unlockHint || 'レベルを上げよう'))
    : '解放済み！';

  // 「このキャラにする」
  useBtn.disabled = locked;
  useBtn.textContent = locked ? '未解放' : 'このキャラにする';

  // ミニゲーム導線
  if (isSecret){
    playBtn?.classList.remove('disabled');
    if (playBtn){
      playBtn.href = resolveSecretPath(ch.secretNo);
      playBtn.textContent = locked ? '挑戦する' : 'もう一度挑戦';
    }
  } else if (locked){
    playBtn?.classList.add('disabled');
    if (playBtn){
      playBtn.removeAttribute('href');
      playBtn.textContent = '遊ぶ';
    }
  } else {
    playBtn?.classList.remove('disabled');
    if (playBtn){
      playBtn.href = `minigames/runner.html?skin=${encodeURIComponent(ch.filename)}`;
      playBtn.textContent = '遊ぶ';
    }
  }
}

/* ===== 選択適用 ===== */
useBtn.addEventListener('click', ()=>{
  if(!current) return;
  const dex = loadDex();
  const isSecret = !!current.secret;
  const selectedFilename = isSecret
    ? (dex.secretFiles[String(current.id)] || current.defaultFile)
    : current.filename;

  if (!selectedFilename) return;
  dex.selected = selectedFilename;
  saveDex(dex);
  modal.hidden = true;
  build();
});

/* ===== 初期化 ===== */
build();
