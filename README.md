# Family Money

Jars for Ella and Luca. Each child has a separate page, so one bookmark cannot open the other child’s jars.

Spend is the piggy bank (cash at home). Each child counts it and updates the total on their own page. A slider then splits that count into spend-now and “to save from piggy.” Brown on the slider is the spend part; blue is the part that can wait. On the same piggy, a child can note money they owe a grown-up and clear it when they pay it back. That note stays in the browser for that child only — Ella and Luca do not share it, and it does not sync to another iPad. Neither the split nor money owed changes the savings-account balance. Save is the savings account (Wells Fargo). On September 28, 2026, $2,000 moved from each child’s savings into a Roth IRA. The kid pages show Ella $227.86 and Luca $257.12. Roth dollar totals are not shown there. Grow is long-term: the college path at about 43% (no college dollar total), a retirement path with no dollar total (Roth IRA now, 401(k) later), plus invested brokerage dollars (Schwab, same day): Ella $3,151.37, Luca $3,268.61. Tips stay on each jar. Nothing here moves money.

## iPad bookmarks

- Ella: https://genemagg10.github.io/kid-money/ella/
- Luca: https://genemagg10.github.io/kid-money/luca/

Site files are on `main` at the repository root (`.nojekyll`, so Pages serves the files as-is). In the repo, set Pages to **Deploy from a branch**, branch `main`, folder `/` (root).

## Curriculum

Jar map, in this order: **Spend** is the editable piggy plus money owed. **Save** is the Wells Fargo savings balance, read-only. **Grow** is the college path (no dollar total), the retirement path (no dollar total; Roth IRA now, 401(k) later), and brokerage dollars. See `docs/curriculum.md`.

Warren’s Phase 1 lessons (L1–L6) show up in the kid pages, one idea at a time.

- **Home** — “Your money has jobs.” Each jar’s Why line is that job: use soon, wait on purpose, grow for a long time. A Learn card shows the current lesson and gentle progress, such as 2 of 6.
- **Learn** — L1 Three jars, L2 Your dashboard, L3 This month, L4 Save vs Spend, L5 Grow for later, L6 Privacy. “I got it” unlocks the next lesson. Continue moves on. Ask a grown-up saves an optional note.
- **Spend** — Counting the piggy and the brown/blue slider are the Save vs Spend activity. Money owed stays on this jar.
- **Save** — Tip, Why, and This month, plus “Name one thing you’re waiting for.” The savings number does not change from this page.
- **Grow** — College path and retirement path, with no dollar totals on those paths. Roth IRA and 401(k) are named only in the retirement tip. The activity is to say what each path is for. Brokerage dollars stay on Invested / Growing.
- **Parent** — A quiet control on Home, behind a 4-digit code stored only on that iPad (`family-money-parent`). It can mark the next lesson done and save a note. It is not on the lesson cards, and it does not move money.

Progress stays in this browser only, one child per key: `family-money-learn:ella` and `family-money-learn:luca` (`done`, `notes`, `waitingFor`). Piggy counts, the slider split, and money owed stay on their own keys.
