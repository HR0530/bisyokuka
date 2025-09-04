// pages/characters/secret/_unlock.js
(function(){
  const DEX_KEY = 'dex_state_v1';
  const BASE_ID = 64; // 0始まり：#65→id=64

  // 画像のベースパス（どのページからでも同じURLで参照できるように）
  let IMG_BASE = (window.DEX_IMG_BASE || '/pages/characters/project-root/'); // 先頭は / 推奨
  const normBase = s => (s||'').replace(/\\/g,'/').replace(/\/+$/,'') + '/';
  IMG_BASE = normBase(IMG_BASE);

  // 後から動的に変えたいとき用（任意）
  window.setDexImgBase = function(base){ IMG_BASE = normBase(base); };

  function load(){ try{ return JSON.parse(localStorage.getItem(DEX_KEY)||'{}'); }catch{ return {}; } }
  function save(dex){
    localStorage.setItem(DEX_KEY, JSON.stringify(dex||{}));
    try{
      window.dispatchEvent(new StorageEvent('storage', {key: DEX_KEY, newValue: JSON.stringify(dex||{})}));
    }catch(_){}
  }

  // #65..#70 などの解放登録（file はファイル名だけを入れる: 例 "secret_70.png"）
  window.unlockSecret = function(no, file){
    const id = BASE_ID + (no - 65);     // 65→64, 66→65 ...
    const dex = load();
    dex.unlocked = Object.assign({}, dex.unlocked, { [id]: true });
    dex.secrets  = Object.assign({}, dex.secrets,  { [no]: file }); // noキーで管理
    if (!dex.selected) dex.selected = file; // 初回は自動採用
    save(dex);
  };

  // 図鑑やゲーム側で使うとき：実URLを返す（IMG_BASE を先頭に付ける）
  window.getSecretFile = function(no, fallback){
    const dex = load();
    const fname = (dex.secrets && dex.secrets[no]) || fallback || '';
    return IMG_BASE + fname;
  };

  // 選択中のスキンURL（任意）
  window.getSelectedCharUrl = function(fallback){
    const dex = load();
    const fname = dex.selected || fallback || '';
    return IMG_BASE + fname;
  };

  // 選択の切替（任意）
  window.selectSecret = function(no){
    const dex = load();
    if (dex.secrets && dex.secrets[no]){ dex.selected = dex.secrets[no]; save(dex); }
  };
})();
