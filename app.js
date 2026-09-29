/* One child per page. Account balances come only from #kid-data.
   Piggy counts, the spend/save split, and money owed are saved on this device, one key per child.
   The split and anything owed do not change the savings-account balance. */

const state = {
  screen: "home",
  monthFrom: null,
  panel: "why",
  piggyDraft: "",
  piggyError: "",
  owedDraft: "",
  owedError: "",
};

const $ = (sel) => document.querySelector(sel);

function readKid() {
  const el = document.getElementById("kid-data");
  if (!el) return null;
  try {
    const kid = JSON.parse(el.textContent);
    if (!kid || !kid.name || !kid.spend || !kid.save || !kid.grow) return null;
    if (!kid.grow.college || !kid.grow.brokerage) return null;
    return kid;
  } catch (err) {
    return null;
  }
}

function profileId(kid) {
  const path = (location.pathname || "").toLowerCase();
  if (path.includes("/luca")) return "luca";
  if (path.includes("/ella")) return "ella";
  const id = String(kid.id || kid.name || "kid").toLowerCase();
  return id;
}

function piggyKey(kid) {
  return "family-money-piggy:" + profileId(kid);
}

function readPiggy(kid) {
  try {
    const raw = localStorage.getItem(piggyKey(kid));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.amount !== "number" || !Number.isFinite(data.amount)) return null;
    if (data.amount < 0 || data.amount > 9999.99) return null;
    const amount = Math.round(data.amount * 100) / 100;
    let saveAmount = 0;
    if (typeof data.saveAmount === "number" && Number.isFinite(data.saveAmount)) {
      saveAmount = Math.round(data.saveAmount * 100) / 100;
    }
    if (saveAmount < 0) saveAmount = 0;
    if (saveAmount > amount) saveAmount = amount;
    return {
      amount,
      saveAmount,
      countedAt: typeof data.countedAt === "string" ? data.countedAt : "",
    };
  } catch (err) {
    return null;
  }
}

function writeStoredPiggy(kid, payload) {
  try {
    localStorage.setItem(piggyKey(kid), JSON.stringify(payload));
    return payload;
  } catch (err) {
    return null;
  }
}

function writePiggy(kid, amount) {
  const prev = readPiggy(kid);
  const total = Math.round(amount * 100) / 100;
  let saveAmount = prev ? prev.saveAmount : 0;
  if (saveAmount > total) saveAmount = total;
  if (saveAmount < 0) saveAmount = 0;
  return writeStoredPiggy(kid, {
    amount: total,
    saveAmount,
    countedAt: new Date().toISOString(),
  });
}

function owedKey(kid) {
  return "family-money-owed:" + profileId(kid);
}

function readOwed(kid) {
  try {
    const raw = localStorage.getItem(owedKey(kid));
    if (!raw) return { amount: 0 };
    const data = JSON.parse(raw);
    if (!data || typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
      return { amount: 0 };
    }
    const amount = Math.round(data.amount * 100) / 100;
    if (amount > 9999.99) return { amount: 0 };
    return { amount };
  } catch (err) {
    return { amount: 0 };
  }
}

function writeOwed(kid, amount) {
  const total = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(total) || total <= 0) {
    try {
      localStorage.removeItem(owedKey(kid));
    } catch (err) {
      return null;
    }
    return { amount: 0 };
  }
  if (total > 9999.99) return null;
  try {
    localStorage.setItem(owedKey(kid), JSON.stringify({ amount: total }));
    return { amount: total };
  } catch (err) {
    return null;
  }
}

function writeSplit(kid, saveAmount) {
  const prev = readPiggy(kid);
  if (!prev) return null;
  let save = Math.round(Number(saveAmount) * 100) / 100;
  if (!Number.isFinite(save) || save < 0) save = 0;
  if (save > prev.amount) save = prev.amount;
  return writeStoredPiggy(kid, {
    amount: prev.amount,
    saveAmount: save,
    countedAt: prev.countedAt,
  });
}

