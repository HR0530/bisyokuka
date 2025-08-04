function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  // 仮の認証
  if (username === "user" && password === "pass") {
    localStorage.setItem("loggedIn", "true");
    
    // 少し遅延を入れて確実に保存させる（index側のcheckLoginと競合を防ぐ）
    setTimeout(() => {
      window.location.href = "index.html";
    }, 100);
  } else {
    errorMessage.textContent = "ユーザー名またはパスワードが違います。";
  }
}

// フォームのEnterキー送信に対応
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
});
