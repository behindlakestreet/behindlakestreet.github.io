# Spec: Overlast Logger (v2)

## Objective

A single-user web application to log and analyze nuisance ("overlast") events
from nearby construction or other sources — primarily **sound** and
**vibrations** — with optional on-device measurements from the phone's
microphone and motion sensors. The app's end goal is to make it easy to
produce a **formal complaint letter to the gemeente**, fully supported by
objective data.

**User story.** As a resident dealing with recurring building-work nuisance, I
want a fast way to record what I felt/heard, when, where, and how bad it was,
including a measured dB, a short vibration reading, and a 5-second audio
clip, so I can generate a credible, data-backed complaint letter to the
gemeente (or a printable report for my own records).

**Success criteria (v1, client-only phase).**

- Logging a new event takes ≤ 10 seconds on a phone browser.
- Each event can carry: type, intensity (1–10), duration, location, free-text
  description, optional measured dB, optional measured vibration (max + avg),
  optional 5-second audio clip.
- History view lists all events with date-range filters, sortable by recency,
  with audio playback inline for entries that have a clip.
- Report view generates a printable HTML report for a date range, with summary
  stats (count, days affected, total minutes, average intensity, day/hour
  distributions) and per-day and per-hour-of-day bar charts. Report is
  downloadable as a self-contained `.html` file.
- **Letter view** generates a fully filled-in draft klachtbrief aan de
  gemeente (see "Klachtbrief Spec" below), print-ready, downloadable as a
  self-contained `.html` file. The "Bijlage 1" archive is downloadable as a
  single `.zip` containing the report HTML, a CSV of all entries, a
  per-period aggregate CSV, and a plain-text summary.
- Data persists locally (IndexedDB) across browser sessions and reloads.
- Works offline after first load (PWA, installable to home screen).
- Dutch UI strings preserved from the reference implementation.

**Out of scope for v1 (client-only phase).** Multi-user, auth, server sync,
sharing, push notifications, geolocation, background sensor capture,
real `.pdf` generation (we ship print-to-PDF instead — see Klachtbrief Spec).

## Tech Stack

| Layer            | Choice                                       | Why |
|------------------|----------------------------------------------|-----|
| Build/dev server | Vite 5                                        | Fast HMR, tiny config, easy static hosting. |
| UI framework     | React 18 + TypeScript                        | Typed domain model (LogEntry, SensorReading), component reuse. |
| Styling          | Tailwind CSS 3                               | Fast iteration, no CSS-file drift; design tokens via `theme.extend`. |
| State            | React state + a thin repository abstraction  | No Redux/Zustand needed at this size. |
| Local persistence| IndexedDB via `idb`                          | Larger quota than localStorage, async, supports audio blobs. |
| Routing          | React Router 6                               | Tab → route mapping (`/log`, `/geschiedenis`, `/rapport`, `/brief`). |
| Charts           | Hand-rolled SVG components                   | Report must be self-contained HTML; no chart lib in the report. |
| ZIP packaging    | `fflate`                                     | Tiny, tree-shakable ZIP for the "Bijlage 1" archive. |
| Testing          | Vitest + @testing-library/react + Playwright | Unit + component + e2e. |
| Lint/format      | ESLint + Prettier + TypeScript strict        | Strict TS catches sensor/API shape drift early. |
| Hosting (later)  | Cloudflare Pages or Vercel                   | Free tier, fits single-user PWA. |
| PWA              | `vite-plugin-pwa`                            | Install-to-home-screen, offline shell. |

**v2 (post-MVP, deferred).** Server backend (likely Node + Fastify + Postgres
via Prisma, or Supabase). API contract designed in v1 via a `LogRepository`
interface so the swap is local.

## Commands

```bash
# Install
npm install

# Develop
npm run dev                 # vite dev server on :5173

# Build
npm run build               # tsc + vite build → dist/
npm run preview             # serve dist/ locally

# Test
npm test                    # vitest run (unit + component)
npm run test:watch          # vitest watch mode
npm run test:e2e            # playwright test
npm run test:coverage       # vitest --coverage

# Quality
npm run lint                # eslint .
npm run lint:fix            # eslint . --fix
npm run typecheck           # tsc --noEmit
npm run format              # prettier --write .
```

## Project Structure

