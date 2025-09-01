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

// 自動生成（char_01.png .. char_32.png）
const CHARACTERS = Array.from({length:32}, (_,i)=>{
  const n = i+1;
  const fn = `char_${String(n).padStart(2,'0')}.png`;
  return { id:i, name:`キャラ #${n}`, filename:fn, rarity: 1 + Math.floor(i/8), unlockHint:`Lv${1 + i*3} 付近で解放` };
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

    const img = document.createElement('img');
    img.src = ASSET_BASE + ch.filename;
    img.alt = ch.name;
    img.loading = 'lazy';
    card.appendChild(img);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = ch.name;
    card.appendChild(name);

    const isUnlocked = !!dex.unlocked[ch.id];
    if(!isUnlocked){
      const lock = document.createElement('div');
      lock.className = 'lock';
      lock.textContent = 'LOCKED';
      card.appendChild(lock);
    }

    if (dex.selected === ch.filename) card.classList.add('selected');

    card.addEventListener('click', ()=>{
      openModal(ch, !isUnlocked);
    });

    grid.appendChild(card);
  });
}

function openModal(ch, locked){
  current = ch;
  modal.hidden = false;
  mimg.src = ASSET_BASE + ch.filename;
  mname.textContent = ch.name;
  mr.textContent = `レア度：${'★'.repeat(ch.rarity||1)}`;
  mhint.textContent = locked ? `解放ヒント：${ch.unlockHint || 'レベルを上げよう'}` : '解放済み！';
  useBtn.disabled = locked;
  useBtn.textContent = locked ? '未解放' : 'このキャラにする';

  // ★ ミニゲーム（ランナー）へ：ロック時は無効／解放済みなら href 付与
  if (locked){
    playBtn.classList.add('disabled');
    playBtn.removeAttribute('href');
  } else {
    playBtn.classList.remove('disabled');
    playBtn.href = `minigames/runner.html?skin=${encodeURIComponent(ch.filename)}`;
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
