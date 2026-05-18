# Cloudflare Pages Hosting Design

## Context

The game is a Vite/React static web app in `.worktrees/rubiks-tic-tac-toe`. Its existing production output is `dist`, currently under 1 MB and made of static HTML, CSS, and JavaScript assets. It does not need a backend service for hosting.

The user wants internet access for the game without paying. Tunnels are explicitly out of scope. A permanent public link is preferred over hosting from a local device.

## Decision

Host the game on Cloudflare Pages as a static site.

Cloudflare Pages gives the project a persistent `pages.dev` URL and serves the built static assets without depending on the user's device being online. This matches the game's current architecture and avoids the operational/security issues of local hosting with public ports.

## Alternatives Considered

### GitHub Pages

GitHub Pages is also free and suitable for static sites. It is less preferred here because Vite apps deployed under a repository subpath often need explicit `base` configuration, and the project currently sits in a worktree rather than a clean publishable root.

### Local Device Hosting Without Tunnels

Local hosting without tunnels would require a reachable public IP or router port forwarding, firewall configuration, and likely dynamic DNS. It is not the recommended path for a browser game because it is more fragile and exposes the local network to public traffic.

## Proposed Structure

The game should not be permanently published from `.worktrees/rubiks-tic-tac-toe`. That directory is local git worktree plumbing and is not an appropriate long-term project root for a hosted site.

The implementation should make the game available to Cloudflare Pages from a normal repository location. Acceptable approaches are:

- Move the Vite app into the repository root if this repo is only for the game.
- Move the Vite app into a stable subdirectory such as `game/` if the root should keep planning docs and other assets.

The implementation plan should choose the lower-risk option after checking the current git/worktree state.

## Cloudflare Pages Configuration

Use these settings in Cloudflare Pages:

- Framework preset: Vite or None.
- Build command: `npm run build`.
- Build output directory: `dist`.
- Root directory: the final Vite app directory chosen during implementation.

No serverless functions, workers, database, or paid Cloudflare features are required.

## Data Flow

1. Source changes are committed to GitHub.
2. Cloudflare Pages pulls the repository.
3. Cloudflare runs `npm run build` in the configured root directory.
4. Vite writes static files to `dist`.
5. Cloudflare Pages publishes `dist` to the public `pages.dev` URL.

## Error Handling

The implementation should document the common failure modes:

- Build fails because dependencies are missing or TypeScript errors exist.
- The wrong root directory is configured in Cloudflare.
- Assets 404 because the Vite base path is wrong.
- Cloudflare deploys an old branch or wrong repository.

For this app, the expected Vite base should remain `/` for Cloudflare Pages on a `pages.dev` domain.

## Testing

Before connecting Cloudflare Pages, verify locally:

- `npm run build` succeeds.
- A production preview serves the built game.
- The browser console has no asset-loading errors.

After deployment, verify on the public Cloudflare URL:

- The game loads from a clean browser session.
- 3D rendering appears.
- Basic gameplay interaction works.
- Reloading the page does not produce a 404.

## Out Of Scope

- Paid hosting.
- Tunnels such as ngrok, Cloudflare Tunnel, or Tailscale Funnel.
- Backend multiplayer or persistent cloud saves.
- Custom paid domain purchase.
- Local public hosting with router/firewall configuration.

## Success Criteria

The work is complete when the repository has a clean, documented path to deploy the Vite game to Cloudflare Pages and the user can configure Cloudflare to produce a permanent public URL without paid services or local-device hosting.