function toCents(n) {
  return Math.round(Number(n) * 100);
}

function fromCents(cents) {
  return cents / 100;
}

function splitOf(piggy) {
  if (!piggy) return null;
  const totalCents = toCents(piggy.amount);
  let saveCents = toCents(piggy.saveAmount || 0);
  if (saveCents < 0) saveCents = 0;
  if (saveCents > totalCents) saveCents = totalCents;
  return {
    totalCents,
    saveCents,
    spendCents: totalCents - saveCents,
    total: fromCents(totalCents),
    save: fromCents(saveCents),
    spend: fromCents(totalCents - saveCents),
  };
}

function readyText(spendCents, owedAmount) {
  const owedCents = toCents(owedAmount || 0);
  if (owedCents <= 0) return "";
  const ready = Math.max(0, spendCents - owedCents);
  let text = "Still ready to use · " + money(fromCents(ready));
  if (owedCents > spendCents) text += ". You can pay the rest when you have it.";
  return text;
}

function splitMood(split) {
  if (!split || split.totalCents <= 0) return "";
  if (split.saveCents === 0) return "All of this is ready to use. Slide if you want some to wait.";
  if (split.spendCents === 0) return "All of this can wait. You can slide it back anytime.";
  return "Some is ready to use. Some can wait. Either way is a good choice.";
}

function parseOwed(raw) {
  const text = String(raw).trim().replace(/[$,\s]/g, "");
  if (!text) return { error: "Type how much you owe." };
  if (/^0*(?:\.0{0,2})?$/.test(text)) return { amount: 0 };
  if (!/^(?:\d+\.\d{0,2}|\d+|\.\d{1,2})$/.test(text)) {
    if (/^\d+\.\d{3,}$/.test(text)) return { error: "Use dollars and cents, like 4.00." };
    return { error: "Use numbers, like 4.00." };
  }
  const amount = Math.round(Number(text) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) return { error: "Use numbers, like 4.00." };
  if (amount > 9999.99) return { error: "That looks too big. Try again." };
  return { amount };
}

