/* One child per page. Account balances come only from #kid-data.
   Piggy counts, the spend/save split, and money owed are saved on this device, one key per child.
   Lesson progress, grown-up notes, and the Save “waiting for” line use family-money-learn:<child>.
   The parent corner code for this iPad uses family-money-parent. It is not a bank login.
   The split and anything owed do not change the savings-account balance. */

const state = {
  screen: "home",
  monthFrom: null,
  panel: "why",
  piggyDraft: "",
  piggyError: "",
  owedDraft: "",
  owedError: "",
  learnReview: "",
  justDoneId: "",
  sortIndex: 0,
  sortNote: "",
  noticed: {},
  askOpen: false,
  askDraft: "",
  askFlash: "",
  waitDraft: "",
  waitFlash: "",
  keepScroll: false,
  scrollTop: false,
  parentStep: "",
  parentEntry: "",
  parentFirst: "",
  parentError: "",
  parentNote: "",
  parentNoteFlash: "",
  monthPick: "",
  pathPick: "",
  privacyOn: false,
};

const LESSONS = [
  {
    id: "l1",
    title: "Three jars",
    sub: "Spend, Save, and Grow",
    home: "Spend uses soon. Save waits. Grow works for a long time.",
    example: "Ice cream, a bike, and school later",
    body: [
      "Your money has three jobs.",
      "Spend can be ice cream after soccer. Save can be waiting for a bike. Grow can be money growing while you’re still in school.",
    ],
    activity: "sort",
  },
  {
    id: "l2",
    title: "Your dashboard",
    sub: "Find your name and each jar",
    home: "Find your name, then each jar’s job.",
    example: "Your name, then ice cream, a bike, and school later",
    body: [
      "This page is yours, {name}. Your name is at the top.",
      "Spend shows cash you counted — picture ice cream after soccer. Save shows the number that waits — picture a bike. Grow shows a college path and a retirement path, not dollar totals for those.",
    ],
    activity: "notice",
  },
  {
    id: "l3",
    title: "This month",
    sub: "Notice what changed, or what didn’t",
    home: "Notice what came in, or what stayed the same.",
    example: "A birthday gift, or a quiet week",
    body: [
      "Sometimes money comes in — a birthday gift, or money for helping at home. Sometimes it is a quiet week and the number stays the same.",
      "Noticing is the win. A bigger number is not better, and staying the same still counts.",
    ],
    activity: "month",
  },
  {
    id: "l4",
    title: "Save vs Spend",
    sub: "Ready now, or wait",
    home: "Use the piggy slider: ready now, or wait.",
    example: "Ice cream now, or part of a bike",
    body: [
      "Your piggy is cash at home. Some can be ready now, like ice cream after soccer. Some can wait, like part of a bike.",
      "Waiting is a choice, not a punishment. The slider does not change your savings account.",
    ],
    activity: "slider",
  },
  {
    id: "l5",
    title: "Grow for later",
    sub: "College path and retirement path",
    home: "Point to the college path and the retirement path.",
    example: "School later. A job someday.",
    body: [
      "College path is money growing while you’re still in school. Filling it is not only your job — grown-ups help.",
      "Retirement path is money that waits until you’re a grown-up with a job. You see the path, not a dollar total.",
    ],
    activity: "paths",
  },
  {
    id: "l6",
    title: "Your jars stay yours",
    sub: "Not a contest",
    home: "We don’t compare jars as a contest.",
    example: "No contest about ice-cream money",
    body: [
      "We don’t line up ice-cream money, or bike money, to see who has more — not with friends, and not at home.",
      "This page is only yours. Knowing what each jar is for matters. A contest does not.",
    ],
    activity: "privacy",
  },
];

const SORTS = [
  {
    prompt: "Ice cream after soccer",
    detail: "A pretend dollar you might use soon.",
    answer: "spend",
    yes: "Spend is for soon.",
  },
  {
    prompt: "Waiting for a bike",
    detail: "A pretend dollar that waits on purpose.",
    answer: "save",
    yes: "Save’s job is to wait.",
  },
  {
    prompt: "Growing while you’re in school",
    detail: "A pretend dollar for a long time. Grown-ups help.",
    answer: "grow",
    yes: "Grow is the long job.",
  },
];

const NOTICES = [
  { id: "name", label: "My name is on this page" },
  { id: "spend", label: "Spend — like ice cream after soccer" },
  { id: "save", label: "Save — like waiting for a bike" },
  { id: "grow", label: "Grow — school later, and a job someday" },
];

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
  return `<div class="phone" data-screen="${esc(state.screen)}">${inner}</div>`;
}

function learnKey(kid) {
  return "family-money-learn:" + profileId(kid);
}

function emptyLearn() {
  return { done: [], notes: {}, waitingFor: "" };
}

function readLearn(kid) {
  const blank = emptyLearn();
  try {
    const raw = localStorage.getItem(learnKey(kid));
    if (!raw) return blank;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return blank;
    const incoming = Array.isArray(data.done) ? data.done.map((id) => String(id)) : [];
    const done = [];
    for (const lesson of LESSONS) {
      if (incoming.includes(lesson.id)) done.push(lesson.id);
      else break;
    }
    const notes = {};
    if (data.notes && typeof data.notes === "object") {
      for (const lesson of LESSONS) {
        const text = data.notes[lesson.id];
        if (typeof text !== "string") continue;
        const clean = text.trim().slice(0, 120);
        if (clean) notes[lesson.id] = clean;
      }
    }
    let waitingFor = "";
    if (typeof data.waitingFor === "string") waitingFor = data.waitingFor.trim().slice(0, 60);
    return { done, notes, waitingFor };
  } catch (err) {
    return blank;
  }
}