```
overlast_logger/
  SPEC.md                    # this file
  README.md                  # quickstart + how to run
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  playwright.config.ts
  index.html                 # PWA entry
  public/
    favicon.svg
    manifest.webmanifest
  src/
    main.tsx                 # React root + router
    app/
      App.tsx                # layout shell (header, tabs, routes)
      routes/
        LogRoute.tsx
        HistoryRoute.tsx
        ReportRoute.tsx
    components/
      Header.tsx
      TabNav.tsx
      LogForm.tsx
      IntensitySlider.tsx
      LocationSelect.tsx
      SensorPanel.tsx       # mic + vibration buttons
      LogList.tsx
      LogItem.tsx
      DateRangeFilter.tsx
      ReportPreview.tsx
    lib/
      repository/
        types.ts            # LogEntry, LogRepository interface
        idbRepository.ts    # IndexedDB impl
        memoryRepository.ts # for tests/dev
        index.ts            # singleton bound to env
      sensors/
        soundMeter.ts        # getUserMedia + RMS → dB
        vibrationMeter.ts    # DeviceMotionEvent
        permissions.ts       # sensor permission helpers
      report/
        aggregate.ts         # pure: logs → stats
        buildHtml.ts         # pure: logs + stats → standalone HTML
        types.ts
      time/
        format.ts            # nl-NL date/time formatters
      id.ts
    hooks/
      useRepository.ts
      useLogs.ts
      useSoundMeter.ts
      useVibrationMeter.ts
    styles/
      index.css              # tailwind directives + base
    types/
      domain.ts              # LogEntry, SensorReading, LogType
  tests/
    unit/
      aggregate.test.ts
      buildHtml.test.ts
      format.test.ts
    component/
      LogForm.test.tsx
      LogList.test.tsx
    e2e/
      log-flow.spec.ts
      report-flow.spec.ts
```

## Domain Model

```ts
// src/types/domain.ts
export type LogType = 'trilling' | 'geluid' | 'beide';

export interface VibrationReading {
  max: number;   // m/s²
  avg: number;   // m/s²
  durationMs: number;
  sampleCount: number;
}

export interface AudioClip {
  mimeType: string;              // e.g. 'audio/webm;codecs=opus'
  durationMs: number;            // actual recorded length
  sampleRate: number;            // Hz
  blob: Blob;                    // raw audio bytes
}

export interface LogEntry {
  id: string;                    // ULID/uid
  timestamp: string;             // ISO 8601, UTC
  type: LogType;
  intensity: number;             // 1..10
  durationMinutes: number;       // >= 1
  location: string;              // from fixed list (v1) or free text
  description: string;           // free text, may be empty
  soundDb?: number;              // measured peak/average dB, optional
  vibration?: VibrationReading;  // measured, optional
  audioClip?: AudioClip;         // optional short recording
  createdAt: string;             // ISO 8601
}
```

Repository contract:

```ts
export interface LogRepository {
  list(): Promise<LogEntry[]>;
  add(entry: Omit<LogEntry, 'id' | 'createdAt'>): Promise<LogEntry>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Code Style

TypeScript strict mode. Functional React components, hooks for state and side
effects. Pure logic (aggregation, HTML generation, formatters) lives in `lib/`
and is unit-tested without React.

**Naming.** Components `PascalCase`, hooks `useXxx`, pure functions `camelCase`,
constants `UPPER_SNAKE` only for true compile-time constants. Files mirror the
export (`LogForm.tsx` exports `LogForm`).

**Example — typical component:**

```tsx
import { useState, type FormEvent } from 'react';
import { useRepository } from '../hooks/useRepository';
import type { LogType, LogEntry } from '../types/domain';

export function LogForm() {
  const repo = useRepository();
  const [type, setType] = useState<LogType>('trilling');
  const [intensity, setIntensity] = useState(5);
  // ...

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entry: Omit<LogEntry, 'id' | 'createdAt'> = { /* ... */ };
    await repo.add(entry);
    // reset, flash, etc.
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* ... */}
    </form>
  );
}
```

**Example — pure aggregation function (unit-tested):**

```ts
// src/lib/report/aggregate.ts
import type { LogEntry } from '../../types/domain';

export interface Aggregate {
  count: number;
  days: number;
  totalDuration: number;
  avgIntensity: number;
  byType: Record<LogType, number>;
  byDay: Record<string, number>;  // 'YYYY-MM-DD' → count
  byHour: number[];               // length 24
}

