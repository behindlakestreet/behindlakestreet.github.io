# Plan: Overlast Logger v2

> Companion to `SPEC.md`. This is the technical plan; the spec is the source
> of truth for *what* and *why*. The plan is for *how* and *in what order*.

## Goal

Rebuild the vanilla-JS reference (`index.html` + `app.js` + `styles.css`) as
a typed, tested, PWA-capable React app, while preserving all v1 behavior,
adding optional audio-clip capture, and adding a **klachtbrief aan de
gemeente** (complaint letter) view that turns the logged data into a
print-ready letter and a downloadable "Bijlage 1" ZIP archive.

## High-level approach

1. **Scaffold** the Vite + React + TS + Tailwind project with the agreed
   structure. Get a green test pipeline before writing any feature code.
2. **Port the domain & persistence** (`LogEntry`, `LogRepository`,
   `idbRepository`, `memoryRepository`, `Profile` for the letter) and
   prove the round-trip with a unit test before touching the UI.
3. **Port the pure logic first** (`format`, `aggregate`, `buildHtml`,
   `summaryForLetter`, `buildLetterHtml`, `buildBijlage1Zip`) with TDD.
   This is the highest-leverage, most testable code, and the report and
   letter must work even if the UI is rough.
4. **Port the UI** in the same order as the reference, plus the new
   Letter view: tab nav → log form → sensor panel → history list →
   report preview → letter view.
5. **Add PWA shell** once the app is feature-complete in dev.
6. **Add e2e tests** for the critical log → history → report → letter
   flow.

The order is deliberately "pure → data → UI → shell" so each layer is
exercised by tests below it before the next layer is built.

## Phases & Checkpoints

### Phase 0 — Scaffold (no behavior yet)

Deliverable: a project that boots, lints, typechecks, and runs an empty
Vitest + Playwright suite.

- `npm create vite@latest` with `react-ts` template, then trim defaults.
- Add Tailwind, ESLint, Prettier, Vitest, Testing Library, Playwright.
- Set up `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`.
- Configure `vite.config.ts` with the `@/` alias to `src/`.
- Add an empty `App.tsx` that renders "Overlast Logger" so the dev server
  has something to show.

**Verify.** `npm run dev` serves the page, `npm test` runs (zero tests is
fine), `npm run lint && npm run typecheck` clean.

### Phase 1 — Domain & persistence

Deliverable: `LogRepository` interface + two implementations (IndexedDB,
in-memory) and a passing round-trip test. Plus a `Profile` store for the
letter view's autofill data.

- `src/types/domain.ts` — `LogType`, `VibrationReading`, `AudioClip`,
  `LogEntry` (the entry shape now includes the optional `audioClip` field
  per the updated spec), `Profile` (verzoeker + recipient block).
- `src/lib/repository/types.ts` — `LogRepository` interface.
- `src/lib/repository/memoryRepository.ts` — in-memory, for tests + dev.
- `src/lib/repository/idbRepository.ts` — IndexedDB via `idb`, store name
  `overlast_logs_v1`, key path `id`, index on `timestamp`. The store value
  shape mirrors `LogEntry`; `Blob` fields are stored as-is (IndexedDB
  supports `Blob` natively).
- `src/lib/repository/profileRepository.ts` — separate small store, one
  record keyed by `'default'`. `getProfile()` returns `Profile | null`,
  `saveProfile(p)` overwrites.
- `src/lib/repository/index.ts` — selects impl by `import.meta.env.MODE`
  (in-memory under test, IndexedDB in dev/prod).
- `src/lib/id.ts` — ULID-ish id generator (same shape as the reference's
  `uid()` is fine; we'll upgrade to a real ULID if we ever need sortable
  client ids).

**Verify.** Unit test: add 3 entries (one with an `audioClip` blob fixture),
list returns them in insertion order, remove by id works, clear empties the
store. Profile save/get round-trip. Tests run against `memoryRepository`;
`idbRepository` is exercised via Playwright later.

### Phase 2 — Pure logic (TDD)

Order: `format` → `aggregate` → `buildHtml` → `letter/summary` →
`letter/template` → `letter/bijlage1`. Each is fully unit-tested before
moving on.

- `src/lib/time/format.ts` — `fmtDate`, `fmtDateOnly` (Dutch locale,
  identical behavior to reference).
- `src/lib/report/aggregate.ts` — `aggregate(logs)` returns the shape in
  the spec. Pure, no `Date.now()`.
- `src/lib/report/buildHtml.ts` — `buildReportHtml(logs, agg)` returns a
  self-contained HTML string. All CSS inlined. No external assets.
- `src/lib/letter/summary.ts` — `summaryForLetter(logs, agg)` returns
  the paragraaf 2a string block. Pure, derived entirely from
  `LogEntry[]` + `Aggregate`. Includes the 1–10 → 1–5 bucketing
  (`bucket = ceil(intensity / 2)`).
- `src/lib/letter/template.ts` — `buildLetterHtml(input)` returns a
  self-contained, print-ready HTML string. Mirrors the structure of
  `example_letter.md` (sections 1–8 + verzendadvies). All CSS inlined.
