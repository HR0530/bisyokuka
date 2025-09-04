// pages/characters/secret/_unlock.js
// 図鑑解放ヘルパ（#65〜）。相対/絶対パスの両対応・旧データ互換。
// 使い方例：unlockSecret(70, "secret_70.png")
//           unlockSecret(70, "/pages/characters/secret/70/secret_70.png")
// HTML側でベースを指定（任意）：window.DEX_IMG_BASE = './' など
(function(){
  'use strict';

  const DEX_KEY  = 'dex_state_v1';
  const BASE_ID  = 64; // 0始まり: #65 → id=64
  const START_NO = 65; // 図鑑Noの起点

  // ===== 画像ベースパス =====
  // 例: window.DEX_IMG_BASE = '/pages/characters/project-root/'
  let IMG_BASE = (window.DEX_IMG_BASE || '/pages/characters/project-root/');
  const normBase = s => (s||'').replace(/\\/g,'/').replace(/\/+$/,'') + '/';
  IMG_BASE = normBase(IMG_BASE);
  window.setDexImgBase = function(base){ IMG_BASE = normBase(base); };

  // ===== URL/パス ヘルパ =====
  const isAbs = (s)=> /^(https?:)?\/\//.test(s||"") || (s||"").startsWith("/");
  function toUrl(fname){
    if (!fname) return IMG_BASE;
    return isAbs(fname) ? fname : IMG_BASE + fname;
  }
  function toStoredName(file){
    if (!file) return "";
    if (isAbs(file)) return file;                     // 絶対URL/絶対パスはそのまま保存
    if (file.startsWith(IMG_BASE)) return file.slice(IMG_BASE.length);
    return file.split('/').pop();                     // 末尾ファイル名のみ
  }

  // ===== 永続化ユーティリティ =====
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
        // 図鑑・ゲームへ変更通知
        window.dispatchEvent(new StorageEvent('storage', { key: DEX_KEY, newValue: str }));
      }catch(_){}
    }catch(_){}
  }

  // ===== 互換マイグレーション（旧: secretFiles[id] → 新: secrets[no]）=====
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

  // ===== 公開API =====

  /**
   * 解放登録
   * @param {number} no  図鑑No（65〜）
   * @param {string} file ファイル名 or 絶対パス（例: "secret_70.png" / "/pages/.../secret_70.png"）
   */
  window.unlockSecret = function(no, file){
    if (typeof no !== 'number' || !file) return;
    file = toStoredName(file); // ← 正規化
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

    // 初回は自動選択
    if (!dex.selected) dex.selected = file;

    save(dex);
  };

  /**
   * 図鑑Noから実URLを取得（新→旧の順で解決）
   */
  window.getSecretFile = function(no, fallback){
    const dex = load();
    let fname = (dex.secrets && dex.secrets[no]) || null;
    if (!fname){
      const id = BASE_ID + (no - START_NO);
      fname = dex.secretFiles && dex.secretFiles[String(id)];
    }
    fname = fname || fallback || '';
    return toUrl(fname);
  };

  /**
   * 選択中スキンの実URL（なければ fallback）
   */
  window.getSelectedCharUrl = function(fallback){
    const dex = load();
    const fname = dex.selected || fallback || '';
    return toUrl(fname);
  };

  /**
   * 図鑑Noを選択（新フォーマット優先。旧id数値でも対応）
   */
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

  /**
   * 選択を直接変更（ファイル名 or 絶対パス）
   */
  window.resetSelectedTo = function(file){
    const dex = load();
    dex.selected = toStoredName(file || 'char.png');
    save(dex);
  };

})();
