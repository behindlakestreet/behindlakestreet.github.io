# Deploying Overlast Logger

The app builds to a fully static `dist/` directory — no server, no
runtime needed. Any static host works. This guide covers:

1. **GitHub Pages** with GitHub Actions (your choice — free, automatic
   SSL, custom-domain friendly).
2. **Cloudflare Pages** (alternative — free global edge, slightly faster).
3. **Netlify** (alternative — friendlier dashboard).
4. **Local-only static serve** (for LAN demos without HTTPS).
5. **Pre-deploy checklist.**
6. **What's deferred to v2.**

---

## 1. GitHub Pages with GitHub Actions (recommended for you)

GitHub Pages gives you free HTTPS for any `*.github.io` site (or custom
domain) — sensors (mic + motion) work as soon as you deploy. The
project ships a workflow at `.github/workflows/deploy.yml` that builds
and deploys on every push to `main`. No `gh-pages` branch needed.

### One-time setup

1. **Create a repo on GitHub.** Name it anything you like. *Important
   choice*:

   - **User/org site** (cleanest URL): the repo must be named
     **`<your-github-username>.github.io`**. The app will be served at
     `https://<your-username>.github.io/`.
   - **Project site**: any repo name. The app will be served at
     `https://<your-username>.github.io/<repo-name>/`. The workflow
     supports this with one env-var change (see below).

   If you don't have a `<username>.github.io` repo yet, create one. The
   workflow defaults to a user-site deploy (base path `/`).

2. **Push the source.** From the project root:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:<your-username>/<repo-name>.git
   git push -u origin main
   ```

   The push triggers the workflow. It runs `lint`, `typecheck`, `test`,
   then `build`, then deploys `dist/` to Pages.

3. **Enable Pages with GitHub Actions.** In the GitHub UI for your
   repo: **Settings → Pages → Source → GitHub Actions**. (This is the
   default for new repos with a workflow; if you see "Deploy from a
   branch" instead, change it to "GitHub Actions".)

4. **Wait ~2 minutes for the first deploy.** Watch the **Actions**
   tab. When it's green, your site is live at
   `https://<your-username>.github.io/` (or
   `https://<your-username>.github.io/<repo>/`).

5. **(Optional) Custom domain.** Settings → Pages → Custom domain.
   GitHub auto-provisions HTTPS via Let's Encrypt. Add a `CNAME` record
   at your DNS provider pointing to `<your-username>.github.io.`.

### Project-site variant (if you didn't name the repo `<username>.github.io`)

Edit `.github/workflows/deploy.yml` and uncomment these two lines in
the "Build" step:

```yaml
        env:
          VITE_BASE_PATH: /<your-repo-name>/
```

That's it. The workflow will set the Vite base path and rebuild. The
URL stays the same (`https://<username>.github.io/<repo>/`).

### What the workflow does

The shipped workflow (`.github/workflows/deploy.yml`):

- Triggers on `push` to `main` (and on manual dispatch).
- Runs `npm ci`, then `lint`, `typecheck`, `unit tests`, then `build`.
- Uploads the `dist/` artifact to GitHub Pages.
- The deploy job uses `actions/deploy-pages@v4` (the official action).
- Caches `node_modules` to keep CI fast.

If any of `lint`, `typecheck`, or `test` fail, the build is blocked —
the production deploy only ships code that passes all checks. (If you
want to deploy even on test failure, remove the failing steps from
the workflow.)

### What about the `gh-pages` branch option?

The repo also has an `npm run deploy:gh-pages` script as a manual
fallback. It runs `npm run build` then `npx gh-pages -d dist`, which
creates/updates a `gh-pages` branch. The GitHub Actions workflow is
preferred (cleaner, automatic, no local `npm` invocation needed), but
the script is there if you want it.

### HTTPS and sensors

✅ `https://<user>.github.io/...` — TLS via Let's Encrypt, auto-renewed.
All browser APIs (mic, motion, PWA install) work.

