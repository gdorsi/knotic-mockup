# knotic-mockup

Tauri desktop mockup that proposes a single-flow standalone replacement for
[Knotic](https://knotic.dev)'s IDE surfaces. It collapses Sessions, Brainstorming,
Architect, Context Lens and Global Knowledge into one guided path:

```
new project  →  Global Knowledge wizard  →  Brainstorm (cards + refinement)
             →  Spec preview & approve  →  Architect plan (collapsible steps)
```

The agent harness is [Pi](https://pi.dev/) behind a thin client boundary
(`src/pi/harness.ts`). The boundary is mocked in this build — every "agent" call
streams scripted events so the UI can be exercised without credentials.

## Stack

- Tauri 2 (Rust shell, `src-tauri/`)
- React 18 + TypeScript + Vite
- Zustand for state

## Prerequisites

- **Node** ≥ 20 — tested with 24.13
- **pnpm** ≥ 9 — tested with 10.33
- **Rust toolchain** (stable) — only needed for the Tauri desktop build
- macOS / Linux / Windows — Tauri's normal platform deps apply
  (see <https://v2.tauri.app/start/prerequisites/>)

## Install

```bash
pnpm install
```

## Run

### Browser-only (Vite)

Fastest way to iterate on the UI:

```bash
pnpm dev
```

Open <http://localhost:1422>. HMR runs on `1423`.

### Desktop (Tauri)

```bash
pnpm tauri:dev
```

First run compiles the Rust shell (a few minutes); subsequent runs are fast.

### Production bundle

```bash
pnpm build        # frontend only → dist/
pnpm tauri:build  # native installer for the current platform
```

## Project layout

```
src/
  App.tsx                       top-level router (welcome / wizard / chat / brainstorm / spec / architect)
  components/
    Sidebar.tsx                 Codex-style projects + sessions tree, "+" dropdown
    GlobalKnowledgeWizard.tsx   onboarding step shown when .knotic/ is missing
    Brainstorm.tsx              intent → option cards → refinement → summary
    SpecReview.tsx              markdown spec preview + approval handoff
    Architect.tsx               collapsible plan/step list with mock execution
    Chat.tsx                    plain session view
  state/                        zustand store + types
  pi/harness.ts                 Pi (pi.dev) client boundary — swap MockPi for real Pi here
  data/seed.ts                  seed projects, brainstorm cards, refinement questions
  styles/app.css                dark Codex-like palette

src-tauri/                      Rust shell + commands (project_has_knotic, create_knotic_dir)
```

## Wiring real Pi

`src/pi/harness.ts` exports a `PiClient` interface and a `MockPi` implementation.
To run against a real provider, replace `MockPi` with a client backed by Pi's
SDK / RPC channel (`@earendil-works/pi-coding-agent`). The rest of the app does
not need to change — every flow speaks to the harness through `createSession()`
and the `PiEvent` stream.

## Ports

| Port | Use                |
| ---- | ------------------ |
| 1422 | Vite dev server    |
| 1423 | Vite HMR websocket |

Override via `vite.config.ts` if they conflict on your machine.

## Notes

- The Global Knowledge wizard writes `.knotic/global-knowledge.md` to disk via
  the `create_knotic_dir` Tauri command. In the browser-only build that call is
  a no-op (the wizard still completes and the UI advances).
- The seed brainstorm card data is deliberately opinionated (queue-backend
  decision) so the demo flow has realistic-looking tradeoffs.
- Architect's mock executor intentionally pauses on step 5 to exercise the
  paused-step UI.