function writeLearn(kid, progress) {
  const clean = {
    done: progress.done,
    notes: progress.notes || {},
    waitingFor: progress.waitingFor || "",
  };
  try {
    localStorage.setItem(learnKey(kid), JSON.stringify(clean));
    return clean;
  } catch (err) {
    return null;
  }
}

function currentLesson(progress) {
  return LESSONS.find((lesson) => !progress.done.includes(lesson.id)) || null;
}

function lessonById(id) {
  return LESSONS.find((lesson) => lesson.id === id) || null;
}

function viewLesson(progress) {
  const current = currentLesson(progress);
  if (state.learnReview) {
    const found = lessonById(state.learnReview);
    if (found && progress.done.includes(found.id)) {
      return { lesson: found, reviewing: true, current };
    }
  }
  if (!current) return { lesson: LESSONS[0], reviewing: true, current: null };
  return { lesson: current, reviewing: false, current };
}

function fillName(text, kid) {
  return String(text).replaceAll("{name}", kid.name);
}

function focusLesson(kid, reviewId) {
  state.justDoneId = "";
  state.learnReview = reviewId || "";
  state.sortIndex = 0;
  state.sortNote = "";
  state.noticed = {};
  state.monthPick = "";
  state.pathPick = "";
  state.privacyOn = false;
  state.askOpen = false;
  state.askFlash = "";
  const progress = readLearn(kid);
  const view = viewLesson(progress);
  const id = view.lesson ? view.lesson.id : "";
  state.askDraft = id && progress.notes[id] ? progress.notes[id] : "";
}

function jarWord(id) {
  if (id === "spend") return "Spend";
  if (id === "save") return "Save";
  return "Grow";
}

