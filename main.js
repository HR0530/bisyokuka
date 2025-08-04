// ページ切り替え処理
function switchPage(pageName) {
  const subpage = document.getElementById("subpage");
  if (subpage) {
    subpage.src = `pages/${pageName}/index.html`;
  } else {
    console.error("iframe 'subpage' が見つかりません");
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

// 必要ならグローバルに登録
window.switchPage = switchPage;
window.checkLogin = checkLogin;
window.logout = logout;
