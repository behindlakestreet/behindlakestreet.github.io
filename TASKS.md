# Tasks: Overlast Logger v2

> Companion to `SPEC.md` and `PLAN.md`. Each task is sized for a single
> focused session (XS–M). Tasks are ordered by dependency. Verification
> steps are explicit; the system is never considered "done" until the
> verification step passes.

**Status legend.** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Scaffold

### [ ] Task 0.1: Initialize Vite + React + TS project
**Description.** Create the project with Vite's `react-ts` template, trim
defaults, set up the agreed `src/` layout.
**Acceptance criteria:**
- [ ] `package.json` exists with `react`, `react-dom`, `react-router-dom`, `typescript`, `vite`, `@vitejs/plugin-react`.
- [ ] `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `@/` path alias to `src/`.
- [ ] `vite.config.ts` registers `@/` alias and React plugin.
- [ ] `src/main.tsx` mounts an empty `<App />` that renders the text "Overlast Logger".
- [ ] `npm run dev` serves on `:5173` and the text is visible.
**Verification:** `npm run dev` shows "Overlast Logger"; `npm run build` succeeds.
**Dependencies:** None.
**Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app/App.tsx`.
**Scope:** M (3–5 files).

### [ ] Task 0.2: Add Tailwind, ESLint, Prettier
**Description.** Tailwind for styling, ESLint + Prettier for code quality.
**Acceptance criteria:**
- [ ] Tailwind configured via `tailwind.config.ts` and `postcss.config.js`; `src/styles/index.css` contains `@tailwind base; @tailwind components; @tailwind utilities;`.
- [ ] A test class like `text-blue-600` is visible in the running app.
- [ ] `npm run lint` and `npm run format` scripts work; `npm run typecheck` (alias for `tsc --noEmit`) is green.
**Verification:** `npm run lint && npm run typecheck` passes; sample Tailwind class renders.
**Dependencies:** 0.1.
**Files:** `tailwind.config.ts`, `postcss.config.js`, `src/styles/index.css`, `.eslintrc.cjs`, `.prettierrc`, `package.json`.
**Scope:** S.

### [ ] Task 0.3: Add Vitest + Testing Library + Playwright
**Description.** Set up the test tooling so we can write the first test in Phase 2.
**Acceptance criteria:**
- [ ] `npm test` runs Vitest in jsdom env and exits 0 with zero tests.
- [ ] `npm run test:e2e` runs Playwright (no specs yet, but config is valid).
- [ ] `playwright.config.ts` configures a single Chromium project.
**Verification:** Both commands run and exit 0; a trivial `expect(1).toBe(1)` test passes.
**Dependencies:** 0.1.
**Files:** `vitest.config.ts`, `tests/setup.ts`, `playwright.config.ts`, `package.json`.
**Scope:** S.

### Checkpoint: Phase 0
- [ ] `npm run dev` boots, app is usable, "Overlast Logger" renders.
- [ ] `npm run lint && npm run typecheck && npm test` all green.
- [ ] `playwright.config.ts` valid; `npm run test:e2e` runs (zero specs is fine).
- [ ] **Human review before Phase 1.**

---

## Phase 1 — Domain & persistence

### [ ] Task 1.1: Define `LogEntry` and `LogType` in `types/domain.ts`
**Description.** Codify the domain model from the spec. No runtime code, types only.
**Acceptance criteria:**
- [ ] `LogType = 'trilling' | 'geluid' | 'beide'`.
- [ ] `VibrationReading`, `AudioClip`, `LogEntry` exported with the fields from SPEC.md.
- [ ] `tsc --noEmit` is green.
**Verification:** `npm run typecheck` passes.
**Dependencies:** 0.1.
**Files:** `src/types/domain.ts`.
**Scope:** XS.

### [ ] Task 1.2: `LogRepository` interface + `memoryRepository` impl
**Description.** Pure TS interface and an in-memory implementation, used in tests and dev.
**Acceptance criteria:**
- [ ] `LogRepository` interface declares `list`, `add`, `remove`, `clear`.
- [ ] `memoryRepository` satisfies it; preserves insertion order; deep-clones on read so tests can't mutate stored entries.
**Verification:** `npm test -- memoryRepository` passes (write the test in this task).
**Dependencies:** 1.1.
**Files:** `src/lib/repository/types.ts`, `src/lib/repository/memoryRepository.ts`, `tests/unit/memoryRepository.test.ts`.
**Scope:** S.

