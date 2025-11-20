<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>美食家さん - 知恵袋・投票（Firebase版）</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <header class="app-header">
    <div class="app-header-top">

      <h1>🍴 美食家さん - 知恵袋・投票</h1>


    <p class="app-description">
      「今何を食べるべき？」をみんなに相談して、投票やコメントで意見を集めよう。
      （Firebase版：複数PCで共有）
    </p>
  </header>

  <!-- ↓以下はあなたの元の index.html と同じでOK -->
  <main class="app-main">
    <section class="card form-section">
      <h2>新しい質問を投稿</h2>
      <form id="questionForm">
        <div class="form-group">
          <label for="title">質問タイトル <span class="required">*</span></label>
          <input type="text" id="title" placeholder="例：お家デートで作る料理、どれが良い？" required>
        </div>

        <div class="form-group">
          <label for="description">質問内容 <span class="required">*</span></label>
          <textarea id="description" rows="3" placeholder="内容…" required></textarea>
        </div>

        <div class="form-group">
          <label>選択肢（2～4個）</label>
          <input type="text" class="option-input" placeholder="選択肢1（必須）">
          <input type="text" class="option-input" placeholder="選択肢2（必須）">
          <input type="text" class="option-input" placeholder="選択肢3（任意）">
          <input type="text" class="option-input" placeholder="選択肢4（任意）">
          <p class="hint">※空欄の選択肢は無視されます。</p>
        </div>

        <button type="submit" class="primary-btn">質問を投稿する</button>
      </form>
    </section>

    <section class="card">
      <h2>🗳️ 投稿一覧と投票</h2>
      <p id="emptyMessage" class="empty-message">まだ投稿がありません。</p>
      <div id="questionsList"></div>
    </section>

    <section class="card">
      <h2>📊 投票ランキング</h2>
      <ul id="rankingList"></ul>
    </section>
  </main>

  <footer class="app-footer">
    <small>© 2025 美食家さん - Firebase Q&A</small>
  </footer>

  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>
  <script src="script.js"></script>

</body>
</html>
