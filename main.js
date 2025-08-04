// ページ切り替え処理
function switchPage(pageName) {
  document.getElementById("subpage").src = `pages/${pageName}/index.html`;
}

// ログイン状態チェック
function checkLogin() {
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

// ログアウト処理
function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