### [ ] Task 1.3: `idbRepository` impl using `idb`
**Description.** IndexedDB-backed implementation; supports `Blob` storage for `AudioClip`.
**Acceptance criteria:**
- [ ] Store name `overlast_logs_v1`, key path `id`, index on `timestamp`.
- [ ] Round-trip test against `fake-indexeddb` (add → list → remove → clear) passes, including an entry with an `AudioClip` blob.
- [ ] No `Date.now()` outside the constructor; the impl is fully deterministic given injected dependencies.
**Verification:** `npm test -- idbRepository` passes.
**Dependencies:** 1.2.
**Files:** `src/lib/repository/idbRepository.ts`, `tests/unit/idbRepository.test.ts`, `package.json` (add `idb`, `fake-indexeddb` as devDep).
**Scope:** S.

### [ ] Task 1.4: `Profile` domain + `profileRepository`
**Description.** A second small store for the letter view's autofill data (verzoeker + recipient block). One record keyed by `'default'`.
**Acceptance criteria:**
- [ ] `Profile` type in `types/domain.ts` with all fields from SPEC.md (name, address, postcode, plaats, phone, email; gemeente naam, postbus, postcode, plaats).
- [ ] `profileRepository` interface: `get(): Promise<Profile | null>`, `save(p: Profile): Promise<void>`.
- [ ] In-memory and IndexedDB impls; round-trip test passes.
**Verification:** `npm test -- profileRepository` passes.
**Dependencies:** 1.3.
**Files:** `src/types/domain.ts`, `src/lib/repository/profileRepository.ts` (split into types + impls mirroring logs).
**Scope:** S.

### [ ] Task 1.5: Repository selector (`index.ts`) + `id.ts`
**Description.** Picks memory vs. IndexedDB by `import.meta.env.MODE`. Plus the `uid()` generator.
**Acceptance criteria:**
- [ ] `getLogRepository()` and `getProfileRepository()` return correct impl per env.
- [ ] In Vitest, both return the in-memory impls.
- [ ] `uid()` returns a string; collisions over 10k calls ≤ 1 (statistical, just spot-check).
**Verification:** `npm test -- repository/index` passes.
**Dependencies:** 1.3, 1.4.
**Files:** `src/lib/repository/index.ts`, `src/lib/id.ts`, `tests/unit/id.test.ts`.
**Scope:** S.

### Checkpoint: Phase 1
- [ ] All Phase 1 unit tests pass.
- [ ] `npm run lint && npm run typecheck && npm test` green.
- [ ] **Human review before Phase 2.**

---

## Phase 2 — Pure logic (TDD)

### [ ] Task 2.1: `format.ts` (Dutch date formatters)
**Description.** Pure `fmtDate`, `fmtDateOnly` with the same Dutch locale behavior as the reference.
**Acceptance criteria:**
- [ ] Output matches `nl-NL` with `2-digit` day/month and `4-digit` year.
- [ ] `fmtDate('')` and `fmtDate(null)` return `''` (defensive).
- [ ] UTC ISO round-trips through the formatter without shifting days.
**Verification:** `npm test -- format` passes.
**Dependencies:** 1.1.
**Files:** `src/lib/time/format.ts`, `tests/unit/format.test.ts`.
**Scope:** XS.

### [ ] Task 2.2: `aggregate.ts`
**Description.** `aggregate(logs): Aggregate` with the shape from SPEC.md.
**Acceptance criteria:**
- [ ] Empty input returns zeroed `Aggregate` with `byHour` of length 24.
- [ ] Multi-day input produces the right `byDay` keys (`YYYY-MM-DD`).
- [ ] Mixed types increment `byType` correctly.
- [ ] No `Date.now()` — clock must be injectable for tests.
**Verification:** `npm test -- aggregate` passes.
**Dependencies:** 1.1.
**Files:** `src/lib/report/aggregate.ts`, `tests/unit/aggregate.test.ts`.
**Scope:** S.

