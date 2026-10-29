# BudsBridge website

The landing page and download page at **https://budsbridge.vercel.app**. Vite, React and Motion; two static pages, no server.

- `/` shows the dock as a clickable demo (the tiles and `Ctrl+Alt+B` work), then the problem, how it works, features, the video and the FAQ.
- `/download/` offers the installer and the single `.exe` with checksums, first-run steps and the release notes.

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

The "Ask BudsBridge" chat is a [Talkfront](https://talkfront-ai.vercel.app) widget. It loads only when `VITE_TALKFRONT_KEY` is set (see `.env`; the key is public by design) and answers only on the hosts allowed for that agent. Its answers come from `knowledge/budsbridge-qa.md`, so update that file when the app changes.

## Deploy

`dist/` is plain static files. It is deployed as is to the `budsbridge` project on Vercel (`vercel.json` in `public/` adds caching and security headers):

```bash
pnpm build
cd dist
vercel deploy --prod
```