export function aggregate(logs: readonly LogEntry[]): Aggregate {
  // ...
}
```

**Formatting.** Prettier defaults. 2-space indent. Single quotes. Trailing
commas. No semicolon debates — Prettier decides.

**i18n.** Dutch strings live inline in components for v1 (matching the
reference). If we ever need English, we'll extract to `lib/i18n/nl.ts`.

## Testing Strategy

| Level       | Tool                       | What lives here                              |
|-------------|----------------------------|----------------------------------------------|
| Unit        | Vitest                     | `aggregate`, `buildHtml`, `format`, `id`, sensor math |
| Component   | Vitest + @testing-library  | Form behavior, list rendering, filter wiring |
| E2E         | Playwright                 | Full log → history → report flow, mobile viewport |

**Coverage target:** ≥ 80% lines on `lib/`, ≥ 60% overall. Report HTML
generation is the most important thing to test — every chart branch needs a
fixture.

**Test discipline.**
- Pure logic gets a unit test before implementation (TDD).
- New behavior = new failing test first.
- E2E tests cover critical paths only; rely on unit/component tests for
  branches.

## PWA & Sensors

- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, precaching the app
  shell. Data lives in IndexedDB, not in the cached shell, so clearing cache
  must NOT wipe logs.
- Mic capture uses `navigator.mediaDevices.getUserMedia({ audio: true })`.
  Graceful fallback: if denied or unavailable, the button shows "geen
  toegang" and the form remains usable.
- Vibration uses `window.addEventListener('devicemotion', …)`. On iOS 13+ this
  requires `DeviceMotionEvent.requestPermission()` — handle the gesture-gated
  prompt from the button click. Fallback: "geen sensor".
- All sensor access is opt-in per measurement, never automatic on page load.

## Audio Clip Spec

Each event may carry a short audio recording (~5 seconds) captured from the
device microphone. This is a **nice-to-have** for v1 but in scope.

**Behavior.**
- New "Neem geluid op (5s)" button in `SensorPanel`, alongside the existing
  "Meet geluid (dB)" button. **Recording and dB-measurement are independent
  passes** (two separate `getUserMedia` calls). Recording is optional even
  when dB is measured, and vice versa. If we ever unify them in a future
  version, the dB value to report would be *both* peak and average across
  the captured window — captured here as a deferred decision.
- Uses `MediaRecorder` over a `getUserMedia({ audio: true })` stream.
  Preferred MIME type: `audio/webm;codecs=opus` (Chrome, Android).
  Fallback: whatever the browser reports as the first supported type
  (`MediaRecorder.isTypeSupported`). If `MediaRecorder` is unavailable
  entirely (older Safari), the button is hidden or shows "niet ondersteund".
- Duration: 5 seconds (configurable in code, not in UI for v1).
- Visual feedback: button label cycles "Neem geluid op" → "Opnemen… 3s"
  (live countdown) → "Opgeslagen" with the resulting duration shown.
- The resulting `Blob` is stored alongside the entry in IndexedDB. We store
  the raw `Blob` (no base64) to keep storage efficient.

**Storage impact.**
- 5s Opus at ~32 kbps ≈ 20 KB per entry. ~2,500 entries fit in 50 MB
  IndexedDB quota. Acceptable for v1. Surface a non-blocking warning if
  estimated total audio storage exceeds, say, 40 MB.

**Permissions.**
- Recording requests the microphone the first time it's pressed in a
  session; subsequent presses reuse the granted permission. We do not
  pre-request mic on page load.
- If permission is denied, the button shows "geen toegang" and the entry
  can still be saved without a clip.

**Playback in history.**
- `LogItem` renders an `<audio controls src={objectUrl(entry.audioClip.blob)}>`
  for any entry that has a clip. Object URLs are revoked on unmount.

**Report HTML.**
- The downloadable report does **not** embed audio (keeps the file small
  and `file://`-portable). For entries with a clip, the report shows
  "audio clip" in the Geluid column as a marker. A future server-backed
  v2 can attach hosted audio links in the report.

## Boundaries

**Always.**
- Run `npm run lint && npm run typecheck && npm test` before declaring a task
  done.
- Preserve Dutch UI strings; do not silently translate.
- Validate sensor readings (clamp `dB >= 0`, `intensity` in 1..10,
  `durationMinutes >= 1`).
- Use the `LogRepository` interface — never call `idbRepository` directly
  from components.
- Keep `aggregate` and `buildHtml` pure (no DOM, no IndexedDB, no `Date.now`
  except via an injected `now()` for tests).

**Ask first.**
- Adding a new dependency (especially anything > 50 kB gzipped).
- Adding a new top-level route or page.
- Changing the IndexedDB schema in a non-backwards-compatible way (bump the
  store version + write a migration).