### [ ] Task 2.3: `buildHtml.ts` (report HTML generator)
**Description.** Pure function returning a self-contained HTML string.
**Acceptance criteria:**
- [ ] Output opens via `file://` (Playwright: load `data:text/html,${output}` and assert Dutch strings render).
- [ ] Special characters in `description` are HTML-escaped.
- [ ] Empty `logs` produces "Geen meldingen in deze periode" row, not an error.
- [ ] Snapshot test: output includes all required section headings.
**Verification:** `npm test -- buildHtml` passes (unit + Playwright file-load check).
**Dependencies:** 2.1, 2.2.
**Files:** `src/lib/report/buildHtml.ts`, `tests/unit/buildHtml.test.ts`.
**Scope:** M.

### [ ] Task 2.4: `letter/summary.ts` (paragraaf 2a text)
**Description.** Pure function that turns `logs + agg` into the autofilled text for paragraaf 2a of the letter. **Includes the 1–10 → 1–5 bucketing** (`bucket = ceil(intensity / 2)`).
**Acceptance criteria:**
- [ ] A fixture mirroring the example letter's exact numbers reproduces them: `1.805 min`, `12/12 dagen (100%)`, `gem. 3,6 op schaal 1-5`, `48%` nacht, zwaarste dag `vrijdag 5 juni 2026 — 420 minuten`.
- [ ] Empty input returns a sensible "geen meldingen" block.
- [ ] Night window: minutes where the entry timestamp's hour is in `22..23 ∪ 0..6`.
**Verification:** `npm test -- letter/summary` passes, including the example-letter fixture.
**Dependencies:** 2.2.
**Files:** `src/lib/letter/summary.ts`, `tests/unit/letter/summary.test.ts`.
**Scope:** S.

### [ ] Task 2.5: `letter/template.ts` (full letter HTML)
**Description.** `buildLetterHtml(input: LetterInput): string` returns a self-contained, print-ready HTML string. Mirrors `example_letter.md` structure.
**Acceptance criteria:**
- [ ] Required section headings present: "Gegevens verzoeker", "Omschrijving van de situatie", "Kwantitatieve onderbouwing", "Verzoek tot handhaving", "Wettelijke grondslag", "Termijn", "Verzuim en rechtsmiddel", "Bijlagen", "Ontvangstbevestiging", "Verzendadvies".
- [ ] No `{{...}}` placeholders remain in the output (an explicit "no placeholders left" test scans the string).
- [ ] Special characters in omschrijvingen are HTML-escaped.
- [ ] Empty profile / empty inputs render reasonable placeholders rather than `undefined`.
**Verification:** `npm test -- letter/template` passes.
**Dependencies:** 2.4.
**Files:** `src/lib/letter/template.ts`, `tests/unit/letter/template.test.ts`.
**Scope:** M.

### [ ] Task 2.6: `letter/bijlage1.ts` (ZIP packaging)
**Description.** `buildBijlage1Zip(...)` returns a `Uint8Array` zip with the four files from SPEC.md.
**Acceptance criteria:**
- [ ] Zip parses; contains `overlast-rapport-*.html`, `logboek.csv`, `logboek-aggregaat.csv`, `logboek-samenvatting.txt`.
- [ ] `logboek.csv` has the exact header row from the spec.
- [ ] `logboek-aggregaat.csv` has keys for count, days, totalDuration, avgIntensity, byType, byDay, byHour.
- [ ] A row with an `audioClip` renders `heeft_audio=ja` correctly.
**Verification:** `npm test -- letter/bijlage1` passes.
**Dependencies:** 2.3, 2.4.
**Files:** `src/lib/letter/bijlage1.ts`, `tests/unit/letter/bijlage1.test.ts`, `package.json` (add `fflate`).
**Scope:** S.

### Checkpoint: Phase 2
- [ ] All pure-logic tests pass.
- [ ] Example-letter fixture in `summary.test.ts` reproduces the example's numbers.
- [ ] **Human review before Phase 3.**

---

## Phase 3 — UI shell & routing

