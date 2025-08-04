// ページ切り替え処理（iframeあり or ページ遷移対応）
function switchPage(pageName) {
  const subpage = document.getElementById("subpage");

  if (subpage) {
    // iframeがある場合 → iframe内のsrc切り替え
    subpage.src = `pages/${pageName}/index.html`;
  } else {
    // iframeがない場合 → 通常のページ遷移
    window.location.href = `pages/${pageName}/index.html`;
  }
}

// ログイン状態チェック
function checkLogin() {
  const isLoggedIn = localStorage.getItem("loggedIn");
  if (isLoggedIn !== "true") {
    window.location.href = "login.html";
  }
}

// ログアウト処理
function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

// グローバル登録（HTMLから呼び出せるように）
window.switchPage = switchPage;
window.checkLogin = checkLogin;
window.logout = logout;
