function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  // 仮の認証（固定ID/PW）
  if (username === "user" && password === "pass") {
    localStorage.setItem("loggedIn", "true"); // ログイン状態を保存
    window.location.href = "index.html";      // アプリ画面へ遷移
  } else {
    errorMessage.textContent = "ユーザー名またはパスワードが違います。";
  }
}