function mark(kind) {
  const paths = {
    spend: '<circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.6 12h6.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    save: '<rect x="7" y="5" width="10" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 9h5M9.5 12.2h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    college: '<path d="M4 16.5c2.4-3.2 4.6-4.8 8-4.8s5.6 1.6 8 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.2" r="2" fill="currentColor"/>',
    retire: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.2V12l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    notice: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
    yours: '<circle cx="12" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.6 18.2c.8-2.5 2.7-3.8 5.4-3.8s4.6 1.3 5.4 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  };
  const icon = paths[kind] || paths.notice;
  return `<span class="mark ${esc(kind)}" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22">${icon}</svg></span>`;
}

function sceneHtml(kind, title, line) {
  return `<div class="scene">${mark(kind)}<div><div class="scene-title">${esc(title)}</div>${line ? `<div class="blurb">${esc(line)}</div>` : ""}</div></div>`;
}

function sceneButton(kind, title, line, attrs, on) {
  return `<button type="button" class="scene-btn${on ? " on" : ""}" ${attrs} aria-pressed="${on ? "true" : "false"}">${mark(kind)}<span><span class="scene-title">${esc(title)}</span>${line ? `<span class="blurb">${esc(line)}</span>` : ""}</span></button>`;
}

function lessonMark(id) {
  if (id === "l1" || id === "l4") return "spend";
  if (id === "l5") return "college";
  if (id === "l6") return "yours";
  return "notice";
}

function learnExamples(lesson) {
  if (!lesson) return "";
  if (lesson.id === "l1") {
    return [
      sceneHtml("spend", "Ice cream after soccer", "Use soon"),
      sceneHtml("save", "Waiting for a bike", "Wait"),
      sceneHtml("college", "While you’re in school", "Grow for a long time"),
    ].join("");
  }
  return sceneHtml(lessonMark(lesson.id), lesson.example, "");
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
      <div class="activity-kicker">Activity · Ready now or wait</div>
      <p class="blurb" style="color:#141416">Update your count, then slide. Brown can be ice cream after soccer. Blue can wait for a bike.</p>
    </div>`;
  }
  const split = splitOf(piggy);
  if (split.totalCents <= 0) {
    return `<div class="card soft">
      <div class="activity-kicker">Activity · Ready now or wait</div>
      <p class="blurb" style="color:#141416">When your count is more than zero, slide some for later — like part of a bike.</p>
    </div>`;
  }
  const splitRatio = split.totalCents === 0 ? 1 : split.spendCents / split.totalCents;
  return `<div class="card split-card" data-split-card data-total-cents="${split.totalCents}" data-activity="l4">
    <div class="activity-kicker">Activity · Ready now or wait</div>
    <label class="piggy-label" for="piggy-split">Use soon, or let some wait?</label>
    <p class="blurb">This is the Save vs Spend practice. Brown can be ice cream after soccer. Blue can wait for a bike. Waiting is a choice, not a punishment.</p>
    <div class="split-readout">
      <div class="split-side">
        <div class="jar-name">Spend</div>
        <div class="split-amt spend" data-split-spend>${money(split.spend)}</div>
        <div class="blurb">Ready to use</div>
        <div class="example-tag">Ice cream after soccer</div>
      </div>
      <div class="split-side">
        <div class="jar-name">Save</div>
        <div class="split-amt save" data-split-save>${money(split.save)}</div>
        <div class="blurb">Can wait</div>
        <div class="example-tag">Waiting for a bike</div>
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
    <p class="jobs-line">Your money has jobs.</p>
    ${learnHomeCard(kid)}

    <button type="button" class="card tap" data-go="spend">
      <div class="tick spend"></div>
      <div class="jar-name">Spend</div>
      <div class="role">Piggy bank</div>
      ${piggyAmountHtml(piggy, false)}
      ${splitPairHtml(split)}
      ${owedSummaryHtml(split, kid.owed)}
      <div class="blurb">${esc(spendBlurb)}</div>
      ${counted ? `<div class="counted-hint">${esc(counted)}</div>` : ""}
      ${sceneHtml("spend", "Ice cream after soccer", "An example of soon")}
      <div class="why">Why this jar? · ${esc(kid.spend.why)}</div>
    </button>

    <button type="button" class="card tap" data-go="save">
      <div class="tick save"></div>
      <div class="jar-name">Save</div>
      <div class="role">Savings account</div>
      <div class="amount">${money(s.balance)}</div>
      <div class="blurb">${esc(s.blurbHome)}</div>
      ${piggyIntentHtml(piggy)}
      ${sceneHtml("save", "Waiting for a bike", "An example of waiting")}
      <div class="why">Why this jar? · ${esc(s.why)}</div>
    </button>

    <button type="button" class="card tap" data-go="grow">
      <div class="tick grow"></div>
      <div class="jar-name">Grow</div>
      <div class="progress-label">College path</div>
      ${progressTrack(g.college.pct, "college", "College path")}
      <div class="progress-sub">~${Number(g.college.pct)}% · ${esc(g.college.path)}</div>
      ${sceneHtml("college", "While you’re in school", "Money growing while you’re still in school")}
      <div class="jar-split">
        <div class="progress-label">Retirement path</div>
        <div class="grow-state">${esc(g.retirement.state)}</div>
        <div class="blurb">${esc(g.retirement.home)}</div>
        ${sceneHtml("retire", "A job someday", "Money that waits until you’re a grown-up with a job")}
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
      <button type="button" class="parent-entry" data-go="parent">Parent</button>
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
        <div class="activity-kicker">Activity · Count your piggy</div>
        <label class="piggy-label" for="piggy-amount">${esc(kid.spend.prompt)}</label>
        <p class="blurb">This is part of Save vs Spend. Count the cash you can use soon — picture ice cream after soccer — then update the total.</p>
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

    ${renderWaitingCard(kid)}

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

    <div class="card" data-activity="l5">
      <div class="activity-kicker">Activity · Two paths</div>
      <p class="blurb" style="color:#141416;margin-bottom:8px">Tap a path and say the line. No dollar totals on either one.</p>
      ${sceneButton("college", "College path", "Money growing while you’re still in school.", 'data-path-example="college"', state.pathPick === "college")}
      ${sceneButton("retire", "Retirement path", "Money that waits until you’re a grown-up with a job.", 'data-path-example="retire"', state.pathPick === "retire")}
      ${state.pathPick ? `<p class="sort-note ok">That’s the one. Grown-ups help.</p>` : ""}
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
      <p class="blurb" style="margin-top:8px">Money growing while you’re still in school. Grown-ups help — it is not only your job.</p>
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
         <p class="blurb" style="color:#141416;margin-bottom:6px">A birthday gift came in — or it was a quiet week and this number stayed the same.</p>
         <p class="blurb">Noticing counts. The size does not. A grown-up keeps what moved.</p>
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
        <p class="blurb" style="color:#141416">Did anything come in, or did it stay the same? Noticing counts. The size does not.</p>
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

function learnHomeCard(kid) {
  const progress = readLearn(kid);
  const total = LESSONS.length;
  const doneCount = progress.done.length;
  const current = currentLesson(progress);
  const title = current ? current.title : "You can say what each jar is for";
  const blurb = current
    ? current.home
    : "Six ideas, noticed one at a time. You can look again whenever you want.";
  const cta = current ? "Open this lesson" : "Look again";
  const width = Math.round((doneCount / total) * 100);
  return `<div class="card learn-card" data-learn-progress="${doneCount}">
    <div class="learn-kicker">Learn · ${doneCount} of ${total}</div>
    <div class="role">${esc(title)}</div>
    <p class="blurb">${esc(blurb)}</p>
    ${learnExamples(current)}
    <div class="progress-track" role="progressbar" aria-label="Lessons noticed" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${doneCount}"><div class="progress-fill" style="width:${width}%"></div></div>
    <button type="button" class="learn-done secondary" data-go="learn">${esc(cta)}</button>
  </div>`;
}

function renderWaitingCard(kid) {
  const flashClass = state.waitFlash.indexOf("Remembered") === 0 ? "sort-note ok" : "sort-note";
  const flash = state.waitFlash ? `<p class="${flashClass}">${esc(state.waitFlash)}</p>` : "";
  return `<div class="card" data-activity="save-wait">
    <form data-wait-form novalidate>
      <div class="activity-kicker">Activity</div>
      <label class="piggy-label" for="waiting-for">Name one thing you’re waiting for</label>
      ${sceneHtml("save", "Waiting for a bike", "One example. Yours can be different.")}
      <p class="blurb">A goal, a gift, something later. Waiting is the job of this jar.</p>
      <input
        id="waiting-for"
        class="line-input"
        data-wait-input
        type="text"
        maxlength="60"
        autocomplete="off"
        enterkeyhint="done"
        placeholder="Waiting for a bike"
        value="${esc(state.waitDraft)}"
      />
      ${flash}
      <button type="submit" class="learn-done">Remember it</button>
      <p class="counted-hint piggy-help">Saved on this iPad only. It does not change your savings number.</p>
    </form>
  </div>`;
}

function sortActivityHtml() {
  const doneRows = SORTS.slice(0, state.sortIndex)
    .map(
      (item) =>
        `<div class="sort-row">${mark(item.answer)}<span class="sort-jar ${item.answer}">${jarWord(item.answer)}</span><span class="sort-copy">${esc(item.prompt)}<span class="sort-yes">${esc(item.yes)}</span></span></div>`
    )
    .join("");
  const current = SORTS[state.sortIndex];
  if (!current) {
    return `<div class="card" data-activity="l1">
      <div class="activity-kicker">See it · three pretend dollars</div>
      ${doneRows}
      <p class="sort-note ok">You can tell the three jobs apart.</p>
    </div>`;
  }
  const note = state.sortNote ? `<p class="sort-note">${esc(state.sortNote)}</p>` : "";
  return `<div class="card" data-activity="l1">
    <div class="activity-kicker">See it · three pretend dollars</div>
    ${doneRows}
    <p class="blurb" style="color:#141416;margin:8px 0 4px">Which jar gets this pretend dollar?</p>
    <p class="pretend">Pretend $1</p>
    <p class="role">${esc(current.prompt)}</p>
    <p class="blurb">${esc(current.detail)}</p>
    <div class="chips" role="group" aria-label="Which jar">
      <button type="button" class="chip" data-sort="spend">Spend</button>
      <button type="button" class="chip" data-sort="save">Save</button>
      <button type="button" class="chip" data-sort="grow">Grow</button>
    </div>
    ${note}
  </div>`;
}

function noticeActivityHtml() {
  const buttons = NOTICES.map((item) => {
    const on = state.noticed[item.id] ? " on" : "";
    const pressed = state.noticed[item.id] ? "true" : "false";
    return `<button type="button" class="chip block${on}" data-notice="${item.id}" aria-pressed="${pressed}">${esc(item.label)}</button>`;
  }).join("");
  return `<div class="card" data-activity="l2">
    <div class="activity-kicker">Activity · Find these</div>
    <p class="blurb" style="color:#141416;margin-bottom:10px">Tap each one when you can point to it on your home screen.</p>
    <div class="notice-list">${buttons}</div>
  </div>`;
}

function linkActivity(kicker, body, label, screen, panel) {
  const panelAttr = panel ? ` data-open-panel="${esc(panel)}"` : "";
  return `<div class="card">
    <div class="activity-kicker">${esc(kicker)}</div>
    <p class="blurb" style="color:#141416;margin-bottom:12px">${esc(body)}</p>
    <button type="button" class="learn-done secondary" data-go="${esc(screen)}"${panelAttr}>${esc(label)}</button>
  </div>`;
}

function activityHtml(lesson) {
  if (lesson.activity === "sort") return sortActivityHtml();
  if (lesson.activity === "notice") return noticeActivityHtml();
  if (lesson.activity === "month") {
    const picked = state.monthPick;
    return `<div class="card" data-activity="l3">
      <div class="activity-kicker">See it · notice one thing</div>
      <p class="blurb" style="color:#141416;margin-bottom:8px">Tap the one you noticed. Either one counts.</p>
      ${sceneButton("notice", "A birthday gift came in", "Something arrived. The size is not the point.", 'data-month-example="in"', picked === "in")}
      ${sceneButton("notice", "A quiet week", "The number stayed the same.", 'data-month-example="same"', picked === "same")}
      ${picked ? `<p class="sort-note ok">You noticed. That is enough.</p>` : ""}
      <button type="button" class="learn-done secondary" data-go="save" data-open-panel="month">Open This month</button>
    </div>`;
  }
  if (lesson.activity === "slider") {
    return `<div class="card" data-activity="l4">
      <div class="activity-kicker">See it · ready now or wait</div>
      ${sceneHtml("spend", "Ice cream after soccer", "The brown side. Ready now.")}
      ${sceneHtml("save", "Waiting for a bike", "The blue side. Can wait.")}
      <button type="button" class="learn-done secondary" data-go="spend">Open the slider</button>
    </div>`;
  }
  if (lesson.activity === "paths") {
    return `<div class="card" data-activity="l5">
      <div class="activity-kicker">See it · two paths</div>
      <p class="blurb" style="color:#141416;margin-bottom:8px">Tap a path and say the line.</p>
      ${sceneButton("college", "College path", "Money growing while you’re still in school.", 'data-path-example="college"', state.pathPick === "college")}
      ${sceneButton("retire", "Retirement path", "Money that waits until you’re a grown-up with a job.", 'data-path-example="retire"', state.pathPick === "retire")}
      ${state.pathPick ? `<p class="sort-note ok">That’s the one. Grown-ups help. No dollar total on that path.</p>` : ""}
      <button type="button" class="learn-done secondary" data-go="grow">Open Grow</button>
    </div>`;
  }
  return `<div class="card" data-activity="l6">
    <div class="activity-kicker">See it · say it once</div>
    ${sceneButton("yours", "My jars are mine.", "We don’t ask who has more ice-cream money.", "data-privacy", state.privacyOn)}
    ${state.privacyOn ? `<p class="sort-note ok">That’s our rule.</p>` : ""}
  </div>`;
}

function askBlockHtml(progress, lesson) {
  const note = progress.notes[lesson.id] || "";
  const askOk = state.askFlash.indexOf("Saved") === 0;
  const flash = state.askFlash
    ? `<p class="sort-note${askOk ? " ok" : ""}">${esc(state.askFlash)}</p>`
    : "";
  const saved = !state.askOpen && note
    ? `<div class="card soft">
        <div class="activity-kicker">Note for a grown-up</div>
        <p class="blurb" style="color:#141416">${esc(note)}</p>
      </div>`
    : "";
  const form = state.askOpen
    ? `<div class="card">
        <form data-ask-form novalidate>
          <label class="blurb" for="ask-note" style="color:#141416">A note to talk about later</label>
          <input id="ask-note" class="line-input" data-ask-input type="text" maxlength="120" autocomplete="off" enterkeyhint="done" value="${esc(state.askDraft)}" />
          <button type="submit" class="learn-done secondary">Save note</button>
          ${note ? `<button type="button" class="text-btn" data-ask-clear>Clear note</button>` : ""}
          <p class="counted-hint">Optional. It stays on this iPad for a grown-up to read.</p>
        </form>
      </div>`
    : "";
  return `<div class="chips">
      <button type="button" class="chip soft ${state.askOpen ? "on" : ""}" data-ask-toggle>Ask a grown-up</button>
    </div>
    ${flash}
    ${form}
    ${saved}`;
}

function renderJustDone(kid, progress) {
  const lesson = lessonById(state.justDoneId) || LESSONS[0];
  const next = currentLesson(progress);
  const total = LESSONS.length;
  return shell(`
    <div class="top-row">
      <button type="button" class="back" data-back="home">← Back</button>
      <div class="chip on static">${esc(kid.name)}</div>
    </div>
    <div class="learn-kicker">Noticed</div>
    <h1>${esc(lesson.title)}</h1>
    <p class="sub">${progress.done.length} of ${total} lessons</p>
    <div class="card soft">
      <p class="blurb" style="color:#141416">You noticed this idea. That is enough for now.</p>
    </div>
    ${next ? `<button type="button" class="learn-done" data-learn-continue>Continue</button>` : ""}
    <button type="button" class="learn-done ${next ? "secondary" : ""}" data-back="home">Back home</button>
  `);
}

function renderLearn(kid) {
  const progress = readLearn(kid);
  if (state.justDoneId) return renderJustDone(kid, progress);
  const view = viewLesson(progress);
  const lesson = view.lesson;
  const index = LESSONS.findIndex((item) => item.id === lesson.id);
  const total = LESSONS.length;
  const doneCount = progress.done.length;
  const width = Math.round((doneCount / total) * 100);
  const lines = lesson.body.map((line, i) => {
    const style = i === 0 ? ' style="color:#141416;margin-bottom:8px"' : "";
    return `<p class="blurb"${style}>${esc(fillName(line, kid))}</p>`;
  }).join("");
  const prev = index > 0 && progress.done.includes(LESSONS[index - 1].id) && !view.reviewing
    ? LESSONS[index - 1].id
    : "";
  const nextDone = view.reviewing ? LESSONS[(index + 1) % total].id : "";
  let action = `<button type="button" class="learn-done" data-got-it>I got it</button>`;
  if (view.reviewing && view.current) {
    action = `<button type="button" class="learn-done" data-review-current>Back to the current lesson</button>`;
  } else if (view.reviewing) {
    action = `<button type="button" class="learn-done" data-review="${esc(nextDone)}">Next idea</button>`;
  }
  const previous = prev
    ? `<button type="button" class="text-btn" data-review="${esc(prev)}">Look at the previous idea</button>`
    : "";
  const kicker = view.reviewing ? "Looking again" : "Learn";
  return shell(`
    <div class="top-row">
      <button type="button" class="back" data-back="home">← Back</button>
      <div class="chip on static">${esc(kid.name)}</div>
    </div>
    <div class="learn-kicker">${esc(kicker)}</div>
    <h1>${esc(lesson.title)}</h1>
    <p class="sub">${esc(lesson.sub)}</p>
    <div class="progress-track" role="progressbar" aria-label="Lessons noticed" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${doneCount}"><div class="progress-fill" style="width:${width}%"></div></div>
    <p class="progress-sub">Noticed ${doneCount} of ${total}</p>
    <div class="card" data-lesson="${esc(lesson.id)}">${lines}</div>
    ${activityHtml(lesson)}
    ${askBlockHtml(progress, lesson)}
    ${action}
    ${previous}
  `);
}

function parentKey() {
  return "family-money-parent";
}

function readParentCode() {
  try {
    const raw = localStorage.getItem(parentKey());
    if (!raw) return "";
    const data = JSON.parse(raw);
    if (data && typeof data.code === "string" && /^\d{4}$/.test(data.code)) return data.code;
  } catch (err) {
    return "";
  }
  return "";
}

function writeParentCode(code) {
  try {
    localStorage.setItem(parentKey(), JSON.stringify({ code: code }));
    return true;
  } catch (err) {
    return false;
  }
}

function focusParent() {
  const input = document.querySelector("[data-parent-input]");
  if (input) input.focus();
}

function renderParentGate(kid) {
  const setting = state.parentStep === "set" || state.parentStep === "confirm";
  const prompt = state.parentStep === "confirm"
    ? "Enter that code again."
    : state.parentStep === "set"
      ? "Choose a 4-digit code for this iPad."
      : "Enter the code for this iPad.";
  const error = state.parentError ? `<p class="sort-note" role="alert">${esc(state.parentError)}</p>` : "";
  return shell(`
    <button type="button" class="back" data-back="home">← Back</button>
    <div class="learn-kicker">Parent</div>
    <h1>${esc(kid.name)}</h1>
    <p class="sub">For a grown-up. This opens lesson progress only.</p>
    <div class="card" data-parent-step="${esc(state.parentStep)}">
      <form data-parent-form novalidate>
        <label class="piggy-label" for="parent-code">${esc(prompt)}</label>
        <p class="blurb">${setting ? "You will use this code the next time you open Parent on this iPad." : "Lesson progress stays on this iPad."}</p>
        <input
          id="parent-code"
          class="line-input parent-code"
          data-parent-input
          type="text"
          inputmode="numeric"
          enterkeyhint="done"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          maxlength="4"
          placeholder="4 numbers"
          aria-label="4-digit code"
          value="${esc(state.parentEntry)}"
        />
        ${error}
        <button type="submit" class="learn-done">${state.parentStep === "enter" ? "Open" : "Continue"}</button>
      </form>
    </div>
  `);
}

function renderParentOpen(kid) {
  const progress = readLearn(kid);
  const current = currentLesson(progress);
  const total = LESSONS.length;
  const doneCount = progress.done.length;
  const width = Math.round((doneCount / total) * 100);
  const rows = LESSONS.map((lesson) => {
    const done = progress.done.includes(lesson.id);
    const isCurrent = current && current.id === lesson.id;
    const note = progress.notes[lesson.id];
    const status = done ? "Noticed" : isCurrent ? "Next" : "Later";
    return `<div class="parent-lesson">
      <div>
        <div class="role">${esc(lesson.title)}</div>
        <p class="blurb">${esc(lesson.sub)}</p>
        ${note ? `<p class="blurb" style="color:#141416">Note · ${esc(note)}</p>` : ""}
      </div>
      <div class="progress-sub">${status}</div>
    </div>`;
  }).join("");
  const noteOk = state.parentNoteFlash.indexOf("Marked") === 0 || state.parentNoteFlash.indexOf("Note saved") === 0;
  const flash = state.parentNoteFlash
    ? `<p class="sort-note${noteOk ? " ok" : ""}">${esc(state.parentNoteFlash)}</p>`
    : "";
  const noteFor = current ? current.title : "";
  const noteBlock = current
    ? `<form data-parent-note-form novalidate>
        <label class="blurb" for="parent-note" style="color:#141416">Note on ${esc(noteFor)}</label>
        <input id="parent-note" class="line-input" data-parent-note type="text" maxlength="120" autocomplete="off" value="${esc(state.parentNote)}" />
        ${flash}
        <button type="submit" class="learn-done secondary">Save note</button>
      </form>`
    : `${flash}<p class="blurb">All six lessons are noticed. ${esc(kid.name)} can look at them again from Home.</p>`;
  const mark = current
    ? `<button type="button" class="learn-done" data-parent-done>Mark “${esc(current.title)}” done</button>`
    : "";
  return shell(`
    <button type="button" class="back" data-back="home">← Back</button>
    <div class="learn-kicker">Parent</div>
    <h1>${esc(kid.name)}</h1>
    <p class="sub">Mark a lesson noticed, or leave a note. ${esc(kid.name)} still sees one lesson at a time.</p>
    <div data-parent-step="open">
      <div class="progress-track" role="progressbar" aria-label="Lessons noticed" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${doneCount}"><div class="progress-fill" style="width:${width}%"></div></div>
      <p class="progress-sub">Noticed ${doneCount} of ${total}</p>
      <div class="card">${rows}</div>
      ${mark}
      <div class="card">${noteBlock}</div>
      <button type="button" class="text-btn" data-parent-reset>Change code</button>
      <p class="counted-hint">This does not change the piggy, savings, or Grow amounts.</p>
    </div>
  `);
}

function renderParent(kid) {
  if (state.parentStep === "open") return renderParentOpen(kid);
  return renderParentGate(kid);
}

function submitParentCode(kid, digits) {
  const code = String(digits || "").replace(/\D/g, "").slice(0, 4);
  state.parentEntry = code;
  if (!/^\d{4}$/.test(code)) {
    state.parentError = "Use 4 numbers.";
    render(kid);
    focusParent();
    return;
  }
  if (state.parentStep === "set") {
    state.parentFirst = code;
    state.parentEntry = "";
    state.parentStep = "confirm";
    state.parentError = "";
    render(kid);
    focusParent();
    return;
  }
  if (state.parentStep === "confirm") {
    if (code !== state.parentFirst) {
      state.parentFirst = "";
      state.parentEntry = "";
      state.parentStep = "set";
      state.parentError = "Those didn’t match. Choose the code again.";
      render(kid);
      focusParent();
      return;
    }
    if (!writeParentCode(code)) {
      state.parentError = "Couldn’t save that code on this iPad. Try again.";
      state.parentEntry = "";
      render(kid);
      focusParent();
      return;
    }
    state.parentEntry = "";
    state.parentFirst = "";
    state.parentStep = "open";
    state.parentError = "";
    render(kid);
    return;
  }
  if (code !== readParentCode()) {
    state.parentEntry = "";
    state.parentError = "Try again.";
    render(kid);
    focusParent();
    return;
  }
  state.parentEntry = "";
  state.parentError = "";
  state.parentStep = "open";
  render(kid);
}

function render(kid) {
  kid.piggy = readPiggy(kid);
  kid.owed = readOwed(kid);
  const root = $("#app");
  const y = state.keepScroll ? window.scrollY : 0;
  if (state.screen === "home") root.innerHTML = renderHome(kid);
  else if (state.screen === "spend") root.innerHTML = renderSpend(kid);
  else if (state.screen === "save") root.innerHTML = renderSave(kid);
  else if (state.screen === "grow") root.innerHTML = renderGrow(kid);
  else if (state.screen === "month") root.innerHTML = renderMonth(kid);
  else if (state.screen === "learn") root.innerHTML = renderLearn(kid);
  else if (state.screen === "parent") root.innerHTML = renderParent(kid);
  else root.innerHTML = renderHome(kid);
  bind(kid);
  if (state.keepScroll) {
    window.scrollTo(0, y);
    state.keepScroll = false;
  } else if (state.scrollTop) {
    window.scrollTo(0, 0);
    state.scrollTop = false;
  }
}

function openScreen(kid, screen, panel) {
  if (screen === "spend" && state.screen !== "spend") {
    const saved = readPiggy(kid);
    const owed = readOwed(kid);
    state.piggyDraft = saved ? saved.amount.toFixed(2) : "";
    state.piggyError = "";
    state.owedDraft = owed.amount > 0 ? owed.amount.toFixed(2) : "";
    state.owedError = "";
  }
  if (screen === "save") {
    const learn = readLearn(kid);
    state.waitDraft = learn.waitingFor || "";
    state.waitFlash = "";
  }
  if (screen === "learn") focusLesson(kid, "");
  if (screen === "parent") {
    state.parentEntry = "";
    state.parentFirst = "";
    state.parentError = "";
    state.parentNoteFlash = "";
    state.parentStep = readParentCode() ? "enter" : "set";
    const progress = readLearn(kid);
    const current = currentLesson(progress);
    state.parentNote = current && progress.notes[current.id] ? progress.notes[current.id] : "";
  }
  state.screen = screen;
  state.panel = panel || "why";
  state.scrollTop = true;
  render(kid);
  if (screen === "parent" && state.parentStep !== "open") focusParent();
}

function captureDrafts() {
  const ask = document.querySelector("[data-ask-input]");
  if (ask) state.askDraft = ask.value;
  const wait = document.querySelector("[data-wait-input]");
  if (wait) state.waitDraft = wait.value;
}

function rerender(kid) {
  state.keepScroll = true;
  render(kid);
}

function bind(kid) {
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      openScreen(kid, el.getAttribute("data-go"), el.getAttribute("data-open-panel"));
    });
  });
  document.querySelectorAll("[data-back]").forEach((el) => {
    el.addEventListener("click", () => {
      const dest = el.getAttribute("data-back");
      if (dest !== "learn") state.justDoneId = "";
      if (dest === "home") {
        state.parentStep = "";
        state.parentEntry = "";
        state.parentFirst = "";
        state.parentError = "";
        state.parentNoteFlash = "";
      }
      state.screen = dest;
      state.scrollTop = true;
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

  document.querySelectorAll("[data-got-it]").forEach((el) => {
    el.addEventListener("click", () => {
      captureDrafts();
      const progress = readLearn(kid);
      const current = currentLesson(progress);
      if (!current || progress.done.includes(current.id)) return;
      const typed = state.askDraft.trim().slice(0, 120);
      if (typed) progress.notes[current.id] = typed;
      progress.done = progress.done.concat([current.id]);
      const saved = writeLearn(kid, progress);
      if (!saved) {
        state.askFlash = "Couldn’t save that on this iPad. Try again.";
        rerender(kid);
        return;
      }
      state.justDoneId = current.id;
      state.askOpen = false;
      state.learnReview = "";
      state.scrollTop = true;
      render(kid);
    });
  });
  document.querySelectorAll("[data-learn-continue]").forEach((el) => {
    el.addEventListener("click", () => {
      focusLesson(kid, "");
      state.screen = "learn";
      state.scrollTop = true;
      render(kid);
    });
  });
  document.querySelectorAll("[data-review]").forEach((el) => {
    el.addEventListener("click", () => {
      focusLesson(kid, el.getAttribute("data-review"));
      state.screen = "learn";
      state.scrollTop = true;
      render(kid);
    });
  });
  document.querySelectorAll("[data-review-current]").forEach((el) => {
    el.addEventListener("click", () => {
      focusLesson(kid, "");
      state.screen = "learn";
      state.scrollTop = true;
      render(kid);
    });
  });
  document.querySelectorAll("[data-sort]").forEach((el) => {
    el.addEventListener("click", () => {
      const item = SORTS[state.sortIndex];
      if (!item) return;
      captureDrafts();
      const choice = el.getAttribute("data-sort");
      if (choice === item.answer) {
        state.sortIndex += 1;
        state.sortNote = "";
      } else {
        state.sortNote = "Try another jar. " + item.yes;
      }
      rerender(kid);
    });
  });
  document.querySelectorAll("[data-notice]").forEach((el) => {
    el.addEventListener("click", () => {
      captureDrafts();
      const id = el.getAttribute("data-notice");
      state.noticed[id] = !state.noticed[id];
      rerender(kid);
    });
  });
  document.querySelectorAll("[data-month-example]").forEach((el) => {
    el.addEventListener("click", () => {
      captureDrafts();
      state.monthPick = el.getAttribute("data-month-example");
      rerender(kid);
    });
  });
  document.querySelectorAll("[data-path-example]").forEach((el) => {
    el.addEventListener("click", () => {
      captureDrafts();
      state.pathPick = el.getAttribute("data-path-example");
      rerender(kid);
    });
  });
  document.querySelectorAll("[data-privacy]").forEach((el) => {
    el.addEventListener("click", () => {
      captureDrafts();
      state.privacyOn = !state.privacyOn;
      rerender(kid);
    });
  });
  document.querySelectorAll("[data-ask-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      captureDrafts();
      state.askOpen = !state.askOpen;
      state.askFlash = "";
      rerender(kid);
      if (state.askOpen) {
        const input = document.querySelector("[data-ask-input]");
        if (input) input.focus();
      }
    });
  });
  const askForm = document.querySelector("[data-ask-form]");
  if (askForm) {
    const askInput = askForm.querySelector("[data-ask-input]");
    askInput.addEventListener("input", () => {
      state.askDraft = askInput.value;
    });
    askForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const progress = readLearn(kid);
      const view = viewLesson(progress);
      const text = askInput.value.trim().slice(0, 120);
      if (!text) {
        state.askDraft = askInput.value;
        state.askFlash = "Type a note, or skip this.";
        rerender(kid);
        const again = document.querySelector("[data-ask-input]");
        if (again) again.focus();
        return;
      }
      progress.notes[view.lesson.id] = text;
      const saved = writeLearn(kid, progress);
      state.askDraft = text;
      state.askOpen = false;
      state.askFlash = saved
        ? "Saved for a grown-up on this iPad."
        : "Couldn’t save that on this iPad. Try again.";
      rerender(kid);
    });
  }
  const clearAsk = document.querySelector("[data-ask-clear]");
  if (clearAsk) {
    clearAsk.addEventListener("click", () => {
      const progress = readLearn(kid);
      const view = viewLesson(progress);
      delete progress.notes[view.lesson.id];
      writeLearn(kid, progress);
      state.askDraft = "";
      state.askFlash = "";
      rerender(kid);
    });
  }
  const waitForm = document.querySelector("[data-wait-form]");
  if (waitForm) {
    const waitInput = waitForm.querySelector("[data-wait-input]");
    waitInput.addEventListener("input", () => {
      state.waitDraft = waitInput.value;
      if (!state.waitFlash) return;
      state.waitFlash = "";
      const note = waitForm.querySelector(".sort-note");
      if (note) note.remove();
    });
    waitForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = waitInput.value.trim().slice(0, 60);
      state.waitDraft = waitInput.value;
      if (!text) {
        state.waitFlash = "Type one thing you’re waiting for.";
        render(kid);
        const again = document.querySelector("[data-wait-input]");
        if (again) again.focus();
        return;
      }
      const progress = readLearn(kid);
      progress.waitingFor = text;
      const saved = writeLearn(kid, progress);
      state.waitDraft = text;
      state.waitFlash = saved
        ? "Remembered on this iPad."
        : "Couldn’t save that on this iPad. Try again.";
      render(kid);
    });
  }

  const parentForm = document.querySelector("[data-parent-form]");
  if (parentForm) {
    const parentInput = parentForm.querySelector("[data-parent-input]");
    parentInput.addEventListener("input", () => {
      const digits = parentInput.value.replace(/\D/g, "").slice(0, 4);
      parentInput.value = digits;
      state.parentEntry = digits;
      if (state.parentError) state.parentError = "";
      if (digits.length === 4) submitParentCode(kid, digits);
    });
    parentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitParentCode(kid, parentInput.value);
    });
  }
  document.querySelectorAll("[data-parent-done]").forEach((el) => {
    el.addEventListener("click", () => {
      if (state.parentStep !== "open") return;
      const progress = readLearn(kid);
      const current = currentLesson(progress);
      if (!current) return;
      const noteInput = document.querySelector("[data-parent-note]");
      const typed = (noteInput ? noteInput.value : state.parentNote).trim().slice(0, 120);
      if (typed) progress.notes[current.id] = typed;
      progress.done = progress.done.concat([current.id]);
      const saved = writeLearn(kid, progress);
      if (!saved) {
        state.parentNote = typed;
        state.parentNoteFlash = "Couldn’t save that on this iPad. Try again.";
        render(kid);
        return;
      }
      const next = currentLesson(saved);
      state.parentNote = next && saved.notes[next.id] ? saved.notes[next.id] : "";
      state.parentNoteFlash = "Marked done.";
      state.scrollTop = true;
      render(kid);
    });
  });
  const parentNoteForm = document.querySelector("[data-parent-note-form]");
  if (parentNoteForm) {
    const noteInput = parentNoteForm.querySelector("[data-parent-note]");
    noteInput.addEventListener("input", () => {
      state.parentNote = noteInput.value;
    });
    parentNoteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.parentStep !== "open") return;
      const progress = readLearn(kid);
      const current = currentLesson(progress);
      if (!current) return;
      const text = noteInput.value.trim().slice(0, 120);
      if (!text) {
        state.parentNoteFlash = "Type a note, or skip it.";
        render(kid);
        return;
      }
      progress.notes[current.id] = text;
      const saved = writeLearn(kid, progress);
      state.parentNote = text;
      state.parentNoteFlash = saved
        ? "Note saved on this iPad."
        : "Couldn’t save that on this iPad. Try again.";
      render(kid);
    });
  }
  document.querySelectorAll("[data-parent-reset]").forEach((el) => {
    el.addEventListener("click", () => {
      state.parentStep = "set";
      state.parentFirst = "";
      state.parentEntry = "";
      state.parentError = "";
      state.parentNoteFlash = "";
      render(kid);
      focusParent();
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
