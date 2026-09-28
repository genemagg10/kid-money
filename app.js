/* One child per page. Balances come only from #kid-data on this page. */

const state = {
  screen: "home",
  monthFrom: null,
  panel: "why",
};

const $ = (sel) => document.querySelector(sel);

function readKid() {
  const el = document.getElementById("kid-data");
  if (!el) return null;
  try {
    const kid = JSON.parse(el.textContent);
    if (!kid || !kid.name || !kid.spend || !kid.save || !kid.grow) return null;
    return kid;
  } catch (err) {
    return null;
  }
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(n) {
  return "$" + Math.round(Number(n)).toLocaleString("en-US");
}

function goalPct(save) {
  const target = Number(save.goalTarget);
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(save.goalCurrent) / target) * 100)));
}

function ringsHtml(kinds, numbered) {
  return kinds
    .map((k, i) => {
      const cls = "ring" + (k === "on" ? " on" : k === "mid" ? " mid" : "");
      const inner = numbered ? String(i + 1) : k === "on" ? "✓" : k === "mid" ? "●" : "○";
      return `<div class="${cls}" aria-hidden="true">${inner}</div>`;
    })
    .join("");
}

function clock() {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}

function shell(inner) {
  return `<div class="phone">
    <div class="status"><span>${esc(clock())}</span><span>iPad</span></div>
    ${inner}
    <div class="home-bar"></div>
  </div>`;
}

function rowsHtml(rows) {
  return rows
    .map((r) => `<div class="row"><span class="${r.mute ? "mute" : ""}">${esc(r.text)}</span></div>`)
    .join("");
}

function renderHome(kid) {
  const g = kid.grow;
  const s = kid.save;
  return shell(`
    <div class="brand">Family money · look only</div>
    <h1>Hi ${esc(kid.name)}</h1>
    <p class="sub">Your jars — serious money, simple view</p>

    <button type="button" class="card tap" data-go="spend">
      <div class="tick spend"></div>
      <div class="jar-name">Spend</div>
      <div class="amount">${money(kid.spend.balance)}</div>
      <div class="blurb">${esc(kid.spend.blurb)}</div>
      <div class="why">Why this jar? · ${esc(kid.spend.why)}</div>
    </button>

    <button type="button" class="card tap" data-go="save">
      <div class="tick save"></div>
      <div class="jar-name">Save</div>
      <div class="amount">${money(s.balance)}</div>
      <div class="blurb">${esc(s.blurbHome)}</div>
      <div class="goal-bar"><div class="goal-fill" style="width:${goalPct(s)}%"></div></div>
      <div class="why">Why this jar? · ${esc(s.why)}</div>
    </button>

    <button type="button" class="card tap" data-go="grow">
      <div class="tick grow"></div>
      <div class="jar-name">Grow</div>
      <div class="progress-label">${esc(g.label)}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${Number(g.pathPct)}%"></div></div>
      <div class="milestone-row">${ringsHtml(g.rings, true)}</div>
      <div class="progress-sub">${esc(g.sub)}</div>
      <div class="why">Why this jar? · ${esc(g.why)}</div>
    </button>

    <div class="footer-note">
      <p>Ask a grown-up to move money</p>
      <p>This app only shows your jars</p>
    </div>
  `);
}

function renderSpend(kid) {
  const whyOn = state.panel === "why";
  return shell(`
    <div class="top-row">
      <button type="button" class="back" data-back="home">← Back</button>
      <div class="chip on static">${esc(kid.name)}</div>
    </div>
    <div class="tick spend"></div>
    <div class="jar-name" style="margin-top:6px">Spend</div>
    <div class="amount lg">${money(kid.spend.balance)}</div>
    <p class="sub" style="margin-bottom:12px">${esc(kid.spend.blurb)}</p>

    <div class="card tip">
      <p class="tip-line">Tip · <span>${esc(kid.spend.tip)}</span></p>
    </div>

    <div class="chips" style="margin-bottom:8px">
      <button type="button" class="chip soft ${whyOn ? "on" : ""}" data-panel="why">Why this jar?</button>
      <button type="button" class="chip soft ${!whyOn ? "on" : ""}" data-panel="month">This month</button>
    </div>

    ${
      whyOn
        ? `<div class="card soft">
            <p class="blurb" style="color:#141416;margin-bottom:6px">${esc(kid.spend.whyBody[0])}</p>
            <p class="blurb">${esc(kid.spend.whyBody[1])}</p>
          </div>`
        : `<div class="section-label">This month</div>
           <div class="card">
             ${rowsHtml(kid.spend.month)}
           </div>
           <button type="button" class="chip soft" data-go-month="spend" style="width:100%;margin-top:4px">Open full month story</button>`
    }
  `);
}

