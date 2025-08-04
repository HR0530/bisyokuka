// ページ完全遷移（iframeを使わない）
function switchPage(pageName) {
  window.location.href = `pages/${pageName}/index.html`;
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

// グローバル登録
window.switchPage = switchPage;
window.checkLogin = checkLogin;
window.logout = logout;