- Touching the report HTML template (it must stay self-contained and
  printable).

**Never.**
- Commit secrets, API keys, or `.env` files.
- Auto-grant sensor permissions on page load.
- Ship a feature with failing tests.
- Add comments unless the code's intent is non-obvious (and the spec didn't
  cover it).
- Modify `node_modules` or vendor directories.

## Report Output Spec

The report is a **standalone** HTML file. It must:

- Open correctly via `file://` (no external CDN, no relative paths beyond
  inlined styles).
- Use the same Dutch labels as the app.
- Include: period header, summary stats grid, type breakdown list, per-day
  bar chart, per-hour bar chart, full table of entries.
- Be print-friendly (white background, no nav chrome).
- Filename: `overlast-rapport-YYYY-MM-DD.html`.

## Klachtbrief Spec (Complaint Letter)

A fourth primary view of the app: a fully filled-in **klachtbrief aan de
gemeente** (complaint letter to the municipal authorities), generated from
the logged events. The user can review the autofilled text, edit anything
that's specific to their situation, and then print to PDF for sending.

The reference for tone, structure, and legal framing is the included
`example_letter.md` in this folder. The generated letter is **not** a
verbatim copy of the example — it's a templated version that fills in the
quantitative section (paragraaf 2a) from the user's logged data.

**Trigger.** A new tab "Brief" (route `/brief`), in addition to Log,
Geschiedenis, Rapport.

**Inputs (autofilled from app data, user can override).**

- Verzoeker: name, address, postcode, plaats, phone, email.
  Stored once in a small "Profiel" panel (IndexedDB, single key, not per
  entry). Profile is empty by default; the letter view surfaces a prompt
  to fill it in if blank.
- Adres bron: street + house number of the noise source (free text,
  per-letter, not in profile).
- Periode omschrijving: free text ("sinds circa [datum]").
- Korte omschrijvingen (up to 5 bullet points, free text).
- Frequentie: free text.
- Duur per keer: free text.
- Recipient block: gemeente naam, postbus, postcode, plaats. Either
  stored in the profile (one-time entry) or entered per-letter.
- Plaats + datum of the letter: defaults to `new Date()`, user can
  override.

All non-data inputs (recipient block, omschrijvingen, etc.) are **kept in
form state on the letter view** and are *not* persisted. This is
deliberate: complaint letters are case-specific and the user shouldn't be
locked into a previous letter's framing.

**Quantitative section (paragraaf 2a).** Fully derived from logged data
for the selected date range:

- Totaal aantal minuten overlast (= sum of `durationMinutes`)
- Aantal dagen met overlast (= `agg.days`)
- Gemiddeld per overlast-dag (= `totalDuration / days`, rounded)
- Gemiddelde sterkte-inschatting (1–5): derived from the app's 1–10
  intensity. **Mapping (v1, fixed):** `bucket = ceil(intensity / 2)`, so
  intensity 1→1, 2→1, 3→2, 4→2, …, 9→5, 10→5. The reported number is the
  average of bucketed values across entries, rounded to 1 decimal.
  - Rationale: keeps continuity with the reference app's 1–10 scale in
    the data, while producing the same 1–5 metric the example letter
    uses, which Dutch gemeenten are more familiar with for
    sterkte-inschattingen.
- Aandeel in de nacht (22:00–07:00): percentage of minutes that fall in
  the night window. Computed per entry (clipped to the window if it
  spans the boundary, or simply: minutes whose timestamp hour is in
  `22..23 ∪ 0..6`).
- Zwaarste dag: the day with the most minutes; reports the date and the
  total minutes for that day.
- Top-5 zwaarste dagen: same data, sorted desc.
- Verdeling per type: "Bouw / muziek / gebonk" mapped from
  `LogType`: `trilling` → "trillingen / gebonk", `geluid` → "muziek /
  continu geluid", `beide` → "combinatie". (The mapping is a
  best-effort guess based on the example letter's buckets; the user can
  edit the rendered text.)

The quantitative section is generated by a **pure function** in
`src/lib/letter/summary.ts` that takes the same `aggregate()` output plus
the raw `LogEntry[]` and returns the string block to drop into paragraaf
2a. This function is unit-tested with fixtures that include the exact
numbers from the example letter so we can prove the output matches.

**Letter body.** Templated with placeholders. The template lives in
`src/lib/letter/template.ts` as a function
`(input: LetterInput) => string` returning the full letter body in HTML
(print-ready, all CSS inlined, no nav chrome). The template mirrors the
structure of `example_letter.md` (sections 1–8 + verzendadvies), but is
rephrased to make autofill natural.