### [ ] Task 3.1: `App` shell + `TabNav` (4 tabs)
**Description.** Sticky header with four tabs: Log, Geschiedenis, Rapport, Brief. URL-driven.
**Acceptance criteria:**
- [ ] React Router setup with routes `/log`, `/geschiedenis`, `/rapport`, `/brief`.
- [ ] Tabs are keyboard-navigable; active tab is visually distinct.
- [ ] Each route renders a placeholder component with the route name.
**Verification:** `npm run dev` shows four tabs; clicking switches URL. `npm test -- TabNav` passes.
**Dependencies:** 0.2.
**Files:** `src/main.tsx`, `src/app/App.tsx`, `src/components/TabNav.tsx`, `src/app/routes/*.tsx` (placeholders).
**Scope:** S.

### [ ] Task 3.2: `useLogs` + `useProfile` hooks
**Description.** Thin wrappers around the repository singletons; expose data + actions, handle loading/error.
**Acceptance criteria:**
- [ ] `useLogs()` returns `{ logs, add, remove, clear, loading, error }`.
- [ ] `useProfile()` returns `{ profile, save, loading, error }`.
- [ ] Updates trigger re-render (basic state subscription works in jsdom tests).
**Verification:** `npm test -- hooks` passes.
**Dependencies:** 1.5.
**Files:** `src/hooks/useLogs.ts`, `src/hooks/useProfile.ts`, `tests/component/hooks.test.tsx`.
**Scope:** S.

### Checkpoint: Phase 3
- [ ] App boots, four tabs work, hooks are tested.
- [ ] **Human review before Phase 4.**

---

## Phase 4 — Log form + sensors

### [ ] Task 4.1: `LogForm` (no sensors yet)
**Description.** Form fields from the reference: type (radio), intensity (1–10), duration, location (fixed list), description. Submit persists to repo and flashes "Opgeslagen ✓".
**Acceptance criteria:**
- [ ] Submitting calls `repo.add` with the right shape; description and pending sensors reset.
- [ ] Validation: intensity 1–10, duration ≥ 1.
- [ ] Button flash lasts 1.2s; submit disabled during flash.
**Verification:** `npm test -- LogForm` passes.
**Dependencies:** 3.2.
**Files:** `src/components/LogForm.tsx`, `src/components/IntensitySlider.tsx`, `src/components/LocationSelect.tsx`, `tests/component/LogForm.test.tsx`.
**Scope:** M.

### [ ] Task 4.2: `useSoundMeter` + dB button
**Description.** `getUserMedia({ audio: true })` → AnalyserNode → RMS over 2s → dB. Clamp `≥ 0`. Stream stops on finish.
**Acceptance criteria:**
- [ ] Hook returns `{ start, status, result, error }`.
- [ ] Permission denied → `status = 'denied'`, button shows "geen toegang".
- [ ] On success, `result` is a number ≥ 0; stream tracks are stopped.
- [ ] Mic permission is requested only on user gesture (button click).
**Verification:** `npm test -- useSoundMeter` passes (mock `getUserMedia`).
**Dependencies:** 4.1.
**Files:** `src/hooks/useSoundMeter.ts`, `src/lib/sensors/soundMeter.ts`, `tests/unit/useSoundMeter.test.ts`.
**Scope:** S.

### [ ] Task 4.3: `useVibrationMeter` + vibration button
**Description.** `devicemotion` listener, sample for 3s, compute `max` and `avg` of `||a||`. iOS 13+ permission flow.
**Acceptance criteria:**
- [ ] On success, result is `{ max, avg }` with `max ≥ avg`.
- [ ] No events fire → "geen sensor" fallback.
- [ ] iOS permission path calls `DeviceMotionEvent.requestPermission()` and respects the response.
**Verification:** `npm test -- useVibrationMeter` passes (mock `addEventListener`, `DeviceMotionEvent`).
**Dependencies:** 4.2.
**Files:** `src/hooks/useVibrationMeter.ts`, `src/lib/sensors/vibrationMeter.ts`, `tests/unit/useVibrationMeter.test.ts`.
**Scope:** S.