- `src/lib/letter/bijlage1.ts` — `buildBijlage1Zip(period, logs, agg,
  reportHtml, summary)` returns a `Uint8Array` zip containing the
  four files listed in the spec. Uses `fflate` (sync API for simplicity
  in browser context).

**Verify.** Unit tests cover:
- `format`: empty date, ISO round-trip, locale options.
- `aggregate`: empty input, mixed types, multi-day, hour distribution.
- `buildHtml`: empty state, single entry, many entries (chart branches),
  special-character escaping in description, that the output opens via
  `file://` (Playwright check: load the file, assert key strings render).
- `summaryForLetter`: a fixture matching the example letter's exact
  numbers (`1.805 min`, `12/12 dagen`, `gem. 3,6 / 5`, `48% nacht`,
  `420 min` on `2026-06-05`) — proves the function reproduces the
  example.
- `buildLetterHtml`: required Dutch section headings present, recipient
  block appears when filled, no `{{...}}` placeholders remain in the
  output, special characters in omschrijvingen are HTML-escaped.
- `buildBijlage1Zip`: zip parses, contains the four expected filenames,
  `logboek.csv` has the expected header row, `logboek-aggregaat.csv`
  has the right keys.

### Phase 3 — UI shell & routing

- `src/main.tsx` + `src/app/App.tsx` — header, sticky `TabNav`, route
  outlet.
- `src/components/TabNav.tsx` — four tabs: Log, Geschiedenis, Rapport,
  Brief. URL-driven via React Router (`/log`, `/geschiedenis`,
  `/rapport`, `/brief`).
- Hooks: `useRepository`, `useLogs` (reads via repo, exposes
  `add`/`remove`/`clear`), `useProfile` (reads/writes the single
  profile record).
- Empty placeholder routes.

**Verify.** `npm run dev` shows four tabs; clicking each switches route.
Component test for `TabNav` active state.

### Phase 4 — Log form + sensors

Order: form first without sensors, then sensor panel (dB + vibration),
then audio clip recording.

- `LogForm.tsx` — fields from the reference: type (radio), intensity
  (1–10), duration (minutes, ≥ 1), location (select, fixed list from
  reference), description (textarea). On submit, build `LogEntry`,
  persist, flash "Opgeslagen ✓" on the button, reset description +
  sensor values + any recorded audio clip.
- `IntensitySlider.tsx` — controlled, displays live value.
- `LocationSelect.tsx` — fixed list in Dutch: Woonkamer, Slaapkamer,
  Keuken, Badkamer, Hal, Zolder, Kelder, Tuin.
- `SensorPanel.tsx` + `useSoundMeter` + `useVibrationMeter` +
  `useAudioRecorder`:
  - Sound: `getUserMedia({ audio: true })` → AudioContext → AnalyserNode
    → RMS over ~2s → dB. Same math as reference
    (`20*log10(rms) + 90`), but clamped to `≥ 0`. Stops the stream on
    finish. Fallback string: "geen toegang".
  - Vibration: `devicemotion` listener, sample for 3s, compute
    `max` and `avg` of `||a||`. On iOS 13+, call
    `DeviceMotionEvent.requestPermission()` from the click handler.
    Fallback: "geen sensor".
  - Audio clip (new): "Neem geluid op (5s)" button using `MediaRecorder`
    on a fresh `getUserMedia({ audio: true })` stream. Preferred MIME
    `audio/webm;codecs=opus`, fallback to `MediaRecorder.isTypeSupported`
    selection, hidden if `MediaRecorder` is unavailable. Live countdown
    in the button label. Result is a `Blob` attached to the next submit
    as `audioClip`. Independent from the dB measurement pass (per user
    decision); both can be present, neither, or just one.
  - Sensor readings + audio clip are stored in component state and
    attached to the next submitted `LogEntry`.

**Verify.**
- Component test: submitting the form calls `repo.add` with the right
  shape (including `audioClip` when present), clears description, flashes
  the button.
- Hook tests: `useSoundMeter` rejects when permission is denied, sets
  result on success (mock `getUserMedia`). `useAudioRecorder` produces a
  `Blob` of the expected MIME and roughly the expected duration (mock
  `MediaRecorder`).
- Manual: log an event on a phone with both a dB reading and a 5s clip,
  confirm both persist across reload and the clip plays back in history.

### Phase 5 — History

- `DateRangeFilter.tsx` — two date inputs + apply/clear buttons.
- `LogList.tsx` + `LogItem.tsx` — render entries in reverse-chronological
  order, color-coded left border by type (matches CSS variables in the
  reference). Delete button per item, with `confirm()`. For entries with
  an `audioClip`, render an `<audio controls>` whose `src` is an
  `URL.createObjectURL(blob)`; revoke the URL on unmount.
- Filter logic: same inclusive `from` / `to` semantics as the reference
  (`to + 'T23:59:59'` upper bound).

**Verify.** Component test: renders empty state, renders sorted list,
filter narrows results, delete removes from the visible list and from
the repo, audio control renders when a clip is present and the object
URL is revoked on unmount.

### Phase 6 — Report

