// 設定ページでの保存処理
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
    };
    reader.readAsDataURL(iconFile);
  }

  alert("設定を保存しました！");
  window.location.href = "index_pc.html";
}

// 戻るボタン
function goBack() {
  window.location.href = "index_pc.html";
}