function renderSave(kid) {
  const s = kid.save;
  const whyOn = state.panel === "why";
  return shell(`
    <div class="top-row">
      <button type="button" class="back" data-back="home">← Back</button>
      <div class="chip on static">${esc(kid.name)}</div>
    </div>
    <div class="tick save"></div>
    <div class="jar-name" style="margin-top:6px">Save</div>
    <div class="amount lg">${money(s.balance)}</div>
    <p class="sub" style="margin-bottom:12px">${esc(s.blurbDetail)}</p>
    <div class="goal-bar" style="margin-bottom:16px"><div class="goal-fill" style="width:${goalPct(s)}%"></div></div>

    <div class="card tip">
      <p class="tip-line">Tip · <span>${esc(s.tip)}</span></p>
    </div>

    <div class="chips" style="margin-bottom:8px">
      <button type="button" class="chip soft ${whyOn ? "on" : ""}" data-panel="why">Why this jar?</button>
      <button type="button" class="chip soft ${!whyOn ? "on" : ""}" data-panel="month">This month</button>
    </div>

    ${
      whyOn
        ? `<div class="card soft">
            <p class="blurb" style="color:#141416;margin-bottom:6px">${esc(s.whyBody[0])}</p>
            <p class="blurb">${esc(s.whyBody[1])}</p>
          </div>`
        : `<div class="section-label">This month</div>
           <div class="card">
             ${rowsHtml(s.month)}
           </div>
           <button type="button" class="chip soft" data-go-month="save" style="width:100%;margin-top:4px">Open full month story</button>`
    }
  `);
}

function renderGrow(kid) {
  const g = kid.grow;
  const whyOn = state.panel === "why";
  return shell(`
    <button type="button" class="back" data-back="home">← Back</button>
    <div class="tick grow"></div>
    <div class="jar-name" style="margin-top:6px">Grow</div>
    <h1 style="font-size:32px;margin-bottom:8px">On the way</h1>
    <p class="sub">Planted for years. You look — grown-ups plant.</p>

    <div class="card tip">
      <p class="tip-line">Tip · <span>${esc(g.tip)}</span></p>
    </div>

    <div class="chips" style="margin-bottom:8px">
      <button type="button" class="chip soft ${whyOn ? "on" : ""}" data-panel="why">Why this jar?</button>
    </div>

    ${
      whyOn
        ? `<div class="card soft" style="margin-bottom:14px">
            <p class="blurb" style="color:#141416;margin-bottom:6px">This jar is planted for years, not today.</p>
            <p class="blurb">You watch the path. Grown-ups take care of planting.</p>
          </div>`
        : ""
    }

    <div class="section-label">Inside this jar</div>

    <div class="card">
      <div class="progress-label">For college</div>
      <div class="progress-sub">${esc(g.college.sub)}</div>
      <div class="progress-track"><div class="progress-fill college" style="width:${Number(g.college.pct)}%"></div></div>
      <div class="milestone-row">${ringsHtml(g.college.rings)}</div>
      <div class="progress-sub">${esc(g.college.path)}</div>
    </div>

    <div class="card">
      <div class="progress-label">For later</div>
      <div class="progress-sub">${esc(g.later.sub)}</div>
      <div class="progress-track"><div class="progress-fill later" style="width:${Number(g.later.pct)}%"></div></div>
      <div class="milestone-row">${ringsHtml(g.later.rings)}</div>
      <div class="progress-sub">${esc(g.later.path)}</div>
    </div>
  `);
}

function renderMonth(kid) {
  const from = state.monthFrom === "spend" ? "spend" : "save";
  const story = from === "spend" ? kid.spend.monthStory : kid.save.monthStory;
  const jarLabel = from === "spend" ? "Spend" : "Save";
  const monthName = new Date().toLocaleString("en-US", { month: "long" });
  return shell(`
    <button type="button" class="back" data-back="${from}">← ${jarLabel} jar</button>
    <h1>This month</h1>
    <p class="sub">${esc(kid.name)} · ${esc(monthName)} · from your ${jarLabel} jar</p>

    <div class="card tip">
      <p class="tip-line">Tip · <span>${esc(story.tip)}</span></p>
    </div>

    <div class="card">
      <div class="jar-name">Came in</div>
      <div class="amount">${money(story.in.amount)}</div>
      <div class="blurb">${esc(story.in.blurb)}</div>
    </div>
    <div class="card">
      <div class="jar-name">${esc(story.outLabel)}</div>
      <div class="amount">${money(story.out.amount)}</div>
      <div class="blurb">${esc(story.out.blurb)}</div>
    </div>
    <div class="card soft">
      <p class="blurb" style="color:#141416">${esc(story.note)}</p>
    </div>
  `);
}

function render(kid) {
  const root = $("#app");
  if (state.screen === "home") root.innerHTML = renderHome(kid);
  else if (state.screen === "spend") root.innerHTML = renderSpend(kid);
  else if (state.screen === "save") root.innerHTML = renderSave(kid);
  else if (state.screen === "grow") root.innerHTML = renderGrow(kid);
  else if (state.screen === "month") root.innerHTML = renderMonth(kid);
  else root.innerHTML = renderHome(kid);
  bind(kid);
}

function bind(kid) {
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      state.screen = el.getAttribute("data-go");
      state.panel = "why";
      render(kid);
    });
  });
  document.querySelectorAll("[data-back]").forEach((el) => {
    el.addEventListener("click", () => {
      state.screen = el.getAttribute("data-back");
      render(kid);
    });
  });
  document.querySelectorAll("[data-panel]").forEach((el) => {
    el.addEventListener("click", () => {
      state.panel = el.getAttribute("data-panel");
      render(kid);
    });
  });
  document.querySelectorAll("[data-go-month]").forEach((el) => {
    el.addEventListener("click", () => {
      state.monthFrom = el.getAttribute("data-go-month");
      state.screen = "month";
      render(kid);
    });
  });
}

const kid = readKid();
const root = $("#app");
if (!kid || !root) {
  if (root) root.textContent = "These jars could not be opened.";
} else {
  render(kid);
}
