// pages/characters/secret/_unlock.js
(function(){
  const DEX_KEY = 'dex_state_v1';
  const BASE_ID = 64; // 0始まり：#65→id=64

  function load(){ try{ return JSON.parse(localStorage.getItem(DEX_KEY)||'{}'); }catch{ return {}; } }
  function save(dex){
    localStorage.setItem(DEX_KEY, JSON.stringify(dex||{}));
    try{
      window.dispatchEvent(new StorageEvent('storage', {key: DEX_KEY, newValue: JSON.stringify(dex||{})}));
    }catch(_){}
  }

  // no: 65..70 / file: 'secret_65.png' みたいに渡す
  window.unlockSecret = function(no, file){
    const id = BASE_ID + (no - 65);     // 65→64, 66→65 ...
    const dex = load();
    dex.unlocked = Object.assign({}, dex.unlocked, { [id]: true });
    dex.secrets  = Object.assign({}, dex.secrets,  { [no]: file });
    if (!dex.selected) dex.selected = file; // 初回は自動採用
    save(dex);
  };

  // 図鑑側で使いたい時用（任意）
  window.getSecretFile = function(no, fallback){
    const dex = load();
    return (dex.secrets && dex.secrets[no]) || fallback;
  };
})();
