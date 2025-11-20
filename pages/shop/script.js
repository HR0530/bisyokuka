// 美食家さん - 知恵袋・投票・コメント機能付き（Firebase Firestore版）
// 最終候補AIコード②(localStorage版) を Firestore に移植したもの。

// ====== Firebase 初期化 ======
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8bVyIX4NFOxSH1i38MAXRnsqIZ_-3C_0",
  authDomain: "bishokuka-qna.firebaseapp.com",
  projectId: "bishokuka-qna",
  storageBucket: "bishokuka-qna.firebasestorage.app",
  messagingSenderId: "298243776444",
  appId: "1:298243776444:web:fb4522d529a01246f095b9",
  measurementId: "G-WNH918H8JF"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ホーム画面（index_pc.html）へ戻る
function goHome() {
  window.location.href = "index_pc.html";
}
// ====== データ構造 ======
//
// Firestore コレクション: "posts"
// ドキュメント構造:
// {
//   title: string,
//   description: string,
//   createdAt: Timestamp,
//   options: [{ text: string, votes: number }, ...],
//   comments: [{ text: string, createdAt: Timestamp }, ...]
// }

// 投稿データのキャッシュ（ランキング計算などに使う）
let posts = [];

// Firestore からのスナップショットを posts 配列に変換
function snapshotToPosts(snapshot) {
  const result = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    result.push({
      id: doc.id,
      title: data.title,
      description: data.description,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
      options: data.options || [],
      comments: data.comments || []
    });
  });
  return result;
}

// 投稿一覧を描画
function renderPosts() {
  const listEl = document.getElementById("questionsList");
  const emptyMessage = document.getElementById("emptyMessage");

  listEl.innerHTML = "";

  if (posts.length === 0) {
    emptyMessage.style.display = "block";
    return;
  } else {
    emptyMessage.style.display = "none";
  }

  // createdAt の降順でソート
  const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);

  sorted.forEach((post) => {
    const postDiv = document.createElement("div");
    postDiv.className = "post";

    const titleEl = document.createElement("div");
    titleEl.className = "post-title";
    titleEl.textContent = post.title;

    const descEl = document.createElement("div");
    descEl.className = "post-description";
    descEl.textContent = post.description;

    const metaEl = document.createElement("div");
    metaEl.className = "post-meta";
    const totalVotes = post.options.reduce((sum, o) => sum + (o.votes || 0), 0);
    metaEl.textContent =
      "投稿日時: " +
      post.createdAt.toLocaleString() +
      " ／ 合計票数: " +
      totalVotes +
      "票";

    postDiv.appendChild(titleEl);
    postDiv.appendChild(descEl);
    postDiv.appendChild(metaEl);

    // 選択肢
    post.options.forEach((option, optionIndex) => {
      const optionDiv = document.createElement("div");
      optionDiv.className = "option";

      const textSpan = document.createElement("span");
      textSpan.className = "option-text";
      textSpan.textContent = option.text;

      const voteSpan = document.createElement("span");
      voteSpan.className = "vote-count";
      voteSpan.textContent = (option.votes || 0) + "票";

      optionDiv.appendChild(textSpan);
      optionDiv.appendChild(voteSpan);

      optionDiv.addEventListener("click", () => {
        handleVote(post.id, optionIndex);
      });

      postDiv.appendChild(optionDiv);
    });

    // コメント表示・追加
    const commentsDiv = document.createElement("div");
    commentsDiv.className = "comments";

    const commentsTitle = document.createElement("div");
    commentsTitle.className = "comments-title";
    commentsTitle.textContent = "コメント";

    commentsDiv.appendChild(commentsTitle);

    if (post.comments && post.comments.length > 0) {
      post.comments.forEach((comment) => {
        const commentEl = document.createElement("div");
        commentEl.className = "comment-item";

        const textEl = document.createElement("div");
        textEl.textContent = comment.text;

        const meta = document.createElement("div");
        meta.className = "comment-meta";
        const cDate =
          comment.createdAt instanceof Date
            ? comment.createdAt
            : (comment.createdAt && comment.createdAt.toDate)
              ? comment.createdAt.toDate()
              : new Date(0);
        meta.textContent = cDate.toLocaleString();

        commentEl.appendChild(textEl);
        commentEl.appendChild(meta);
        commentsDiv.appendChild(commentEl);
      });
    }

    const commentButton = document.createElement("button");
    commentButton.className = "comment-button";
    commentButton.textContent = "コメントを追加";

    commentButton.addEventListener("click", () => {
      handleAddComment(post.id);
    });

    commentsDiv.appendChild(commentButton);
    postDiv.appendChild(commentsDiv);

    listEl.appendChild(postDiv);
  });
}

