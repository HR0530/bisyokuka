// =========================
// 人生のフルコース script.js（クリーン版）
// =========================

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
  if (!base) return; // 念のため
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

// ==== 追加演出ヘルパー ====

// 集中線
function showImpactLines(slotEl){
  // 残っていたら削除（連打対策）
  slotEl.querySelectorAll('.impact-lines').forEach(n=>n.remove());
  const lines = document.createElement('div');
  lines.className = 'impact-lines';
  slotEl.appendChild(lines);
  // アニメ終了で自動削除
  lines.addEventListener('animationend', ()=> lines.remove(), { once:true });
}

// 金の粒子
function scatterGoldParticles(slotEl, count = 12){
  const rect = slotEl.getBoundingClientRect();
  for(let i=0;i<count;i++){
    const p = document.createElement('span');
    p.className = 'gold-spark';
    // 発生位置：枠の周辺ランダム
    const x = Math.random() * rect.width  * 0.9 + rect.width * 0.05;
    const y = Math.random() * rect.height * 0.6 + rect.height * 0.2;
    p.style.left = x + 'px';
    p.style.top  = y + 'px';
    // 散り方向をランダムに
    const dx = (Math.random() * 60 - 30);  // -30px ～ +30px
    const dy = (-30 - Math.random() * 40); // -30 ～ -70px（上方向）
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');

    slotEl.appendChild(p);
    requestAnimationFrame(()=> p.classList.add('run'));
    p.addEventListener('animationend', ()=> p.remove(), { once:true });
  }
}

// スロットへ文字を落とす（演出込み）
function dropIntoSlot(slotEl, value){
  const textEl = slotEl.querySelector('[data-text]');
  textEl.textContent = value || '未設定';

  // CSSアニメを確実に再発火
  slotEl.classList.remove('drop');
  void slotEl.offsetWidth;
  slotEl.classList.add('drop');

  // 集中線＆粒子
  showImpactLines(slotEl);
  scatterGoldParticles(slotEl, 12);

  // 「ドン！」の位置は枠の少し上
  const rect = slotEl.getBoundingClientRect();
  const x = rect.left + rect.width * 0.2 + Math.random() * 40;
  const y = rect.top  - 8;
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
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', ()=>{
      if (!confirm('フルコースをすべてリセットしますか？')) return;
      saveFullCourse({ ...DEFAULT_FULLCOURSE });
      document.querySelectorAll('[data-slot]').forEach(s=>{
        dropIntoSlot(s, '未設定');
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