### [ ] Task 4.4: `useAudioRecorder` + 5s clip button
**Description.** `MediaRecorder` over a `getUserMedia` stream, ~5s, preferred MIME `audio/webm;codecs=opus`. Result is a `Blob`.
**Acceptance criteria:**
- [ ] Hook returns `{ start, status, result, error }` where `result: Blob | null`.
- [ ] Resulting blob is roughly the right duration (mock-friendly check: count of `dataavailable` calls).
- [ ] Unsupported MIME falls back to first `MediaRecorder.isTypeSupported` true value; `MediaRecorder` undefined → button hidden.
- [ ] Mic stream tracks are stopped after recording.
**Verification:** `npm test -- useAudioRecorder` passes.
**Dependencies:** 4.2.
**Files:** `src/hooks/useAudioRecorder.ts`, `src/lib/sensors/audioRecorder.ts`, `tests/unit/useAudioRecorder.test.ts`.
**Scope:** S.

### [ ] Task 4.5: `SensorPanel` (combines the three)
**Description.** Single component with three buttons (dB, vibration, 5s clip), live status text per measurement. Independent passes per the design decision.
**Acceptance criteria:**
- [ ] Each button shows a status row: "—", "meten…", final reading, or error fallback string.
- [ ] Submitting the form attaches whichever readings are present; missing ones stay `undefined`.
- [ ] All three buttons disabled appropriately (e.g., during their own measurement).
**Verification:** `npm test -- SensorPanel` passes.
**Dependencies:** 4.2, 4.3, 4.4.
**Files:** `src/components/SensorPanel.tsx`, `tests/component/SensorPanel.test.tsx`.
**Scope:** S.

### Checkpoint: Phase 4
- [ ] End-to-end: log an event on dev server, entry persists across reload.
- [ ] All Phase 4 tests pass.
- [ ] **Human review before Phase 5.**

---

## Phase 5 — History

### [ ] Task 5.1: `DateRangeFilter` + `LogList` + `LogItem`
**Description.** History tab renders entries reverse-chronological, color-coded by type, with date-range filter and delete-with-confirm.
**Acceptance criteria:**
- [ ] Empty state: "Nog geen meldingen."
- [ ] Filter respects inclusive `from` / exclusive `to + T23:59:59` semantics.
- [ ] Delete: `confirm()` → repo remove → re-render.
- [ ] Type-specific left-border color matches the reference.
**Verification:** `npm test -- LogList` passes (empty, sorted, filtered, delete).
**Dependencies:** 3.2, 4.1.
**Files:** `src/components/DateRangeFilter.tsx`, `src/components/LogList.tsx`, `src/components/LogItem.tsx`, `src/app/routes/HistoryRoute.tsx`, `tests/component/LogList.test.tsx`.
**Scope:** M.

### [ ] Task 5.2: Audio playback in `LogItem`
**Description.** For entries with an `AudioClip`, render an `<audio controls>` whose `src` is `URL.createObjectURL(blob)`. Revoke on unmount.
**Acceptance criteria:**
- [ ] Audio control renders only when `audioClip` is present.
- [ ] Object URL is revoked when the item unmounts (spy on `URL.revokeObjectURL`).
**Verification:** `npm test -- LogItem` passes.
**Dependencies:** 5.1.
**Files:** `src/components/LogItem.tsx` (extend), `tests/component/LogItem.test.tsx`.
**Scope:** S.

### Checkpoint: Phase 5
- [ ] History view works end-to-end; audio plays back.
- [ ] **Human review before Phase 6.**

---

## Phase 6 — Report

### [ ] Task 6.1: `ReportPreview` (iframe + date filter)
**Description.** Iframe with `srcdoc` = `buildReportHtml(filtered, aggregate(filtered))`. Same date-range filter as history.
**Acceptance criteria:**
- [ ] `srcdoc` is regenerated when date inputs change.
- [ ] The iframe `dataset.html` holds the latest HTML for the download button to read.
**Verification:** `npm test -- ReportPreview` passes.
**Dependencies:** 5.1, 2.3.
**Files:** `src/components/ReportPreview.tsx`, `src/app/routes/ReportRoute.tsx`, `tests/component/ReportPreview.test.tsx`.
**Scope:** S.

### [ ] Task 6.2: Report download + clear-data actions
**Description.** `Download HTML` blob → object URL → `<a download>`. `Wis alle data` with `confirm()`.
**Acceptance criteria:**
- [ ] Filename: `overlast-rapport-YYYY-MM-DD.html`.
- [ ] Clear-data calls `repo.clear()` and refreshes the preview.
**Verification:** `npm test -- ReportPreview` (action paths) passes.
**Dependencies:** 6.1.
**Files:** `src/components/ReportPreview.tsx` (extend), `tests/component/ReportPreview.test.tsx` (extend).
**Scope:** S.