// ランキング描画（合計票数TOP5）
function renderRanking() {
  const rankingEl = document.getElementById("rankingList");
  rankingEl.innerHTML = "";

  if (posts.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ投票データがありません。";
    rankingEl.appendChild(li);
    return;
  }

  const sorted = [...posts].sort((a, b) => {
    const aVotes = a.options.reduce((sum, o) => sum + (o.votes || 0), 0);
    const bVotes = b.options.reduce((sum, o) => sum + (o.votes || 0), 0);
    return bVotes - aVotes;
  });

  const top = sorted.slice(0, 5);

  top.forEach((post, index) => {
    const totalVotes = post.options.reduce((sum, o) => sum + (o.votes || 0), 0);
    const li = document.createElement("li");
    li.textContent =
      (index + 1) +
      "位: " +
      post.title +
      " ／ 合計 " +
      totalVotes +
      "票";
    rankingEl.appendChild(li);
  });
}

// 投票処理（FieldValue.increment を使い、同時アクセスにも強くする）
async function handleVote(postId, optionIndex) {
  try {
    const docRef = db.collection("posts").doc(postId);
    const fieldPath = `options.${optionIndex}.votes`;

    await docRef.update({
      [fieldPath]: firebase.firestore.FieldValue.increment(1)
    });
    // onSnapshot により自動で再描画される
  } catch (e) {
    console.error("投票に失敗しました", e);
  }
}

// コメント追加処理
async function handleAddComment(postId) {
  const text = window.prompt("コメントを入力してください：");
  if (text === null) return; // キャンセル
  const trimmed = text.trim();
  if (trimmed === "") {
    alert("空のコメントは追加できません。");
    return;
  }

  try {
    const docRef = db.collection("posts").doc(postId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return;

    const data = docSnap.data();
    const comments = data.comments || [];

    comments.push({
      text: trimmed,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await docRef.update({ comments: comments });
    // onSnapshotで再描画
  } catch (e) {
    console.error("コメント追加に失敗しました", e);
  }
}

// 投稿フォーム送信処理
async function handleFormSubmit(event) {
  event.preventDefault();

  const titleInput = document.getElementById("title");
  const descInput = document.getElementById("description");
  const optionInputs = document.querySelectorAll(".option-input");

  const title = titleInput.value.trim();
  const description = descInput.value.trim();

  if (title === "" || description === "") {
    alert("タイトルと質問内容は必須です。");
    return;
  }

  const options = [];
  optionInputs.forEach((input) => {
    const text = input.value.trim();
    if (text !== "") {
      options.push({
        text: text,
        votes: 0
      });
    }
  });

  if (options.length < 2) {
    alert("少なくとも2つの選択肢を入力してください。");
    return;
  }

  try {
    await db.collection("posts").add({
      title: title,
      description: description,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      options: options,
      comments: []
    });

    // フォームリセット
    titleInput.value = "";
    descInput.value = "";
    optionInputs.forEach((input) => (input.value = ""));
  } catch (e) {
    console.error("投稿に失敗しました", e);
  }
}

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("questionForm");
  form.addEventListener("submit", handleFormSubmit);

  // Firestore の posts コレクションをリアルタイム監視
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      posts = snapshotToPosts(snapshot);
      renderPosts();
      renderRanking();
    });
});
