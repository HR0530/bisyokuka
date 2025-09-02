// pages/characters/secret/_unlock.js
const DEX_KEY = 'dex_state_v1';

function loadDex(){ try{ return JSON.parse(localStorage.getItem(DEX_KEY)||'{}'); }catch{ return {}; } }
function saveDex(v){ localStorage.setItem(DEX_KEY, JSON.stringify(v||{})); }

/**
 * シークレット解放
 * @param {number} secretId  例) 64（= #65）, 65（= #66）
 * @param {string} fileName  実体PNG名 例) 'secret_65.png'
 * @param {boolean} autoSelect  初回選択するか（既定: true）
 */
function grantSecret(secretId, fileName, autoSelect=true){
  const dex = loadDex();
  dex.unlocked   = Object.assign({}, dex.unlocked, { [secretId]: true });
  dex.secretFiles= Object.assign({}, dex.secretFiles, { [secretId]: fileName });
  if (autoSelect && !dex.selected) dex.selected = fileName;
  saveDex(dex);

  // 同一オリジンで他タブへも伝播させたい時
  try{ window.dispatchEvent(new StorageEvent('storage', {key:DEX_KEY, newValue:JSON.stringify(dex)})); }catch(_){}
}
