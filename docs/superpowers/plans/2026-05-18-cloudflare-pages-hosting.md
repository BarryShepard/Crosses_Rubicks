# Cloudflare Pages Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Rubik's Tic-Tac-Toe Vite game deployable to Cloudflare Pages with a persistent free public URL.

**Architecture:** Publish the existing Vite/React game from a stable `game/` directory in the main repository. Cloudflare Pages will use `game/` as its root directory, run `npm run build`, and serve the generated `dist` directory. No backend, tunnel, paid service, worker, or serverless function is needed.

**Tech Stack:** Vite 6, React 18, TypeScript, Three.js, Vitest, Playwright, Cloudflare Pages static hosting.

---

## File Structure

- Create: `game/`
  - Stable copy of the current Vite app from `.worktrees/rubiks-tic-tac-toe`.
  - Include source files, tests, Vite config, TypeScript config, Playwright config, package manifest, and lockfile.
  - Exclude `.git`, `node_modules`, `dist`, `test-results`, `playwright-report`, `.superpowers`, and nested `.worktrees`.
- Modify: `.gitignore`
  - Keep generated dependency/build/test artifacts ignored at the repository level.
- Create: `docs/deployment/cloudflare-pages.md`
  - User-facing deployment instructions with exact Cloudflare Pages settings.

Important source-state note: `.worktrees/rubiks-tic-tac-toe` currently has uncommitted changes in `src/components/CubeScene.tsx` and `src/components/CubeScene.test.tsx`. The copy step must preserve the current file contents from disk, not only committed branch contents.

---

### Task 1: Copy The Game Into A Stable Publish Directory

**Files:**
- Create: `game/index.html`
- Create: `game/package.json`
- Create: `game/package-lock.json`
- Create: `game/playwright.config.ts`
- Create: `game/tsconfig.json`
- Create: `game/tsconfig.node.json`
- Create: `game/vite.config.ts`
- Create: `game/e2e/game.spec.ts`
- Create: `game/src/**`
- Modify: `.gitignore`

- [ ] **Step 1: Confirm the source worktree still contains the game**

Run:

```bash
find .worktrees/rubiks-tic-tac-toe -maxdepth 2 -type f | sort | sed -n '1,120p'
```

Expected: output includes `package.json`, `vite.config.ts`, `index.html`, `src/App.tsx`, and `e2e/game.spec.ts`.

- [ ] **Step 2: Confirm existing uncommitted worktree changes before copying**

Run:

```bash
git -C .worktrees/rubiks-tic-tac-toe status --short
```

Expected: if the current state has visual work in progress, output includes:

```text
 M src/components/CubeScene.test.tsx
 M src/components/CubeScene.tsx
```

If additional modified files appear, preserve them in the copy as well.

- [ ] **Step 3: Copy current disk contents into `game/`**

Run:

```bash
mkdir -p game
rsync -a \
  --exclude '.git' \
  --exclude '.superpowers' \
  --exclude '.worktrees' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'test-results' \
  --exclude 'playwright-report' \
  .worktrees/rubiks-tic-tac-toe/ game/
```

Expected: `game/package.json`, `game/src/App.tsx`, `game/src/components/CubeScene.tsx`, and `game/e2e/game.spec.ts` exist.

- [ ] **Step 4: Update repository-level ignores**

Modify `.gitignore` so it contains exactly these entries:

```gitignore
.superpowers/
.worktrees/
node_modules/
dist/
playwright-report/
test-results/
```

- [ ] **Step 5: Verify copied files are visible to git and generated artifacts are ignored**

Run:

```bash
git status --short
```

Expected: `game/` files and the `.gitignore` modification are shown. `game/node_modules`, `game/dist`, `game/test-results`, and `game/playwright-report` are not shown.

- [ ] **Step 6: Commit the stable game directory**

Run:

```bash
git add .gitignore game
git commit -m "Add deployable game app"
```

Expected: commit succeeds and includes the `game/` source tree, package files, configs, and tests.

---

### Task 2: Add Cloudflare Pages Deployment Documentation

**Files:**
- Create: `docs/deployment/cloudflare-pages.md`

- [ ] **Step 1: Create deployment docs directory**

Run:

