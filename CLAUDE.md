# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server — UI only, /api/* returns 404
npm run build
npm run preview
```

There is no test runner, linter, or formatter configured.

**The `/api/*` routes are Vercel serverless functions and Vite does not serve them.** With `npm run dev`, Cooper's chat (`/api/chat`) fails and Results falls back to no AI explanation. To exercise the full flow locally, run `npx vercel dev` instead. Required env vars: `ANTHROPIC_API_KEY` (chat + explain), `SUPABASE_URL` / `SUPABASE_ANON_KEY` (log).

## Architecture

Single-page React app (Vite, no router). Motifi ranks UK used cars by *true four-year cost of ownership* rather than sticker price.

### Screen state machine

`src/App.jsx` holds all cross-screen state (`screen`, `answers`, `results`, `selectedCar`, `comparePreload`) and switches on a `screen` string: `home` → `questions` (ChatInterface) → `review` (ReviewScreen) → `results` → `car` (CarPage), with `compare` (CompareFlow) reachable from anywhere. `Home` is defined inline at the bottom of App.jsx. Navigation happens by passing callbacks down; there is no URL state, so a refresh resets everything.

### The `answers` object is the central contract

Every screen and every scoring module reads a single flat `answers` object. Its schema is defined in three places that must be kept in sync:

1. `SYSTEM_PROMPT` in `src/ChatInterface.jsx` — the 16 keys Cooper (Claude) is instructed to emit
2. `FIELDS` in `src/ReviewScreen.jsx` — labels, editors, and option lists for the same keys
3. `api/log.js` — maps those keys onto Supabase column names

Consumers: `scoring/filters.jsx`, `scoring/engine.jsx`, `scoring/costs.jsx`. Adding or renaming a question means touching all of the above.

**Dead code with stale key names:** `src/questions.jsx` and the legacy form at the bottom of `App.jsx` (after the routing block) use an older schema — `fuel`, `driving`, `mileage`, `space`, `ulez`, `runningCosts`, `purchaseMethod`, `radius`. The live schema uses `fuelType`, `drivingContext`, `annualMileage`, `bootSpace`, `ulezRequired`, `priority`, `paymentMethod`, `searchRadius`. Don't use either file as a reference for current field names.

### Cooper (the chat flow)

`ChatInterface.jsx` proxies the whole conversation through `/api/chat` → Anthropic Messages API (`claude-haiku-4-5-20251001`). The protocol is tag-based text, not tool use — the system prompt asks the model to append `<CHIPS>a|b|c</CHIPS>`, `<MOTIFI_PARTIAL>{...}</MOTIFI_PARTIAL>` (incremental answers, drives the live "cars match" counter and profile strip), and finally `<MOTIFI_ANSWERS>{...}</MOTIFI_ANSWERS>`. The extractors and `cleanText()` at the top of the file must stay in sync with the tag names in the prompt. Cooper hands off to ReviewScreen, never straight to Results — the user confirms answers before scoring runs.

### Data

`src/data/cars.json` — 353 records, one per **model generation** (e.g. Fiesta Mk7), not per listing. Fields are flat and mostly *band strings* (`mpgBand`, `insuranceBand`, `reliabilityBand`, `bootBand`, `depreciationBand`, `parkingSize`, `ownershipStress`, `ulezCompliant`). These band vocabularies are the scoring engine's interface — every scoring function is a lookup table keyed on exact band strings with a numeric fallback, so a typo in a band value silently degrades to a mid score rather than erroring. `priceLow`/`priceHigh` are AutoTrader 10th/90th percentiles for the generation.

### Scoring pipeline (`src/scoring/`)

Always filter before scoring — the engine deliberately does not filter:

```js
const filtered = applyHardFilters(carsData, answers)   // filters.jsx — binary pass/fail
getTopMatches(filtered, answers, { maxResults: 10, minScore: 6.0 })  // engine.jsx
```

`engine.jsx` scores six weighted dimensions (budget, driving context, running cost, ownership ease, safety, depreciation) on a **0–10 internal scale**; base weights sum to 1.00 and `getWeights()` applies zero-sum adjustments from `answers.priority` and motorway driving. The UI displays `finalScore × 10` out of 100 — `minScore: 6.0` is the "60/100" threshold Results' empty state refers to.

`costs.jsx` is the canonical money model, and other modules must not recompute these:
- `getRepresentativePrice(car)` — price-band midpoint, the display price everywhere (`priceLow` alone misranks overlapping bands)
- `getYearOneCost(car, answers)` — branches on `paymentMethod` (Cash / Bank Loan / Part Exchange / Hire Purchase); uses `priceLow` as the entry price
- `getTrue48MonthCost(car, answers)` — the headline number; deliberately **excludes maintenance** (no data in the dataset yet)

`verdict.jsx` builds the Compare grid (per-cell `displayValue` / `rawValue` / `verdict` / `position`, where `position` is always normalised so 1 = best regardless of whether lower or higher wins) plus the overall verdict copy. `oneliners.jsx` generates rule-based prose for ranks 2–10 — deterministic and free, with a variety pass so consecutive rows don't fire the same rule; its `[mint:...]` / `[amber:...]` markup tokens are rendered into spans by `renderHighlights()` in Results.jsx.

`retailers.jsx`, `insurers.jsx`, `finance.jsx` build partner deep links for CarPage. Listing counts in `retailers.jsx` are **deterministic estimates** hashed from make/model, not real inventory — labelled as estimates in the UI, and the only place to change when a real API lands.

### AI usage boundaries

Only two things call Claude: the Cooper conversation, and the hero card's "Why this wins" paragraph (`/api/explain`, which pre-computes the comparison numbers server-side and asks for a strict 3-sentence format). Everything else — rankings, one-liners, verdicts, costs — is deterministic local computation. Keep it that way; `/api/explain` swallows errors and returns an empty string so the page degrades cleanly.

### Styling

Three layers, all hand-written CSS:
- `design/tokens.css` — CSS custom properties on `:root` (brand palette, three font families). `.band-light` re-declares the token values to flip a section onto light paper; nested components re-resolve automatically.
- `design/home.css` — landing page, scoped under `.motifi-home`
- `design/screens.css` — every other screen, scoped under `.motifi-screen`

New styles belong under one of those two scopes. **Tailwind is installed and configured but effectively unused** — the `className` values in the components are custom classes from these files, not utilities. Fonts (Satoshi, Fraunces, IBM Plex Mono) load from CDNs in `index.html`.

Car photography is fetched live from `cdn.imagin.studio` via URLs built from make/model/year; every `<img>` has an `onError` handler that hides the element, so missing images fail silently.