### Checkpoint: Phase 6
- [ ] Report works end-to-end on dev; downloaded HTML opens via `file://` and prints.
- [ ] **Human review before Phase 6.5.**

---

## Phase 6.5 — Letter (klachtbrief)

### [ ] Task 6.5.1: `ProfilePanel` inside Letter route
**Description.** Collapsible panel for verzoeker + recipient block; reads/writes via `useProfile`.
**Acceptance criteria:**
- [ ] Empty state: hint to fill in the profile.
- [ ] Save persists; reloading the page restores the values.
- [ ] All fields from the spec are present and labeled in Dutch.
**Verification:** `npm test -- ProfilePanel` passes.
**Dependencies:** 3.2.
**Files:** `src/components/ProfilePanel.tsx`, `tests/component/ProfilePanel.test.tsx`.
**Scope:** S.

### [ ] Task 6.5.2: `LetterForm` (case-specific inputs)
**Description.** Per-letter inputs: adres bron, periode omschrijving, up to 5 omschrijving bullets, frequentie, duur per keer, datum van de brief. State in component, not in repo.
**Acceptance criteria:**
- [ ] Form re-renders letter preview live (asserted in 6.5.3).
- [ ] Datum defaults to `vandaag`; user can override.
- [ ] No persistence on submit (state-only).
**Verification:** `npm test -- LetterForm` passes.
**Dependencies:** 6.5.1.
**Files:** `src/components/LetterForm.tsx`, `tests/component/LetterForm.test.tsx`.
**Scope:** M.

### [ ] Task 6.5.3: `LetterPreview` (live iframe)
**Description.** Iframe with `srcdoc` rebuilt on every form/profile change. Updates within one tick of typing.
**Acceptance criteria:**
- [ ] Typing in the form changes the iframe's `srcdoc` (assert a unique substring appears).
- [ ] Profile changes also flow through (e.g., name appears in the rendered letter).
**Verification:** `npm test -- LetterPreview` passes.
**Dependencies:** 6.5.2, 2.5.
**Files:** `src/components/LetterPreview.tsx`, `src/app/routes/LetterRoute.tsx`, `tests/component/LetterPreview.test.tsx`.
**Scope:** S.

### [ ] Task 6.5.4: Letter download + "Bekijk samenvatting"
**Description.** Download buttons for the letter HTML and the Bijlage 1 ZIP. "Bekijk samenvatting" expandable above the form.
**Acceptance criteria:**
- [ ] Letter filename: `klachtbrief-${slug(straat)}-${YYYY-MM-DD}.html`. Falls back to `klachtbrief-${YYYY-MM-DD}.html` if no street.
- [ ] ZIP button disabled when no entries in the period; tooltip explains why.
- [ ] Samenvatting shows the paragraaf 2a text the user is about to send.
**Verification:** `npm test -- LetterRoute` (download + samenvatting paths) passes.
**Dependencies:** 6.5.3, 2.6.
**Files:** `src/app/routes/LetterRoute.tsx` (extend), `src/lib/letter/slug.ts`, `tests/component/LetterRoute.test.tsx`.
**Scope:** M.

### Checkpoint: Phase 6.5
- [ ] Letter view works end-to-end on dev; downloaded letter opens via `file://`; Bijlage 1 zip contains all four files.
- [ ] **Human review before Phase 7.**

---

## Phase 7 — PWA shell

### [ ] Task 7.1: Install `vite-plugin-pwa` and add manifest
**Description.** Service worker + manifest + icons. Precache the app shell, NOT the IndexedDB data.
**Acceptance criteria:**
- [ ] `npm run build` produces a service worker and `manifest.webmanifest`.
- [ ] DevTools → Application shows a valid SW and installable manifest.
- [ ] Build output includes `apple-touch-icon` and a vector favicon.
**Verification:** Manual: `npm run build && npm run preview`, DevTools inspection.
**Dependencies:** 6.5.4.
**Files:** `vite.config.ts` (extend), `public/manifest.webmanifest`, `public/favicon.svg`, `public/apple-touch-icon.png`, `package.json`.
**Scope:** S.