- `ReportPreview.tsx` — an `<iframe>` whose `srcdoc` is the output of
  `buildReportHtml(filtered, aggregate(filtered))`. Same
  date-range controls as history.
- Buttons:
  - `Genereer rapport` — regenerate preview.
  - `Download HTML` — blob → object URL → `<a download>` with filename
    `overlast-rapport-YYYY-MM-DD.html`.
  - `Wis alle data` — `confirm()` → `repo.clear()`.

**Verify.**
- Component test: iframe `srcdoc` contains expected Dutch labels and
  entry rows for a fixture.
- Playwright test: generate a report with seeded entries, download it,
  open the file via `file://`, assert key strings are present and that
  no external network requests are made.

### Phase 6.5 — Letter (klachtbrief)

Larger than the other phases because it adds a whole new view. Build in
this order: profile panel → letter form → live preview → bijlage 1 zip
download.

- `ProfilePanel.tsx` (lives inside the Letter route) — collapsible
  panel with name, address, postcode, plaats, phone, email, recipient
  block (gemeente naam, postbus, postcode, plaats). Reads/writes via
  `useProfile`. Renders an empty-state hint when no profile is set yet.
- `LetterForm.tsx` — case-specific inputs the user fills in per
  letter: adres bron, periode omschrijving, up to 5 omschrijving
  bullets, frequentie, duur per keer, datum van de brief (default
  `vandaag`). All form state lives in component state, not in the
  repo (letters are case-specific).
- `LetterPreview.tsx` — an `<iframe srcdoc>` rendered from
  `buildLetterHtml({ profile, letterInputs, summary, period })`.
  Updates live as the user types.
- Download buttons:
  - `Download brief (HTML)` — `Blob` of the iframe's current
    `srcdoc`, filename
    `klachtbrief-${slug(straat)}-${YYYY-MM-DD}.html`.
  - `Download Bijlage 1 (ZIP)` — calls `buildBijlage1Zip(...)`,
    downloads as `bijlage-1-overlast-${YYYY-MM-DD}.zip`. Disabled
    with a tooltip when there are no entries in the period.
- "Bekijk samenvatting" expandable above the form: renders the
  paragraaf 2a text the user is about to send, so they can sanity-check
  the numbers before generating the letter.

**Verify.**
- Component test: typing in the form updates the iframe `srcdoc`
  (assert a unique string from the typed input appears).
- Component test: download buttons are disabled when no entries / no
  profile, enabled otherwise.
- Playwright e2e: fill profile, fill letter inputs with the
  example-letter scenario, generate letter, assert the iframe contains
  the autofilled name, address, and the paragraaf 2a numbers. Then
  click "Download Bijlage 1", assert the resulting blob parses as a
  zip and contains all four expected files.

### Phase 7 — PWA shell

- Install `vite-plugin-pwa`, configure `registerType: 'autoUpdate'`,
  precaching the app shell, runtime caching not needed for v1.
- Add `public/manifest.webmanifest` (name, short_name, theme color,
  icons).
- Add a `public/favicon.svg` and an `apple-touch-icon`.

**Verify.**
- `npm run build && npm run preview` — DevTools → Application shows a
  valid service worker, manifest is installable.
- Lighthouse PWA audit ≥ 90.

### Phase 8 — Polish & e2e

- Empty/loading/error states for the repository hook.
- Keyboard accessibility: form fields are labelable, the tab nav is
  navigable by keyboard.
- `prefers-reduced-motion` respected (the chart bars don't need to
  animate, but if we add any, gate it).
- Playwright e2e:
  1. `log-flow.spec.ts` — open app, fill form with a measured dB,
     submit, see entry in history.
  2. `report-flow.spec.ts` — seed entries (via repo helper), open
     report tab, generate, download, assert file contents.

## Risks & Mitigations

| Risk                                                                | Mitigation                                                                                       |
|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Sensor APIs differ across iOS Safari and Android Chrome             | `useSoundMeter` / `useVibrationMeter` each have a single, mockable entrypoint; cover with tests.  |
| IndexedDB quota on iOS Safari (~50 MB)                              | Don't store audio blobs in v1; spec excludes them. Plan for v2 with a server or chunked cleanup. |
| Report HTML needs to work offline / via `file://`                   | All styles inlined in `buildReportHtml`; no relative asset paths.                               |
| Future schema migration breaks stored logs                          | IndexedDB store version is part of the contract; document it; first migration is cheap.          |
| Locale regression (English sneaks in)                               | Snapshot test on `buildReportHtml` for a fixture includes Dutch labels; CI fails on change.      |

## Parallelization

Most phases are sequential because each builds on the layer below it. Within
Phase 4, the form and the sensor hooks can be built in parallel by two
agents if you want, but a single agent is fine for this size.

## Definition of Done (v1)

- All success criteria in `SPEC.md` are checked.
- `npm run lint && npm run typecheck && npm test && npm run test:e2e` is
  green.
- The app is demoed on a real phone: log a vibration with a measured dB,
  see it in history, generate and download a report, reopen the report
  from the file system.
- `SPEC.md` is updated to reflect any decisions that changed during the
  build.
