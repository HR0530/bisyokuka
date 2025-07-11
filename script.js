function switchPage(tab) {
  const content = document.getElementById('page-content');
  const pages = {
    recommend: 'おすすめの料理を表示します。',
    fridge: '冷蔵庫の中身から献立を提案します。',
    question: '料理に関する質問を表示・投稿します。',
    community: 'ユーザー交流の場です。'
  };
  content.innerHTML = pages[tab];
  document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}