### Checkpoint: Phase 7
- [ ] Lighthouse PWA audit ≥ 90 on the preview build.
- [ ] **Human review before Phase 8.**

---

## Phase 8 — Polish & e2e

### [ ] Task 8.1: Playwright e2e — log flow
**Description.** Mobile-viewport e2e: open app, fill form with a dB reading, submit, see entry in history.
**Acceptance criteria:**
- [ ] Test passes on Chromium with `viewport: { width: 390, height: 844 }` (iPhone 14 size).
- [ ] Seeds the in-memory repo via a test-only import (or via UI).
**Verification:** `npm run test:e2e -- log-flow` passes.
**Dependencies:** 5.1, 4.5.
**Files:** `tests/e2e/log-flow.spec.ts`, `playwright.config.ts` (mobile project).
**Scope:** S.

### [ ] Task 8.2: Playwright e2e — letter flow
**Description.** Fill profile, fill letter inputs with the example-letter scenario, generate letter, assert autofilled data appears in iframe srcdoc. Click Bijlage 1 download, assert the resulting blob parses as a zip and contains the four expected files.
**Acceptance criteria:**
- [ ] Iframe srcdoc contains the autofilled name, address, and the paragraaf 2a numbers from the fixture.
- [ ] The downloaded blob, when unzipped in the test, has all four files with the right names.
**Verification:** `npm run test:e2e -- letter-flow` passes.
**Dependencies:** 6.5.4.
**Files:** `tests/e2e/letter-flow.spec.ts`.
**Scope:** M.

### [ ] Task 8.3: Accessibility & reduced-motion
**Description.** All form fields labelable; tab nav keyboard-navigable; respect `prefers-reduced-motion` for any chart/transition animations.
**Acceptance criteria:**
- [ ] axe-core run inside an e2e test reports 0 violations on Log, History, Report, Letter routes.
- [ ] `prefers-reduced-motion` test asserts no `transition`/`animation` styles are applied on a static element when set.
**Verification:** New e2e spec passes; manual keyboard walkthrough.
**Dependencies:** 6.5.4.
**Files:** `tests/e2e/a11y.spec.ts`, possible CSS tweaks.
**Scope:** S.

### Checkpoint: Phase 8 / Definition of Done
- [ ] All SPEC.md success criteria are checked.
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e` is green.
- [ ] Demoed on a real phone: log a vibration with a measured dB, see it in history, generate and download a report, generate a letter, download Bijlage 1 zip, open the report and the letter from the file system.
- [ ] `SPEC.md` and `PLAN.md` reflect any decisions that changed during the build.
- [ ] **Final human review.**

---

## Risks (carried forward from PLAN.md)

| Risk                                                                | Mitigation                                                                                       |
|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Sensor APIs differ across iOS Safari and Android Chrome             | Hooks are single, mockable entrypoints; covered by tests.                                        |
| IndexedDB quota on iOS Safari (~50 MB)                              | No audio blobs in v1 except as 5s clips (small). Surface a non-blocking warning at 40 MB.        |
| Report / letter HTML must work offline / via `file://`              | All styles inlined by `buildReportHtml` / `buildLetterHtml`; no external assets.                 |
| Future schema migration breaks stored logs                          | IndexedDB store version is part of the contract; document it; first migration is cheap.          |
| Locale regression (English sneaks in)                               | Snapshot tests for `buildReportHtml` and `buildLetterHtml` assert Dutch labels; CI fails.        |
| The 1–5 sterkte bucketing is a design guess, not a regulation       | The letter shows the underlying 1–10 average as well; user can edit the rendered text.          |

## Parallelization Notes

- Tasks within a phase are mostly sequential. Within Phase 4, the three
  sensor hooks (4.2, 4.3, 4.4) are independent and can be built in
  parallel by separate agents, but a single agent is fine.
- Phase 2 tasks (2.4, 2.5, 2.6) are sequential: 2.5 needs 2.4, 2.6 needs
  2.3 + 2.4.
- Phases 5 and 6 can be built in parallel by separate agents if desired,
  as long as they don't both edit the `LogRepository` interface.
