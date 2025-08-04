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

function loadCalorieInfo() {
  // 保存された合計カロリー（localStorage: 今日の摂取分）
  const todayCalories = Number(localStorage.getItem("todayCalories") || 0);

  // 保存された目標カロリー（設定ページで保存された値）
  const goalCalories = Number(localStorage.getItem("calorieGoal") || 1580);

  // 表示を更新
  document.getElementById("calorie").textContent = todayCalories;
  const remaining = goalCalories - todayCalories;
  document.querySelector(".rank-sub").textContent = `目標まであと ${remaining} kcal`;
}

