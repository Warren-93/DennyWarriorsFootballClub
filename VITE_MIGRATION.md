# Denny Warriors FC - React Frontend (Vite, Vercel-ready)

Vite-migrated copy of the original Create React App project. All files in `src/` are unchanged - the migration is purely toolchain.

## What changed vs the CRA version

- `react-scripts` -> `vite` + `@vitejs/plugin-react`.
- Entry: `src/main.jsx` (replaces `src/index.js`).
- HTML moved to project root: `/index.html` (was `public/index.html`).
- `%PUBLIC_URL%` substitutions gone - `runtime-config.js` is loaded from `/runtime-config.js`.
- `vite.config.js` keeps `.js` files containing JSX working without renaming, and bridges
  `process.env.REACT_APP_*` references in `src/api/client.js` so existing code runs unmodified.
- Default dev port still 3000.
- Build output stays in `build/` (override in `vite.config.js` if you prefer `dist/`).

## Local development

```
npm install
npm run dev
```

http://localhost:3000

## Build

```
npm run build
```

Output: `build/`.

## Deploying to Vercel

1. Push this folder to GitHub.
2. https://vercel.com -> New Project -> import the repo.
3. Vercel auto-detects Vite. If not, set:
   - Build command:  `npm run build`
   - Output dir:     `build`
4. Deploy.

## Why migrate from CRA?

- Dev server starts in ~300 ms vs ~10 s on CRA.
- Smaller production bundle (Rollup vs webpack 5).
- CRA is no longer maintained; Vite is the modern default.

## API config

`public/runtime-config.js` still drives the API URL at runtime - same as the CRA version.
Edit it and redeploy to point at a different backend.