```bash
mkdir -p docs/deployment
```

Expected: `docs/deployment` exists.

- [ ] **Step 2: Write Cloudflare Pages instructions**

Create `docs/deployment/cloudflare-pages.md` with this exact content:

````markdown
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
````

- [ ] **Step 3: Check the markdown renders with fenced code blocks intact**

Run:

```bash
sed -n '1,220p' docs/deployment/cloudflare-pages.md
```

Expected: the output starts with `# Cloudflare Pages Deployment`, includes the settings list, and all shell commands are inside fenced code blocks.

- [ ] **Step 4: Commit the deployment docs**

Run:

```bash
git add docs/deployment/cloudflare-pages.md
git commit -m "Document Cloudflare Pages deployment"
```

Expected: commit succeeds and only adds `docs/deployment/cloudflare-pages.md`.

---

### Task 3: Verify The App From Its Publish Directory

**Files:**
- No source edits expected.
- Validation runs from `game/`.

- [ ] **Step 1: Install dependencies in the stable app directory**

Run:

```bash
cd game
npm install
```

Expected: npm exits successfully and reports packages are installed or already up to date.

- [ ] **Step 2: Run unit tests**

Run:

```bash
cd game
npm run test:run
```

Expected: Vitest exits successfully with all tests passing.

- [ ] **Step 3: Build the production site**

Run:

```bash
cd game
npm run build
```

Expected: TypeScript and Vite exit successfully, and `game/dist/index.html` is created.

- [ ] **Step 4: Run the browser e2e checks**

Run:

```bash
cd game
npm run e2e
```

Expected: Playwright exits successfully. The existing e2e tests confirm the cube canvas is non-empty, placing a mark works, New Game resets the turn text, Undo works, and right-drag rotation enables Undo.

- [ ] **Step 5: Inspect the production output size**

Run:

```bash
du -sh game/dist
find game/dist -maxdepth 2 -type f | sort
```

Expected: `game/dist` is small enough for Cloudflare Pages static hosting and contains `index.html` plus built assets under `assets/`.

- [ ] **Step 6: Commit any verification-only lockfile changes if npm changed them**

Run:

```bash
git status --short
```

Expected: no source changes are required. If `game/package-lock.json` changed only because npm normalized metadata for the current platform, review the diff with `git diff -- game/package-lock.json`, then commit it:

```bash
git add game/package-lock.json
git commit -m "Refresh game lockfile"
```

If `git status --short` is clean, do not create this commit.

---

### Task 4: Prepare GitHub Push And Cloudflare Setup Handoff

**Files:**
- No source edits expected.

- [ ] **Step 1: Confirm final repository state**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: working tree is clean except for pre-existing unrelated untracked files outside this plan, and recent commits include:

```text
Add deployable game app
Document Cloudflare Pages deployment
```

- [ ] **Step 2: Push the branch to GitHub**

Run:

```bash
git push origin master
```

Expected: push succeeds. If the remote rejects because the branch has moved, stop and inspect with:

```bash
git fetch origin
git log --oneline --decorate --graph --max-count=20 --all
```

Then rebase or merge only after confirming the remote changes are expected.

- [ ] **Step 3: Give the user the Cloudflare settings**

Report these exact settings to the user:

```text
Cloudflare Pages settings:
Root directory: game
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Production branch: master
```

Expected: the user can create a Cloudflare Pages project connected to GitHub and obtain the generated `*.pages.dev` URL.

- [ ] **Step 4: Verify the public URL after the user connects Cloudflare**

After the user provides the Cloudflare Pages URL, open it in a browser and verify:

```text
Page loads.
Cube renders.
Placing a mark works.
Undo works.
Reloading the URL works.
Browser console has no missing asset errors.
```

Expected: the game is publicly reachable at the permanent Cloudflare Pages URL.

---

## Self-Review

- Spec coverage: The plan implements Cloudflare Pages static hosting, excludes tunnels and paid services, moves the app out of `.worktrees`, documents Cloudflare settings, and verifies local plus deployed behavior.
- Placeholder scan: No placeholder markers, incomplete commands, or unspecified tests are present.
- Type consistency: No new app APIs or TypeScript types are introduced by this deployment plan.
