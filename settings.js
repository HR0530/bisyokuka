// ログインチェック
function checkLogin() {
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

// 設定ページ初期化（初期値の読込）
function loadSettings() {
  const username = localStorage.getItem("username") || "美食家さん";
  const calorieGoal = localStorage.getItem("calorieGoal") || 1580;

  document.getElementById("usernameInput").value = username;
  document.getElementById("calorieGoal").value = calorieGoal;
}

// 設定保存処理
function saveSettings() {
  const username = document.getElementById("usernameInput").value;
  const calorieGoal = document.getElementById("calorieGoal").value;
  const iconFile = document.getElementById("iconUpload").files[0];

  if (username) {
    localStorage.setItem("username", username);
  }

  if (calorieGoal) {
    localStorage.setItem("calorieGoal", calorieGoal);
  }

  if (iconFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      localStorage.setItem("userIcon", e.target.result);
      alert("設定を保存しました！");
      window.location.href = "index.html";
    };
    reader.readAsDataURL(iconFile);
  } else {
    alert("設定を保存しました！");
    window.location.href = "index.html";
  }
}

// 戻るボタン処理
function goBack() {
  window.location.href = "index.html";
}
