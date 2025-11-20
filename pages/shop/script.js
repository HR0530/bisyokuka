// 美食家さん - 知恵袋・投票・コメント機能付き（Firebase Firestore版）
// --- 入力を消さないバージョン ---


// ====== 投稿データの保持 ======
let posts = [];

// Firestore → JSオブジェクト変換
function snapshotToPosts(snapshot) {
  const arr = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    arr.push({
      id: doc.id,
      title: data.title,
      description: data.description,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
      options: data.options || [],
      comments: data.comments || []
    });
  });
  return arr;
}

// ====== 投稿一覧描画 ======
function renderPosts() {
  const list = document.getElementById("questionsList");
  const empty = document.getElementById("emptyMessage");
  list.innerHTML = "";

  if (posts.length === 0) {
    empty.style.display = "block";
    return;
  } else {
    empty.style.display = "none";
  }

  const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);

  sorted.forEach((post) => {
    const div = document.createElement("div");
    div.className = "post";

    const title = document.createElement("div");
    title.className = "post-title";
    title.textContent = post.title;

    const desc = document.createElement("div");
    desc.className = "post-description";
    desc.textContent = post.description;

    const meta = document.createElement("div");
    meta.className = "post-meta";
    const total = post.options.reduce((s, o) => s + (o.votes || 0), 0);
    meta.textContent =
      "投稿日時: " +
      post.createdAt.toLocaleString() +
      " ／ 合計票数: " +
      total +
      "票";

    div.appendChild(title);
    div.appendChild(desc);
    div.appendChild(meta);

    // 選択肢
    post.options.forEach((opt, idx) => {
      const optDiv = document.createElement("div");
      optDiv.className = "option";

      const text = document.createElement("span");
      text.className = "option-text";
      text.textContent = opt.text;

      const count = document.createElement("span");
      count.className = "vote-count";
      count.textContent = (opt.votes || 0) + "票";

      optDiv.appendChild(text);
      optDiv.appendChild(count);

      optDiv.addEventListener("click", () => {
        handleVote(post.id, idx);
      });

      div.appendChild(optDiv);
    });

    // コメント
    const commentsDiv = document.createElement("div");
    commentsDiv.className = "comments";

    const ct = document.createElement("div");
    ct.className = "comments-title";
    ct.textContent = "コメント";
    commentsDiv.appendChild(ct);

    post.comments.forEach((c) => {
      const item = document.createElement("div");
      item.className = "comment-item";

      const t = document.createElement("div");
      t.textContent = c.text;

      const m = document.createElement("div");
      m.className = "comment-meta";
      const d =
        c.createdAt && c.createdAt.toDate
          ? c.createdAt.toDate()
          : new Date(0);
      m.textContent = d.toLocaleString();

      item.appendChild(t);
      item.appendChild(m);
      commentsDiv.appendChild(item);
    });

    const button = document.createElement("button");
    button.className = "comment-button";
    button.textContent = "コメントを追加";

    button.addEventListener("click", () => {
      handleAddComment(post.id);
    });

    commentsDiv.appendChild(button);
    div.appendChild(commentsDiv);

    list.appendChild(div);
  });
}

// ====== ランキング描画 ======
function renderRanking() {
  const list = document.getElementById("rankingList");
  list.innerHTML = "";

  if (posts.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ投票データがありません。";
    list.appendChild(li);
    return;
  }

  const sorted = [...posts].sort((a, b) => {
    const av = a.options.reduce((s, o) => s + (o.votes || 0), 0);
    const bv = b.options.reduce((s, o) => s + (o.votes || 0), 0);
    return bv - av;
  });

  sorted.slice(0, 5).forEach((post, i) => {
    const total = post.options.reduce((s, o) => s + (o.votes || 0), 0);
    const li = document.createElement("li");
    li.textContent = `${i + 1}位: ${post.title} ／ 合計 ${total}票`;
    list.appendChild(li);
  });
}

// ====== 投票処理 ======
async function handleVote(id, index) {
  const ref = db.collection("posts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data();
  const ops = data.options || [];

  ops[index].votes = (ops[index].votes || 0) + 1;

  await ref.update({ options: ops });
}

// ====== コメント追加 ======
async function handleAddComment(id) {
  const text = prompt("コメントを入力してください：");
  if (text === null) return;
  const t = text.trim();
  if (t === "") return alert("空のコメントは追加できません");

  const ref = db.collection("posts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data();
  const comments = data.comments || [];

  comments.push({
    text: t,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await ref.update({ comments });
}

// ====== 投稿フォーム送信 ======
async function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const desc = document.getElementById("description").value.trim();
  const optionInputs = document.querySelectorAll(".option-input");

  if (!title || !desc) return alert("タイトルと内容は必須です");

  const options = [];
  optionInputs.forEach((i) => {
    const t = i.value.trim();
    if (t) options.push({ text: t, votes: 0 });
  });

  if (options.length < 2) {
    return alert("選択肢は最低2つ必要です");
  }

  // 🔥 フォームを消さない！
  await db.collection("posts").add({
    title,
    description: desc,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    options,
    comments: []
  });

  // （リセットしない）
}

// ====== 初期化 ======
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("questionForm")
    .addEventListener("submit", handleFormSubmit);

  db.collection("posts")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      posts = snapshotToPosts(snap);
      renderPosts();
      renderRanking();
    });
});
