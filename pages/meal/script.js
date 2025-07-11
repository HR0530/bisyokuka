document.getElementById('meal-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const fileInput = document.getElementById('meal-photo');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const imageSrc = event.target.result;

    // 仮のカロリー計算（実際はAI等で推定）
    const estimatedCalories = Math.floor(Math.random() * 500) + 100;

    const timestamp = new Date().toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    const entry = document.createElement('div');
    entry.className = 'record-entry';
    entry.innerHTML = `
      <img src="${imageSrc}" alt="食事画像" />
      <p><strong>アップロード日時:</strong> ${timestamp}</p>
      <p><strong>推定カロリー:</strong> ${estimatedCalories} kcal</p>
    `;

    document.getElementById('record-list').prepend(entry);
  };

  reader.readAsDataURL(file);
  fileInput.value = ''; // フォームをリセット
});
