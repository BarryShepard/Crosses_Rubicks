# Cloudflare Pages Deployment

This project hosts the Rubik's Tic-Tac-Toe game as a static Vite site on Cloudflare Pages.

## Cloudflare Pages Settings

- Project type: Pages
- Git provider: GitHub
- Repository: this repository
- Production branch: `master`
- Root directory: `game`
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`

The app does not need Cloudflare Workers, Pages Functions, a database, a tunnel, or a paid plan.

## Local Verification

Run these commands before connecting or redeploying Cloudflare Pages:

```bash
cd game
npm install
npm run test:run
npm run build
npm run preview -- --host 127.0.0.1
```

Open the preview URL printed by Vite and verify:

- The game loads without a blank screen.
- The cube renders.
- Placing a mark works.
- Undo works.
- Reloading the page works.

## Cloudflare Verification

After Cloudflare finishes the first deployment, open the generated `*.pages.dev` URL and verify:

- The page loads from a clean browser session.
- The browser console has no missing asset errors.
- The cube renders.
- Basic gameplay interaction works.
- Reloading the page does not return a 404.

## Common Fixes

- If Cloudflare cannot find `package.json`, confirm the root directory is `game`.
- If Cloudflare builds but the page is blank, confirm the build output directory is `dist`.
- If assets return 404 on the `pages.dev` URL, keep Vite's base path as `/`.
- If Cloudflare deploys old code, confirm the production branch is `master` and the latest commit has been pushed.
