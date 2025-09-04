// pages/characters/secret/_unlock.js
(function(){
  'use strict';

  const DEX_KEY  = 'dex_state_v1';
  const BASE_ID  = 64; // 0始まり: #65 → id=64
  const START_NO = 65; // 図鑑Noの起点

  // === 画像ベースパス（どの階層からでも安定参照） ===
  // 例: index.html 側で window.DEX_IMG_BASE = '/pages/characters/project-root/';
  let IMG_BASE = (window.DEX_IMG_BASE || '/pages/characters/project-root/');
  const normBase = s => (s||'').replace(/\\/g,'/').replace(/\/+$/,'') + '/';
  IMG_BASE = normBase(IMG_BASE);
  window.setDexImgBase = function(base){ IMG_BASE = normBase(base); };

  // === 永続化ユーティリティ ===
  const safeParse = (s)=>{ try{ return JSON.parse(s); }catch(_){ return {}; } };
  function load(){
    try{ return safeParse(localStorage.getItem(DEX_KEY) || '{}'); }
    catch(_){ return {}; }
  }
  function save(dex){
    try{
      const str = JSON.stringify(dex || {});
      localStorage.setItem(DEX_KEY, str);
      try{
        // 図鑑・ゲームへ変更通知（同タブでも受けられる実装）
        window.dispatchEvent(new StorageEvent('storage', { key: DEX_KEY, newValue: str }));
      }catch(_){}
    }catch(_){}
  }

  // === 互換マイグレーション（旧: secretFiles[id] → 新: secrets[no]） ===
  (function migrate(){
    const dex = load();
    let changed = false;
    const sf = dex.secretFiles || {};
    dex.secrets = dex.secrets || {};
    Object.keys(sf).forEach(idStr=>{
      const id = Number(idStr);
      if (!Number.isFinite(id)) return;
      const no = START_NO + (id - BASE_ID); // id64→no65, id68→no69…
      if (!dex.secrets[no]){ dex.secrets[no] = sf[idStr]; changed = true; }
    });
    if (changed) save(dex);
  })();

  // === 公開API ===

  // 解放登録：no は図鑑No（65〜）、file は「ファイル名のみ」（例: "secret_70.png"）
  window.unlockSecret = function(no, file){
    if (typeof no !== 'number' || !file) return;
    const id = BASE_ID + (no - START_NO);
    const dex = load();

    // 1) 解放フラグ（idベース）
    dex.unlocked = Object.assign({}, dex.unlocked, { [id]: true });

    // 2) 新フォーマット: noキーでファイル名
    dex.secrets  = Object.assign({}, dex.secrets,  { [no]: file });

    // 3) 旧互換: idキーでファイル名
    const sf = Object.assign({}, dex.secretFiles || {});
    sf[String(id)] = file;
    dex.secretFiles = sf;

    // 初回は自動選択（任意）
    if (!dex.selected) dex.selected = file;

    save(dex);
  };

  // 図鑑Noから実URLを取得（新→旧の順で解決）
  window.getSecretFile = function(no, fallback){
    const dex = load();
    let fname = (dex.secrets && dex.secrets[no]) || null;
    if (!fname){
      const id = BASE_ID + (no - START_NO);
      fname = dex.secretFiles && dex.secretFiles[String(id)];
    }
    fname = fname || fallback || '';
    return IMG_BASE + fname;
  };

  // 選択中スキンの実URL（なければ fallback）
  window.getSelectedCharUrl = function(fallback){
    const dex = load();
    const fname = dex.selected || fallback || '';
    return IMG_BASE + fname;
  };

  // 図鑑Noを選択（新フォーマット優先。旧id数値でも一応対応）
  window.selectSecret = function(no){
    const dex = load();
    if (dex.secrets && dex.secrets[no]){
      dex.selected = dex.secrets[no]; save(dex); return true;
    }
    const id = Number(no);
    if (Number.isFinite(id) && dex.secretFiles && dex.secretFiles[String(id)]){
      dex.selected = dex.secretFiles[String(id)]; save(dex); return true;
    }
    return false;
  };

  // 任意：選択を直接ファイル名で変更（#69の「キャラリセット」等で使用可）
  window.resetSelectedTo = function(file){
    const dex = load();
    dex.selected = file || 'char.png';
    save(dex);
  };

})();
