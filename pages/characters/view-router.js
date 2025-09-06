<script>
(function () {
  // 1) ユーザー強制指定（?view=sp / ?view=pc）を記憶
  const qs = new URLSearchParams(location.search);
  const force = (qs.get("view") || "").toLowerCase();
  if (force === "sp" || force === "pc") {
    try { localStorage.setItem("viewMode", force); } catch {}
    // URLの ?view は以後不要なので削除（共有しやすくなる）
    qs.delete("view");
    const u = new URL(location.href);
    u.search = qs.toString();
    history.replaceState(null, "", u.toString());
  }

  const pref = (localStorage.getItem("viewMode") || "").toLowerCase();

  // 2) 端末判定（指がcoarse & 幅<=820px を重視、UAは補助）
  function isMobile() {
    const mq = matchMedia("(max-width: 820px)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const ua = navigator.userAgent || "";
    const uaMobile = /Android|iPhone|iPod|Windows Phone|webOS/i.test(ua);
    return (mq && coarse) || uaMobile;
  }

  // 3) ページごとの対応表（置き場所に合わせて必要ならファイル名調整）
  //    例：home は index_pc.html / index_sp.html、
  //        meals は index.html / index.mobile.html など。
  const MAP = [
    // ホーム（ルート）
    { test:/\/index(?:\.html)?$/i, pc:"index_pc.html", sp:"index_sp.html" },

    // 食事記録
    { test:/\/pages\/meal\/index(?:\.html)?$/i, pc:"index.html", sp:"index.mobile.html" },

    // 分析（insights）
    { test:/\/pages\/insights\/index(?:\.html)?$/i, pc:"index.html", sp:"insights.mobile.html" },
    { test:/\/pages\/insights\/charts(?:\.html)?$/i, pc:"charts.html", sp:"charts.mobile.html" },

    // キャラ育成（characters）
    { test:/\/pages\/characters\/index(?:\.html)?$/i, pc:"index.html", sp:"index.mobile.html" },
  ];

  // 4) 現在のパスに該当するルールを探す
  const path = location.pathname;
  const rule = MAP.find(r => r.test.test(path));
  if (!rule) return; // 対象外ページなら何もしない

  // 5) すでに目的の版にいるかを判定
  const isOnPC = path.endsWith("/" + rule.pc);
  const isOnSP = path.endsWith("/" + rule.sp);

  function go(target) {
    if (!target) return;
    if (path.endsWith("/" + target)) return; // もうそこにいる
    const u = new URL(location.href);
    u.pathname = u.pathname.replace(/[^/]+$/, target);
    // クエリ＆ハッシュは維持（?view は既に除去済み）
    location.replace(u.toString());
  }

  // 6) 優先ロジック：ユーザー指定 > 端末判定
  if (pref === "sp") { if (!isOnSP) go(rule.sp); return; }
  if (pref === "pc") { if (!isOnPC) go(rule.pc); return; }

  if (isMobile()) { if (!isOnSP) go(rule.sp); }
  else            { if (!isOnPC) go(rule.pc); }
})();
</script>