function parsePiggy(raw) {
  const text = String(raw).trim().replace(/[$,\s]/g, "");
  if (!text) return { error: "Type how much you counted." };
  if (!/^(?:\d+\.\d{0,2}|\d+|\.\d{1,2})$/.test(text)) {
    if (/^\d+\.\d{3,}$/.test(text)) return { error: "Use dollars and cents, like 12.50." };
    return { error: "Use numbers, like 12.50." };
  }
  const amount = Math.round(Number(text) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) return { error: "Use numbers, like 12.50." };
  if (amount > 9999.99) return { error: "That looks too big for a piggy bank. Try counting again." };
  return { amount };
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(n) {
  const rounded = Number(n).toFixed(2);
  const [dollars, cents] = rounded.split(".");
  const sign = dollars.startsWith("-") ? "-" : "";
  const whole = dollars.replace("-", "");
  return sign + "$" + Number(whole).toLocaleString("en-US") + "." + cents;
}

function countedOn(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const opts = { weekday: "long", month: "long", day: "numeric" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return "You counted on " + d.toLocaleDateString("en-US", opts);
}

function progressTrack(pct, cls, label) {
  if (pct == null || pct === "") return "";
  const width = Math.max(0, Math.min(100, Number(pct)));
  if (Number.isNaN(width)) return "";
  const aria = label
    ? ` role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${width}"`
    : "";
  return `<div class="progress-track"${aria}><div class="progress-fill ${cls}" style="width:${width}%"></div></div>`;
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

function shell(inner) {
  return `<div class="phone">${inner}</div>`;
}

function rowsHtml(rows) {
  return rows
    .map((r) => `<div class="row"><span class="${r.mute ? "mute" : ""}">${esc(r.text)}</span></div>`)
    .join("");
}

function piggyAmountHtml(piggy, large) {
  if (!piggy) return `<div class="amount-empty">Not counted yet</div>`;
  const cls = large ? "amount lg" : "amount";
  return `<div class="${cls}">${money(piggy.amount)}</div>`;
}

function splitPairHtml(split) {
  if (!split) return "";
  return `<div class="split-pair" data-split-pair>Spend ${money(split.spend)} · Save ${money(split.save)}</div>`;
}

function piggyIntentHtml(piggy) {
  const split = splitOf(piggy);
  if (!split) return "";
  const hint =
    split.save > 0
      ? "You chose this from your count. Your savings account number stays the same."
      : "Nothing set aside yet. Slide on your piggy if you want some to wait.";
  return `<div class="intent-block">
    <div class="intent-line">
      <span class="intent-label">To save from piggy</span>
      <span class="intent-amt">${money(split.save)}</span>
    </div>
    <p class="counted-hint">${esc(hint)}</p>
  </div>`;
}

function renderSplitCard(piggy) {
  if (!piggy) {
    return `<div class="card soft">
      <p class="blurb" style="color:#141416">Update your count, then you can choose what to use soon and what can wait.</p>
    </div>`;
  }
  const split = splitOf(piggy);
  if (split.totalCents <= 0) {
    return `<div class="card soft">
      <p class="blurb" style="color:#141416">When your count is more than zero, you can slide to let some wait.</p>
    </div>`;
  }
  const splitRatio = split.totalCents === 0 ? 1 : split.spendCents / split.totalCents;
  return `<div class="card split-card" data-split-card data-total-cents="${split.totalCents}">
    <label class="piggy-label" for="piggy-split">Use soon, or let some wait?</label>
    <p class="blurb">Drag the line. Brown is ready to use. Blue can wait. Waiting is a choice, not a punishment.</p>
    <div class="split-readout">
      <div class="split-side">
        <div class="jar-name">Spend</div>
        <div class="split-amt spend" data-split-spend>${money(split.spend)}</div>
        <div class="blurb">Ready to use</div>
      </div>
      <div class="split-side">
        <div class="jar-name">Save</div>
        <div class="split-amt save" data-split-save>${money(split.save)}</div>
        <div class="blurb">Can wait</div>
      </div>
    </div>
    <div class="split-slider" style="--split:${splitRatio}">
      <div class="split-gauge" aria-hidden="true">
        <div class="split-gauge-spend" data-gauge-spend></div>
        <div class="split-gauge-save" data-gauge-save></div>
      </div>
      <input
        id="piggy-split"
        class="split-range"
        data-split-range
        type="range"
        min="0"
        max="${split.totalCents}"
        step="1"
        value="${split.spendCents}"
        aria-valuemin="0"
        aria-valuemax="${split.totalCents}"
        aria-valuenow="${split.spendCents}"
        aria-valuetext="Spend ${money(split.spend)}, Save ${money(split.save)}"
      />
      <div class="split-knob" aria-hidden="true"></div>
    </div>
    <div class="split-ends">
      <span>Use soon</span>
      <span>Let it wait</span>
    </div>
    <p class="split-pair split-pair-live" data-split-pair>Spend ${money(split.spend)} · Save ${money(split.save)}</p>
    <p class="counted-hint split-mood" data-split-mood>${esc(splitMood(split))}</p>
    <p class="counted-hint piggy-help" data-split-total>Together this is the ${money(split.total)} you counted.</p>
  </div>`;
}

function owedSummaryHtml(split, owed) {
  if (!owed || !(owed.amount > 0)) return "";
  const ready = split && split.totalCents > 0
    ? `<div class="counted-hint">${esc(readyText(split.spendCents, owed.amount))}</div>`
    : "";
  return `<div class="owed-home">Money you owe · ${money(owed.amount)}</div>${ready}`;
}

function renderOwedCard(kid) {
  const owed = kid.owed || { amount: 0 };
  const split = splitOf(kid.piggy);
  const has = owed.amount > 0;
  const error = state.owedError
    ? `<p class="piggy-error" role="alert">${esc(state.owedError)}</p>`
    : "";
  const ready = split && split.totalCents > 0 ? readyText(split.spendCents, owed.amount) : "";
  return `<div class="card owed-card">
    <label class="piggy-label" for="owed-amount">Money you owe</label>
    <p class="blurb">When a grown-up pays for you, put it here until you pay them back.</p>
    ${
      has
        ? `<div class="amount mid" data-owed-amount>${money(owed.amount)}</div>`
        : `<div class="amount-empty" data-owed-amount>Nothing right now</div>`
    }
    ${ready ? `<p class="counted-hint owed-ready" data-owed-ready>${esc(ready)}</p>` : ""}
    <form data-owed-form novalidate>
      <p class="blurb owed-ask">How much do you owe?</p>
      <div class="money-field owed-field">
        <span aria-hidden="true">$</span>
        <input
          id="owed-amount"
          data-owed-input
          type="text"
          inputmode="decimal"
          enterkeyhint="done"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="0.00"
          value="${esc(state.owedDraft)}"
        />
      </div>
      ${error}
      <button type="submit" class="owed-save">Update what I owe</button>
    </form>
    ${has ? `<button type="button" class="owed-clear" data-owed-clear>I paid it back</button>` : ""}
  </div>`;
}

function renderHome(kid) {
  const g = kid.grow;
  const s = kid.save;
  const piggy = kid.piggy;
  const split = splitOf(piggy);
  const spendBlurb = piggy ? "Cash you counted" : kid.spend.emptyHint;
  const counted = piggy && piggy.countedAt ? countedOn(piggy.countedAt) : "";
  return shell(`
    <div class="brand">Family money</div>
    <h1>Hi ${esc(kid.name)}</h1>
    <p class="sub">Your jars — serious money, simple view</p>

    <button type="button" class="card tap" data-go="spend">
      <div class="tick spend"></div>
      <div class="jar-name">Spend</div>
      <div class="role">Piggy bank</div>
      ${piggyAmountHtml(piggy, false)}
      ${splitPairHtml(split)}
      ${owedSummaryHtml(split, kid.owed)}
      <div class="blurb">${esc(spendBlurb)}</div>
      ${counted ? `<div class="counted-hint">${esc(counted)}</div>` : ""}
      <div class="why">Why this jar? · ${esc(kid.spend.why)}</div>
    </button>

    <button type="button" class="card tap" data-go="save">
      <div class="tick save"></div>
      <div class="jar-name">Save</div>
      <div class="role">Savings account</div>
      <div class="amount">${money(s.balance)}</div>
      <div class="blurb">${esc(s.blurbHome)}</div>
      ${piggyIntentHtml(piggy)}
      <div class="why">Why this jar? · ${esc(s.why)}</div>
    </button>

    <button type="button" class="card tap" data-go="grow">
      <div class="tick grow"></div>
      <div class="jar-name">Grow</div>
      <div class="progress-label">College path</div>
      ${progressTrack(g.college.pct, "college", "College path")}
      <div class="progress-sub">~${Number(g.college.pct)}% · ${esc(g.college.path)}</div>
      <div class="jar-split">
        <div class="progress-label">Retirement path</div>
        <div class="grow-state">${esc(g.retirement.state)}</div>
        <div class="blurb">${esc(g.retirement.home)}</div>
      </div>
      <div class="jar-split">
        <div class="progress-label">Invested / Growing</div>
        <div class="amount mid">${money(g.brokerage.balance)}</div>
        <div class="blurb">${esc(g.brokerage.blurb)}</div>
      </div>
      <div class="why">Why this jar? · ${esc(g.why)}</div>
    </button>

    <div class="footer-note">
      <p>Your piggy count stays on this iPad</p>
      <p>Savings and invested amounts from September 28</p>
    </div>
  `);
}

function renderSpend(kid) {
  const piggy = kid.piggy;
  const counted = piggy && piggy.countedAt ? countedOn(piggy.countedAt) : "";
  const error = state.piggyError
    ? `<p class="piggy-error" role="alert">${esc(state.piggyError)}</p>`
    : "";
  return shell(`
    <div class="top-row">
      <button type="button" class="back" data-back="home">← Back</button>
      <div class="chip on static">${esc(kid.name)}</div>
    </div>
    <div class="tick spend"></div>
    <div class="jar-name" style="margin-top:6px">Spend</div>
    <div class="role">Piggy bank</div>
    ${piggyAmountHtml(piggy, true)}
    ${splitPairHtml(splitOf(piggy))}
    <p class="sub" style="margin-bottom:12px">${esc(piggy ? "Cash you counted" : kid.spend.emptyHint)}</p>
    ${counted ? `<p class="counted-hint counted-block">${esc(counted)}</p>` : ""}

    <div class="card piggy-card">
      <form data-piggy-form novalidate>
        <label class="piggy-label" for="piggy-amount">${esc(kid.spend.prompt)}</label>
        <p class="blurb">Count the cash, then update the total.</p>
        <div class="money-field">
          <span aria-hidden="true">$</span>
          <input
            id="piggy-amount"
            data-piggy-input
            type="text"
            inputmode="decimal"
            enterkeyhint="done"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="0.00"
            aria-describedby="piggy-help"
            value="${esc(state.piggyDraft)}"
          />
        </div>
        ${error}
        <button type="submit" class="piggy-save">Update my count</button>
        <p class="counted-hint piggy-help" id="piggy-help">Your count stays on this iPad.</p>
      </form>
    </div>

    ${renderSplitCard(piggy)}

    ${renderOwedCard(kid)}

    <div class="card tip">
      <p class="tip-line">Tip · <span>${esc(kid.spend.tip)}</span></p>
    </div>

    <div class="card soft">
      <p class="blurb" style="color:#141416;margin-bottom:6px">${esc(kid.spend.whyBody[0])}</p>
      <p class="blurb">${esc(kid.spend.whyBody[1])}</p>
    </div>
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
    <div class="role">Savings account</div>
    <div class="amount lg">${money(s.balance)}</div>
    <p class="sub" style="margin-bottom:12px">${esc(s.blurbDetail)}</p>
    ${piggyIntentHtml(kid.piggy)}

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
        : monthPanel(s)
    }
  `);
}

function renderGrow(kid) {
  const g = kid.grow;
  const whyOn = state.panel === "why";
  const why = Array.isArray(g.whyBody) ? g.whyBody : [];
  return shell(`
    <button type="button" class="back" data-back="home">← Back</button>
    <div class="tick grow"></div>
    <div class="jar-name" style="margin-top:6px">Grow</div>
    <h1 style="font-size:32px;margin-bottom:8px">On track</h1>
    <p class="sub">College and retirement grow for years. You look — grown-ups help.</p>

    <div class="card tip">
      <p class="tip-line">Tip · <span>${esc(g.tip)}</span></p>
    </div>

    <div class="chips" style="margin-bottom:8px">
      <button type="button" class="chip soft ${whyOn ? "on" : ""}" data-panel="why">Why this jar?</button>
    </div>

    ${
      whyOn
        ? `<div class="card soft" style="margin-bottom:14px">
            <p class="blurb" style="color:#141416;margin-bottom:6px">${esc(why[0] || "")}</p>
            <p class="blurb">${esc(why[1] || "")}</p>
          </div>`
        : ""
    }

    <div class="section-label">Inside this jar</div>

    <div class="card">
      <div class="progress-label">College path</div>
      <div class="progress-sub">${esc(g.college.sub)}</div>
      ${progressTrack(g.college.pct, "college", "College path")}
      <div class="milestone-row">${ringsHtml(g.college.rings)}</div>
      <div class="progress-sub">~${Number(g.college.pct)}% · ${esc(g.college.path)}</div>
      <p class="blurb" style="margin-top:8px">You see how far the path has come. Grown-ups help with this long grow.</p>
    </div>

    <div class="card">
      <div class="progress-label">${esc(g.retirement.label)}</div>
      <div class="progress-sub">${esc(g.retirement.sub)}</div>
      <div class="grow-state">${esc(g.retirement.state)}</div>
      <p class="blurb" style="margin-top:8px">${esc(g.retirement.blurb)}</p>
    </div>

    <div class="card">
      <div class="progress-label">Invested / Growing</div>
      <div class="amount mid">${money(g.brokerage.balance)}</div>
      <div class="blurb">${esc(g.brokerage.blurb)}</div>
    </div>
  `);
}

function monthPanel(jar) {
  const rows = Array.isArray(jar.month) ? jar.month : [];
  const story = jar.monthStory;
  const list = rows.length
    ? `<div class="card">${rowsHtml(rows)}</div>`
    : `<div class="card soft">
         <p class="blurb" style="color:#141416;margin-bottom:6px">A grown-up keeps what moved this month.</p>
         <p class="blurb">You can look at your balance. Ask before anything changes.</p>
       </div>`;
  const more = story
    ? `<button type="button" class="chip soft" data-go-month="${esc(jar.monthKey || "")}" style="width:100%;margin-top:4px">Open full month story</button>`
    : "";
  return `<div class="section-label">This month</div>${list}${more}`;
}

function renderMonth(kid) {
  const from = state.monthFrom === "spend" ? "spend" : "save";
  const jar = from === "spend" ? kid.spend : kid.save;
  const story = jar.monthStory;
  const jarLabel = from === "spend" ? "Spend" : "Save";
  const monthName = new Date().toLocaleString("en-US", { month: "long" });
  if (!story) {
    return shell(`
      <button type="button" class="back" data-back="${from}">← ${jarLabel} jar</button>
      <h1>This month</h1>
      <p class="sub">${esc(kid.name)} · ${esc(monthName)}</p>
      <div class="card soft">
        <p class="blurb" style="color:#141416">A grown-up keeps what moved this month.</p>
      </div>
    `);
  }
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
  kid.piggy = readPiggy(kid);
  kid.owed = readOwed(kid);
  const root = $("#app");
  if (state.screen === "home") root.innerHTML = renderHome(kid);
  else if (state.screen === "spend") root.innerHTML = renderSpend(kid);
  else if (state.screen === "save") root.innerHTML = renderSave(kid);
  else if (state.screen === "grow") root.innerHTML = renderGrow(kid);
  else if (state.screen === "month") root.innerHTML = renderMonth(kid);
  else root.innerHTML = renderHome(kid);
  bind(kid);
}

function openScreen(kid, screen) {
  if (screen === "spend" && state.screen !== "spend") {
    const saved = readPiggy(kid);
    const owed = readOwed(kid);
    state.piggyDraft = saved ? saved.amount.toFixed(2) : "";
    state.piggyError = "";
    state.owedDraft = owed.amount > 0 ? owed.amount.toFixed(2) : "";
    state.owedError = "";
  }
  state.screen = screen;
  state.panel = "why";
  render(kid);
}

function bind(kid) {
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      openScreen(kid, el.getAttribute("data-go"));
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

  const form = document.querySelector("[data-piggy-form]");
  if (!form) return;
  const input = form.querySelector("[data-piggy-input]");
  input.addEventListener("input", () => {
    state.piggyDraft = input.value;
    if (!state.piggyError) return;
    state.piggyError = "";
    const alert = form.querySelector("[role='alert']");
    if (alert) alert.remove();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.piggyDraft = input.value;
    const parsed = parsePiggy(input.value);
    if (parsed.error) {
      state.piggyError = parsed.error;
      render(kid);
      const again = document.querySelector("[data-piggy-input]");
      if (again) again.focus();
      return;
    }
    const saved = writePiggy(kid, parsed.amount);
    if (!saved) {
      state.piggyError = "Couldn’t save that count on this iPad. Try again.";
      render(kid);
      return;
    }
    state.piggyDraft = saved.amount.toFixed(2);
    state.piggyError = "";
    render(kid);
    const splitCard = document.querySelector("[data-split-card]");
    if (splitCard) splitCard.scrollIntoView({ block: "nearest" });
  });

  const card = document.querySelector("[data-split-card]");
  if (card) {
  const range = card.querySelector("[data-split-range]");
  const totalCents = Number(card.getAttribute("data-total-cents"));
  const paintSplit = (spendCents, persist) => {
    const saveCents = totalCents - spendCents;
    const spend = fromCents(spendCents);
    const save = fromCents(saveCents);
    const total = fromCents(totalCents);
    const pair = "Spend " + money(spend) + " · Save " + money(save);
    document.querySelectorAll("[data-split-spend]").forEach((el) => {
      el.textContent = money(spend);
    });
    document.querySelectorAll("[data-split-save]").forEach((el) => {
      el.textContent = money(save);
    });
    document.querySelectorAll("[data-split-pair]").forEach((el) => {
      el.textContent = pair;
    });
    const mood = card.querySelector("[data-split-mood]");
    if (mood) mood.textContent = splitMood({ totalCents, saveCents, spendCents });
    const ratio = totalCents === 0 ? 1 : spendCents / totalCents;
    const slider = card.querySelector(".split-slider");
    if (slider) slider.style.setProperty("--split", String(ratio));
    const readyEl = document.querySelector("[data-owed-ready]");
    if (readyEl) readyEl.textContent = readyText(spendCents, kid.owed ? kid.owed.amount : 0);
    range.setAttribute("aria-valuenow", String(spendCents));
    range.setAttribute("aria-valuetext", "Spend " + money(spend) + ", Save " + money(save));
    if (!persist) return;
    const stored = writeSplit(kid, save);
    if (stored) kid.piggy = stored;
  };
  range.addEventListener("input", () => {
    paintSplit(Number(range.value), true);
  });
  paintSplit(Number(range.value), false);
  }

  const owedForm = document.querySelector("[data-owed-form]");
  if (owedForm) {
    const owedInput = owedForm.querySelector("[data-owed-input]");
    owedInput.addEventListener("input", () => {
      state.owedDraft = owedInput.value;
      if (!state.owedError) return;
      state.owedError = "";
      const alert = owedForm.querySelector("[role='alert']");
      if (alert) alert.remove();
    });
    owedForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.owedDraft = owedInput.value;
      const parsed = parseOwed(owedInput.value);
      if (parsed.error) {
        state.owedError = parsed.error;
        render(kid);
        const again = document.querySelector("[data-owed-input]");
        if (again) again.focus();
        return;
      }
      const stored = writeOwed(kid, parsed.amount);
      if (!stored) {
        state.owedError = "Couldn’t save that on this iPad. Try again.";
        render(kid);
        return;
      }
      kid.owed = stored;
      state.owedDraft = stored.amount > 0 ? stored.amount.toFixed(2) : "";
      state.owedError = "";
      render(kid);
      const owedCard = document.querySelector(".owed-card");
      if (owedCard) owedCard.scrollIntoView({ block: "nearest" });
    });
  }
  const clearOwed = document.querySelector("[data-owed-clear]");
  if (clearOwed) {
    clearOwed.addEventListener("click", () => {
      const stored = writeOwed(kid, 0);
      if (!stored) return;
      kid.owed = stored;
      state.owedDraft = "";
      state.owedError = "";
      render(kid);
    });
  }
}

const kid = readKid();
const root = $("#app");
if (!kid || !root) {
  if (root) root.textContent = "These jars could not be opened.";
} else {
  render(kid);
}
