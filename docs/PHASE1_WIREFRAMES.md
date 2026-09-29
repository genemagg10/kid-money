# Kids Money Dashboard — Phase 1 wireframes (iPad portrait)

**Owner (visual):** Dieter · **Owner (money model + curriculum):** Warren  
**Kids:** Ella (8), Luca (10) · **Device:** iPad portrait  
**Phase:** Design + curriculum only — no build, no allowance/interest engine  
**Date:** 2026-09-28 · **Design calls locked** (Warren) · **Rev 3**

## Locked product rules

1. **Grow labels (same for Ella and Luca)**  
   - Home: label **Grow** only (calm progress OK; no college/later split on Home).  
   - Grow detail: two calm rows — **For college** (← 529) · **For later** (← kids brokerage + kids Roth as one Phase 1 bucket).  
   - Never show 529 / Roth / brokerage on kid UI. Named account split only in teens.

2. **This-month** — jar-only (and optional dedicated screen opened from a jar). **Not on Home.** Home = greeting + three jars only.

3. **Who-gate** — Who? screen first every open; tap Ella or Luca. No kid PIN (trust + Guided Access). Parent corner / account mapping behind a **4-digit parent passcode** — off the kid path. Face ID for who is optional later, not v1.

4. **Kid UI is read-only** — no money-move CTAs; no sibling scores/ranking.

## Number rules (rev 3)

| Jar / area | What the kid sees |
|---|---|
| **Spend** | Real dollar balance |
| **Save** | Real dollar balance (+ optional goal progress bar) |
| **Grow** (Home + detail) | **No real dollar amounts.** Progress only: filled path, milestone rings, phrases like “on the way,” “growing for college.” Parent maps 529 / brokerage / Roth behind the scenes. |

## Curriculum in layout (rev 3)

- Short **one-line tips** tied to the jar on screen (home cards + jar detail tip strip).
- Soft chips / expandable **“Why this jar?”** — light, optional; not a course wall or homework dump.
- Learn stays soft; education feels helpful in place.

## Design stance

Compelling for a child · **official** (serious money product, not cartoon toy) · modern polished (Inter, smooth cards). Honest big numbers where dollars are allowed · unobtrusive · same three-jar skeleton unlocks later ages without redesign.

## Screens

| # | File | Purpose |
|---|---|---|
| 01 | `wireframes/01-home-ella.png` | Greeting + Spend / Save (real $) / Grow (progress only); Why-this-jar one-liners; no This-month; no money-move CTAs |
| 02 | `wireframes/02-jar-save.png` | Save real $ + goal bar + tip + Why/This-month chips + jar-only month lines |
| 03 | `wireframes/03-this-month.png` | Optional story from a jar — not linked from Home |
| 04 | `wireframes/04-who.png` | Every-open who-gate; no scores; parent corner separate |
| 05 | `wireframes/05-jar-grow.png` | Grow progress only — For college / For later paths + rings; tip; **no dollar totals** |

## Age unlock

See `AGE_UNLOCK.md` — add glass into the same cards at ~11–13 and teens; never replace allowed big numbers with charts; Grow still never shows real $ to kids in Phase 1; never sibling rank or kid spend buttons.

## Out of scope for Phase 1 build

Allowance/interest engine · live transfers · parent full UI polish · Face ID who-gate.

## Visual finish

**Rev 1** — pixel / bitmap type (rejected).  
**Rev 2** — Inter + smooth cards (modern polish).  
**Rev 3 — 2026-09-28** — Official kid money product: real $ on Spend/Save only; Grow = progress indicators; curriculum woven as tips + soft Why chips. Images in this folder:

- `wireframes/01-home-ella.png`
- `wireframes/02-jar-save.png`
- `wireframes/03-this-month.png`
- `wireframes/04-who.png`
- `wireframes/05-jar-grow.png`
