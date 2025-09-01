/* ===== 共有キー ===== */
const DEX_KEY  = 'dex_state_v1';
const CHAR_KEY = 'bs_char_state_v1'; // 育成のレベルを参照

function loadDex(){ try{ return JSON.parse(localStorage.getItem(DEX_KEY)||'{}'); }catch{ return {}; } }
function saveDex(v){ localStorage.setItem(DEX_KEY, JSON.stringify(v||{})); }
function loadChar(){ try{ return JSON.parse(localStorage.getItem(CHAR_KEY)||'{}'); }catch{ return {}; } }

/* ===== 図鑑データ（32体）
   ▼ファイル名が「char_01.png〜char_32.png」の場合は自動生成でOK
   ▼別名の場合は、“手動配列”に切り替えてください。
*/
const ASSET_BASE = '../project-root/';

const CHARACTERS = Array.from({length:64}, (_,i)=>{
  const n  = i+1;
  const fn = `char_${String(n).padStart(2,'0')}.png`;
  const rarity = 1 + Math.floor(i/16); // お好みで
  return {
    id:i,
    name:`キャラ #${n}`,
    filename:fn,
    rarity,
    unlockHint: i < 32
      ? `Lv${1 + i*3} 付近で解放`          // #1-32 はレベル
      : `ベストスコア ${300 + (i-32)*100}+` // #33-64 はスコア
  };
});


/* #33〜#64：ベストスコア到達で解放（300,400,…,3400） */
const SCORE_MILESTONES = Array.from({length:32}, (_,i)=> 300 + i*100);
function unlockedByScore(best){
  const u = {};
  SCORE_MILESTONES.forEach((th, i)=>{
    if (best >= th) u[32+i] = true; // id 32..63
  });
  return u;
}

// 追加：#65 のIDを予約
const SECRET65_ID = 64; // 0始まり配列なので 64 = #65

// 既存 CHARACTERS にシークレット枠を push（ファイル名は未公開）
CHARACTERS.push({
  id: SECRET65_ID,
  name: '？？？',
  filename: null,           // ここは解放まで null
  rarity: 5,
  secret: true,
  unlockHint: '挑戦'        // モーダルに「挑戦」とだけ出す
});


/* --- 手動でやる場合の例（↑を削除して↓を使う）
const CHARACTERS = [
  { id:0, name:'男スーツ1', filename:'男_スーツ1.png', rarity:1, unlockHint:'Lv1' },
  { id:1, name:'女スーツ1', filename:'女_スーツ1.png', rarity:1, unlockHint:'Lv4' },
  { id:2, name:'女学生1',   filename:'女_学生1.png',   rarity:1, unlockHint:'Lv7' },
  // ... id:31 まで
];
--- */

/* ===== レベルから解放数を計算（Lv1=1体, Lv4=2体, ...） ===== */
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
const playBtn= document.getElementById('playBtn'); // ← ミニゲーム起動
document.getElementById('close').addEventListener('click', ()=> modal.hidden=true);

let current = null;

function build(){
  // レベルに応じて解放を反映
  const st  = loadChar();
  const lv  = +st?.level || 1;
  const dex = loadDex();
  dex.unlocked = Object.assign({}, dex.unlocked||{}, unlockedByLevel(lv));
  if(!dex.selected) dex.selected = 'char.png';
  saveDex(dex);

  grid.innerHTML = '';
  CHARACTERS.forEach(ch=>{
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = ch.id;

  const isSecret   = !!ch.secret;               // #65だけ true
  const isUnlocked = !!dex.unlocked[ch.id];

  const img = document.createElement('img');
  img.loading = 'lazy';

  if (isSecret && !isUnlocked) {
    // 未解放の #65 は伏せる（silhouette.png を用意）
    img.src = ASSET_BASE + 'silhouette.png';
    img.alt = '？？？';
  } else {
    // 解放済み or 通常キャラ
    const myFile = isSecret
      ? (dex.secret65 || 'secret_65.png')       // 解放後に使う実体画像
      : ch.filename;
    img.src = ASSET_BASE + myFile;
    img.alt = isSecret ? '？？？' : ch.name;
  }
  card.appendChild(img);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = (isSecret && !isUnlocked) ? '？？？' : ch.name;
  card.appendChild(name);

  if (!isUnlocked) {
    const lock = document.createElement('div');
    lock.className = 'lock';
    lock.textContent = isSecret ? '挑戦' : 'LOCKED'; // #65は「挑戦」
    card.appendChild(lock);
  }

  // 選択中の見た目
  if (isUnlocked) {
    const myFile = isSecret ? (dex.secret65 || 'secret_65.png') : ch.filename;
    if (dex.selected === myFile) card.classList.add('selected');
  }

  // クリック挙動
  card.addEventListener('click', ()=>{
    if (isSecret && !isUnlocked) {
      // #65 未解放 → 直接「挑戦」へ（モーダルを使うなら openSecretModal() に変更）
      location.href = '../secret/index.html';
      return;
    }
    openModal(ch, !isUnlocked);
  });

  grid.appendChild(card);
});

function openModal(ch, locked){
  current = ch;
  modal.hidden = false;

  const dex = loadDex();
  const isSecret = !!ch.secret;

  // 画像と名前
  if (isSecret && locked) {
    mimg.src = ASSET_BASE + 'silhouette.png'; // 未解放シークレットのシルエット
    mname.textContent = '？？？';
  } else {
    const file = isSecret ? (dex.secret65 || 'secret_65.png') : ch.filename;
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
  if (isSecret) {
    // #65 は未解放でも挑戦可能
    playBtn.classList.remove('disabled');
    playBtn.href = `../secret/index.html`;
    playBtn.textContent = locked ? '挑戦する' : 'もう一度挑戦';
  } else if (locked) {
    playBtn.classList.add('disabled');
    playBtn.removeAttribute('href');
    playBtn.textContent = '遊ぶ';
  } else {
    playBtn.classList.remove('disabled');
    playBtn.href = `minigames/runner.html?skin=${encodeURIComponent(ch.filename)}`;
    playBtn.textContent = '遊ぶ';
  }
}


useBtn.addEventListener('click', ()=>{
  if(!current) return;
  const dex = loadDex();
  dex.selected = current.filename;   // ← ファイル名“だけ”保存
  saveDex(dex);
  modal.hidden = true;
  build(); // 選択強調の更新
});

/* 初期化 */
build();
