/* ---- 必要なDOM ---- */
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");
const levelText = document.getElementById("levelText");
const titleBadge = document.getElementById("titleBadge");
const logEl = document.getElementById("activityLog");
const hpText = document.getElementById("hpText");
const satiText = document.getElementById("satisfactionText");
const character = document.getElementById("character");

/* ---- キャラ画像（静止画）を強制適用 ---- */
(function ensureSkin(){
  const candidates = [
    './project-root/char.png',
    'project-root/char.png',
    '../project-root/char.png',
    '/project-root/char.png'
  ];
  // 最初にヒットしたパスを使う（GitHub Pages 等の階層ズレ対策）
  (async ()=>{
    for (const p of candidates){
      const ok = await new Promise(res=>{
        const img = new Image();
        img.onload = ()=>res(true);
        img.onerror = ()=>res(false);
        img.src = p + '?v=' + Date.now();
      });
      if (ok){ character.style.backgroundImage = `url("${p}")`; return; }
    }
    console.warn('char.png が見つかりません。配置とパスを確認してください。');
  })();
})();

/* ---- ここから下は既存のXP/クエスト表示（必要に応じて省略OK） ---- */
const STORAGE_VERSION = "v1";
const CHAR_KEY  = `bs_char_state_${STORAGE_VERSION}`;
const titles = [
  { minLv: 1, name: "見習いフーディー" },
  { minLv: 3, name: "美食研究家" },
  { minLv: 5, name: "美食家" },
  { minLv: 7, name: "食の達人" },
  { minLv:10, name: "グランド・グルメ" },
];
let state = load(CHAR_KEY) || { level:1, xp:0, hp:100, satisfaction:50 };

function load(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch{ return null; } }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function xpNeeded(lv){ return 100 + (lv-1)*50; }

function refreshHeader(){
  const need = xpNeeded(state.level);
  const pct = Math.min(100, Math.round((state.xp/need)*100));
  xpFill.style.width = `${pct}%`;
  xpText.textContent = `${state.xp} / ${need} XP`;
  levelText.textContent = `Lv.${state.level}`;
  hpText.textContent = state.hp;
  satiText.textContent = state.satisfaction;
  const t = titles.reduce((acc,cur)=> state.level>=cur.minLv ? cur.name : acc, titles[0].name);
  titleBadge.textContent = t;
}
refreshHeader();

/* ルーティングなど他の処理は必要に応じて元のコードを流用してください */