To test on a phone: open the deployed URL. Both devices just need
internet access — no LAN IP, no port forwarding.

### SPA routing on GitHub Pages

GitHub Pages serves a real 404 for any path that isn't a file
(`/brief`, `/log`, etc. don't have corresponding files in `dist/`).
The repo ships a `public/404.html` that catches the 404 and
re-launches the SPA with the original path as `?p=<path>`. The
`index.html` script then rewrites `history` to the real path, and
React Router picks it up normally. Hard-refreshing `/brief` lands you
on the Letter page; the URL bar shows `/brief`. Test coverage lives
in `tests/integration/spa-routing.test.ts` and
`tests/e2e/spa-routing.spec.ts`.

### Updating the PWA service worker

The service worker is built into `dist/sw.js` by `vite-plugin-pwa` with
`registerType: 'autoUpdate'`. When you push a new version, users get
the update on their next page load. No special action needed.

---

## 2. Cloudflare Pages (alternative)

Free, fast, no card required. The static build is served from
Cloudflare's edge network (300+ POPs), which makes the report/letter
downloads feel instant from anywhere.

### One-time setup

1. Sign up at <https://dash.cloudflare.com/sign-up> (free).
2. In the sidebar, click **Workers & Pages** → **Create application** →
   **Pages** → **Connect to Git**.
3. Authorize Cloudflare to read your GitHub/GitLab repo and pick
   `overlast_logger`.
4. Configure the build:
   - **Framework preset:** *None* (Vite isn't in the list; treat as static).
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** none required.
5. Click **Save and Deploy**. First deploy takes ~2 min.

Pushes to the configured branch auto-deploy. For preview branches,
each PR gets its own preview URL.

For a custom domain, Pages project → **Custom domains** → set up
`overlast.example.com`. Cloudflare auto-provisions HTTPS.

---

## 3. Netlify (alternative)

Almost identical to Cloudflare Pages but with a friendlier dashboard.

1. Sign up at <https://app.netlify.com/signup>.
2. **Add new site** → **Import an existing project** → pick the repo.
3. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Deploy. Custom domains + HTTPS work the same way.

Free tier: 100 GB bandwidth/mo, 300 build minutes/mo.

---

## 4. Local-only: serve `dist/` from a static file server

For quick demos or LAN testing, you don't need a cloud host at all.
After `npm run build`, the `dist/` directory is self-contained.

```bash
npm run build
npx serve dist                # one-liner, http://localhost:3000
# or
python3 -m http.server --directory dist 8080
```

The downside: HTTPS isn't set up, so sensors won't work in the browser.
Fine for visual demos and testing the form/letter flows; not enough
for real mic/motion testing.

---

## 5. Pre-deploy checklist

Before deploying for real, run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

All should be green. Then spot-check the production preview:

```bash
npx vite preview
```

Open the served URL, walk through:

- Log an entry on `/log` (with sensors if your browser allows).
- Verify it appears in `/geschiedenis`.
- Generate a report on `/rapport` and download the HTML; open it locally.
- Fill in profile + letter on `/brief`; download the letter HTML;
  download the Bijlage 1 ZIP; unzip and check the four files.
- Toggle the theme; reload; check the choice persists.
- Hard-refresh `/brief` directly; verify the URL stays `/brief` (404
  fallback).
- On a phone, open the deployed URL; verify the mic and motion
  sensors work (they require HTTPS, which the cloud hosts give you).

If all that works, you're done.

---

## 6. Things that are *not* part of v1 (deferred to v2)

Documented in `SPEC.md` under "What's deferred to v2":

- Server backend with multi-user + auth.
- Real `.pdf` generation (we ship print-to-PDF via the browser instead).
- Geolocation, push notifications, background sensor capture.
- Hosting audio in the exported report HTML (currently marked as
  "audio clip" in the table; the clip plays back in the history view).

None of these block a v1 deploy. If you find yourself wanting one,
that's a v2 conversation.
