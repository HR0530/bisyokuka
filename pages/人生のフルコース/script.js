// 保存キー
const STORAGE_KEY = 'bisyokuka_fullcourse_v1';

// 初期データ（空）
const DEFAULT_FULLCOURSE = {
  horsdoeuvre: '', soup: '', fish: '', meat: '',
  main: '', salad: '', dessert: '', drink: ''
};

// 読み込み
function loadFullCourse(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULT_FULLCOURSE };
  }catch(e){
    return { ...DEFAULT_FULLCOURSE };
  }
}

// 保存
function saveFullCourse(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ドン！効果の出現
function playDonEffect(x, y, text='ドン！'){
  const base = document.getElementById('sfx-template');
  const node = base.cloneNode(true);
  node.removeAttribute('id');
  node.textContent = text;
  node.style.left = `${x}px`;
  node.style.top  = `${y}px`;
  document.body.appendChild(node);
  // 表示
  requestAnimationFrame(()=> {
    node.classList.add('show');
    // 終了後に削除
    node.addEventListener('animationend', ()=> node.remove(), { once:true });
  });
}

// スロットへ文字を落とすアニメ
function dropIntoSlot(slotEl, value){
  const textEl = slotEl.querySelector('[data-text]');
  textEl.textContent = value || '未設定';

  // アニメ発火
  slotEl.classList.remove('drop'); // 連打対策：一旦外して再付与
  void slotEl.offsetWidth;         // reflowでリセット
  slotEl.classList.add('drop');

  // クリック位置でドン！
  const rect = slotEl.getBoundingClientRect();
  const x = rect.left + rect.width * 0.15 + Math.random()*30;
  const y = rect.top  - 10; // 少し上
  playDonEffect(x, y, 'ドン！');
}

// クリックで登録
function onSlotClick(ev){
  const section = ev.currentTarget.closest('.row');
  const key = section.dataset.key;
  const data = loadFullCourse();

  const current = data[key] || '';
  const name = prompt('感動した料理名を入力してください（例：BBコーン、GOD など）', current);
  if (name === null) return; // キャンセル

  const trimmed = name.trim();
  data[key] = trimmed;
  saveFullCourse(data);
  dropIntoSlot(ev.currentTarget, trimmed || '未設定');
}

// 初期化
function init(){
  const data = loadFullCourse();
  document.querySelectorAll('[data-slot]').forEach(slot => {
    const key = slot.closest('.row').dataset.key;
    const value = data[key] || '未設定';
    slot.querySelector('[data-text]').textContent = value || '未設定';
    slot.addEventListener('click', onSlotClick);
  });

  // リセット
  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if (!confirm('フルコースをすべてリセットしますか？')) return;
    saveFullCourse({ ...DEFAULT_FULLCOURSE });
    document.querySelectorAll('[data-slot]').forEach(s=>{
      dropIntoSlot(s, '未設定');
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
