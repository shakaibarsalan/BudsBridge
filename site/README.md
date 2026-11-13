# BudsBridge website

The landing page and download page at **https://budsbridge.vercel.app**. Vite, React and Motion; two static pages, no server.

- `/` shows the dock as a clickable demo (the tiles and `Ctrl+Alt+B` work; Mac visitors see and can press `⌃⌥B`), then the problem, how it works, features, the video and the FAQ. Its main button gives Mac visitors the Mac app when the release has one, and everyone else the Windows installer.
- `/download/` has a Windows / Mac switch that opens on the visitor's system. Windows: the installer and the single `.exe`; Mac: the universal `.dmg` (matched by its `.dmg` suffix) with notes on what differs on a Mac. Each comes with checksums, first-run steps (SmartScreen on Windows, Open Anyway on macOS) and the release notes. Releases from before 0.4.0 have no `.dmg`; the Mac side then says so and links to the releases.

Both pages ask the GitHub API for the newest release when they open, so a new release shows up without a new deploy. `scripts/bake-release.mjs` saves a copy of it into `src/generated/release.json` at build time: that copy is shown first, keeps the SHA-256 checksums, and stays when GitHub can't be reached.

The screenshots and the video come from `../docs/media`, shared with the README.

## Develop

Node.js 22+ and pnpm:

```bash
cd site
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # refreshes the saved release, type-checks, builds dist/
```

## Help chat

The "Ask BudsBridge" chat is a [Halochime](https://halochime.vercel.app) widget. It loads only when `VITE_HALOCHIME_KEY` is set (see `.env`; the key is public by design) and answers only on the hosts allowed for that agent. Its answers come from `knowledge/budsbridge-qa.md`, so update that file when the app changes.

## Deploy

`dist/` is plain static files. It is deployed as is to the `budsbridge` project on Vercel (`vercel.json` in `public/` adds caching and security headers):

```bash
pnpm build
cd dist
vercel deploy --prod
```
