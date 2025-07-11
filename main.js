// ページ内容
const pages = {
  recommend: 'おすすめの料理を表示します。',
  fridge: '冷蔵庫の中身から献立を提案します。',
  question: '料理に関する質問を表示・投稿します。',
  community: 'ユーザー交流の場です。',
  akinator: `
    <h1>🍽️ 料理アキネーター</h1>
    <div id="question"></div>
    <div id="buttons">
      <button onclick="handleAnswer(true)">はい</button>
      <button onclick="handleAnswer(false)">いいえ</button>
    </div>
    <div id="result" style="display:none;"></div>
  `
};

let currentTab = 'recommend';
let currentTree = null;

document.addEventListener('DOMContentLoaded', () => {
  switchPage('recommend');
});

function switchPage(tab) {
  currentTab = tab;
  const content = document.getElementById('page-content');
  content.innerHTML = pages[tab];
  document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'akinator') {
    currentTree = tree;
    document.getElementById("question").textContent = currentTree.q;
  }
}

function handleAnswer(answer) {
  if (!currentTree || currentTree.result) return;
  currentTree = answer ? currentTree.yes : currentTree.no;

  if (!currentTree) {
    document.getElementById("question").textContent = "質問の選択肢がありません。";
    document.getElementById("buttons").style.display = "none";
    return;
  }

  if (currentTree.result) {
    document.getElementById("question").style.display = "none";
    document.getElementById("buttons").style.display = "none";
    const r = currentTree;
    document.getElementById("result").style.display = "block";
    document.getElementById("result").innerHTML = `
      <h2>🍛 あなたにおすすめの料理は：${r.result}</h2>
      <div class="recipe-section">
        <h3>材料</h3>
        <ul>${r.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
      <div class="recipe-section">
        <h3>作り方</h3>
        <ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>
    `;
  } else {
    document.getElementById("question").textContent = currentTree.q;
  }
}

// 料理アキネーターの質問ツリー（省略せず full データ貼る場合は tree = {...} をここに）
