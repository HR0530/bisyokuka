const STORAGE_KEY = "bisyokuka_meals_v2";

const els = {
  sumKcal: document.getElementById("sumKcal"),
  sumP: document.getElementById("sumP"),
  sumF: document.getElementById("sumF"),
  sumC: document.getElementById("sumC"),
  daysRoot: document.getElementById("daysRoot"),
  chips: Array.from(document.querySelectorAll(".chip")),
  expandAll: document.getElementById("expandAll"),
  collapseAll: document.getElementById("collapseAll"),
};

const fmt = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);

function loadMeals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function normalizeMeal(m) {
  const totals = m.totals || { protein:0, fat:0, carbs:0, kcal: Number(m.kcal || 0) };
  return {
    ...m,
    food: m.food || "不明",
    ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
    totals: {
      protein: Number(totals.protein) || 0,
      fat: Number(totals.fat) || 0,
      carbs: Number(totals.carbs) || 0,
      kcal: Number(totals.kcal) || 0,
    }
  };
}

function rangeFilter(range) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0,0,0,0);

  if (range === "today") return (d) => d >= start;
  if (range === "week") {
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    return (d) => d >= start;
  }
  if (range === "month") {
    start.setDate(1);
    return (d) => d >= start;
  }
  return () => true;
}

function sumTotals(items) {
  return items.reduce((a, m) => ({
    kcal: a.kcal + (m.totals?.kcal || 0),
    protein: a.protein + (m.totals?.protein || 0),
    fat: a.fat + (m.totals?.fat || 0),
    carbs: a.carbs + (m.totals?.carbs || 0),
  }), { kcal:0, protein:0, fat:0, carbs:0 });
}

function groupByDay(items) {
  const map = new Map();
  for (const m of items) {
    const k = (m.date||"").slice(0,10);
    if(!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return Array.from(map.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
}

function render(range = "today") {
  els.chips.forEach(c => c.classList.toggle("active", c.dataset.range === range));

  const meals = loadMeals().map(normalizeMeal);
  const inRange = meals.filter(m => rangeFilter(range)(new Date(m.date)));
  const grouped = groupByDay(inRange);

  const total = sumTotals(inRange);
  els.sumKcal.textContent = fmt(total.kcal);
  els.sumP.textContent = fmt(total.protein);
  els.sumF.textContent = fmt(total.fat);
  els.sumC.textContent = fmt(total.carbs);

  els.daysRoot.innerHTML = "";
  if (grouped.length === 0) {
    els.daysRoot.innerHTML = `<p class="muted">この期間の記録はありません。</p>`;
    return;
  }

  for (const [date, arr] of grouped) {
    const daySum = sumTotals(arr);
    const d = new Date(date + "T00:00:00");

    const day = document.createElement("details");
    day.className = "day";
    day.open = false;

    day.innerHTML = `
      <summary class="day-summary">
        <span class="date">${d.toLocaleDateString('ja-JP', { month:"2-digit", day:"2-digit", weekday:"short" })}</span>
        <span class="chips">
          <span class="chip k">${fmt(daySum.kcal)} kcal</span>
          <span class="chip p">P ${fmt(daySum.protein)} g</span>
          <span class="chip f">F ${fmt(daySum.fat)} g</span>
          <span class="chip c">C ${fmt(daySum.carbs)} g</span>
        </span>
      </summary>
      <div class="meals">
        ${arr.map(m => renderMealRow(m)).join("")}
      </div>
    `;
    els.daysRoot.appendChild(day);
  }
}

function renderMealRow(m) {
  const rows = (m.ingredients||[]).map(it => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td class="num">${fmt(it.grams ?? 0)}</td>
      <td class="num">${fmt(it.protein ?? 0)}</td>
      <td class="num">${fmt(it.fat ?? 0)}</td>
      <td class="num">${fmt(it.carbs ?? 0)}</td>
      <td class="num">${fmt(it.kcal ?? 0)}</td>
    </tr>
  `).join("");

  return `
    <details class="meal" open>
      <summary class="meal-summary">
        ${m.photo ? `<img src="${m.photo}" alt="" class="thumb" />` : `<div class="thumb ph"></div>`}
        <div class="meta">
          <div class="title">${escapeHtml(m.food)}</div>
          <div class="badges">
            <span class="kcal">${fmt(m.totals.kcal)} kcal</span>
            <span class="p">P ${fmt(m.totals.protein)} g</span>
            <span class="f">F ${fmt(m.totals.fat)} g</span>
            <span class="c">C ${fmt(m.totals.carbs)} g</span>
          </div>
          ${m.comment ? `<div class="comment">「${escapeHtml(m.comment)}」</div>` : ""}
        </div>
      </summary>
      ${rows ? `
      <details class="ingredients">
        <summary>🍖 食材ごとの栄養一覧</summary>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>食材</th><th class="num">g</th><th class="num">P</th><th class="num">F</th><th class="num">C</th><th class="num">kcal</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>` : ""}
    </details>
  `;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

function setAllDetails(open) {
  document.querySelectorAll("details.day, details.meal, details.ingredients").forEach(d => d.open = open);
}

els.chips.forEach(chip => chip.addEventListener("click", () => render(chip.dataset.range)));
els.expandAll.addEventListener("click", () => setAllDetails(true));
els.collapseAll.addEventListener("click", () => setAllDetails(false));

render("today");