**Output.**

- Preview: an `<iframe srcdoc>` rendering the letter, same pattern as the
  report view. Two-way: edits in the form on the left update the
  preview on the right.
- Download: a single self-contained `.html` file
  (`klachtbrief-[straat]-[YYYY-MM-DD].html`) that the user opens in
  their browser and prints via `Cmd/Ctrl+P → Save as PDF`. This avoids
  bundling a heavy PDF library in v1.
- "Bijlage 1 downloaden" button: produces a `.zip` containing:
  - `overlast-rapport-YYYY-MM-DD.html` (the existing report)
  - `logboek.csv` — one row per entry with `datum,tijd,type,sterkte_1_10,sterkte_1_5,duur_min,locatie,geluid_db,trilling_max_ms2,trilling_avg_ms2,heeft_audio,omschrijving`
  - `logboek-aggregaat.csv` — the same `Aggregate` shape flattened
  - `logboek-samenvatting.txt` — the same string used in paragraaf 2a
  Filename: `bijlage-1-overlast-YYYY-MM-DD.zip`.

**Tested.**

- Unit tests for `summary.ts` with the example letter's fixture numbers.
- Unit test for the template: required sections present, recipient block
  appears, all placeholders are filled, no `{{...}}` remains.
- Playwright e2e: fill profile, fill letter inputs, generate letter,
  verify the iframe srcdoc contains the autofilled data, click
  "Bijlage 1 downloaden" and assert the zip parses and contains the
  expected files.

## Migration Path to v2 (Server Backend)

The `LogRepository` interface is the seam. Steps when the time comes:

1. Add `restRepository.ts` that implements the same interface against a
   future API.
2. Add a sync layer (outbox + last-sync timestamp) — out of scope for v1 but
   the data model already carries `createdAt` so it's cheap.
3. Add a thin auth layer; the single-user assumption still holds.
4. Host backend on Fly.io / Railway / a small VPS.

This is documented here so v1 decisions don't paint us into a corner.

## Hosting Recommendation

When we get to deployment, three options are realistic for a static
single-user PWA like this:

| Provider         | Free tier                       | Why it fits / doesn't                                                                                       |
|------------------|---------------------------------|-------------------------------------------------------------------------------------------------------------|
| **Cloudflare Pages** | Unlimited static sites, ~500 builds/mo, global edge | Cheap, fast, plays well with the future backend (Workers/D1/R2 on the same platform). **Recommended.** |
| **Vercel**       | Generous free tier for static   | Great DX, but most value is locked behind pairing with Vercel serverless — overkill for v1.                  |
| **Netlify**      | 100 GB bandwidth/mo free        | Fine, but Cloudflare is cheaper at scale and has a clearer path to a serverless backend.                    |

**Recommendation: Cloudflare Pages.** It's the cheapest of the three, serves
from a global edge, and keeps the door open to a serverless backend on the
same platform (Workers + R2 for audio storage) when v2 lands. No action
needed for v1; the build is fully static and will deploy to any of the
three.

## Open Questions

1. **Locations.** ✅ Keep the fixed Dutch list from the reference for v1
   (Woonkamer, Slaapkamer, Keuken, Badkamer, Hal, Zolder, Kelder, Tuin).
   List is editable/configurable later.
2. **Audio recording.** ✅ **Yes — attach a short audio clip per event.** Add
   to v1 scope. See "Audio Clip Spec" below. The `LogEntry` shape already
   supports this with an additive `audioClip?: AudioClip` field.
3. **PWA install.** ✅ Nice-to-have. Ship with `vite-plugin-pwa` since it's
   cheap, but treat it as polish, not a blocker.
4. **Hosting.** ✅ No provider preference; will choose when we get there.
   Recommendation is captured under "Hosting Recommendation" below.

## Success Criteria (recap)

v1 is done when:

- [ ] `npm run dev` boots, app is usable on a phone browser.
- [ ] All three tabs (Log, Geschiedenis, Rapport) function as specified.
- [ ] Measured sound + vibration work on a recent iPhone Safari and a
      recent Android Chrome (or fall back gracefully with a clear message).
- [ ] Generated report HTML opens via `file://` and prints cleanly.
- [ ] Lint, typecheck, tests all pass; coverage target met.
- [ ] Lighthouse PWA audit ≥ 90.
- [ ] Spec is updated if any decision changed during implementation.
