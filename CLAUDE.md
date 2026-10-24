# Outpost: instructions for Claude Code

Outpost is a first-person survival-mystery browser game by Longlight Interactive. You keep
an arctic weather station alive for five nights while the last keeper's logs tell you what
happened to him.

The full design is in `docs/DESIGN.md`. Read it before any sizeable change, including its
"Decisions log" at the end, which overrides anything earlier in that document. There was
never a prototype file in the repo: M1 rebuilt the loop from the design doc.

## Stack
- `three` 0.186.1 (npm, exact pin), plain JavaScript ES modules, no TypeScript, no framework.
- Vite 8.3.4 for the dev server and the build. Node 22 (the workflow uses it; tests run on it).
- Tests are Node's built-in runner (`node --test`), headless, no browser.
- `vite.config.js` sets `base: '/Outpost-/'` (the repo name). Anything in `public/` must be
  reached through `import.meta.env.BASE_URL`, or it 404s on Pages.

## Commands
```sh
npm ci               # install (npm install also works)
npm run dev          # local server at http://localhost:5173/Outpost-/
npm test             # 66 headless tests in test/*.test.js
npm run build        # production build into dist/
npm run preview      # serve dist/ locally
npm run build:itch   # self-contained build with relative paths into dist-itch/ (itch.io)
```

## Deploy
- `.github/workflows/deploy.yml` ("Deploy to GitHub Pages") runs on every push to `main`,
  on every pull request into `main`, and by hand. Its `build` job runs `npm ci`, `npm test`
  and `npm run build`. On `main` it then publishes `dist/` to GitHub Pages; on a pull
  request it stops after the build, so the green check on a PR is that `build` job.
- Live URL: https://jxstrr0.github.io/Outpost-/ (debug panel: add `?debug=1`; replay a
  night exactly with `&seed=123`).
- Pages must be set to "GitHub Actions" as its source in the repo settings. It already is.

## How Kelbo works
- Beginner-plus coder who tests mostly on a phone via the live Pages URL.
- Explain what you changed in plain language at the end of every task, plus how to test it
  on the live site. Short sentences. No em-dashes.
- Work on a branch and open a pull request into `main`. Never push straight to `main`.
- Once `npm test` and `npm run build` pass locally and the PR check is green, merge the PR
  into `main` yourself. Kelbo has given standing permission to merge.
- Keep pull requests small enough to review on a phone.
- When something is a real design decision, ask Kelbo rather than guessing, and record the
  answer in the Decisions log at the end of `docs/DESIGN.md`.
- The site and this repo use the name Kelbo only. Never a real name or initials.

## Code rules (the code follows these today; keep it that way)
- Every tuning number lives in `src/config.js`. No magic numbers elsewhere.
- One game state object, built by `createState` in `src/core/state.js`. Only modules in
  `src/systems/` write to it. Everything else reads.
- Systems emit events on the bus in `src/core/events.js`; `world/`, `audio/` and `ui/`
  listen. Systems never import Three.js (`src/systems/` and `src/core/` have no `three` import).
- Fixed simulation step: `CONFIG.time.ticksPerSecond` (10) ticks a second, separate from
  rendering (`stepSimulation` in `src/systems/index.js`, driven from `src/main.js`).
- Randomness goes through the seeded RNG in `src/core/rng.js`, one seed per night, so a
  night can be replayed exactly.
- Story content lives in `src/story/data/*.json`: nights, logs, notes, tapes, radio calls,
  endings, outcomes, supplies, subtitles, door names, credits. Adding content is a JSON edit.
- Every failure, scripted event and night is triggerable from the debug panel (`?debug=1`,
  `src/core/debug.js`). Keep that true for anything new.
- Phone first: every feature must work with touch controls (`src/player/input-touch.js`)
  before it is done. Test portrait and landscape.
- Wrap all `localStorage` access in try/catch (`src/core/save.js` does; follow it).
- Stay inside the performance budget in `docs/DESIGN.md`. The debug panel shows fps, draw
  calls, triangles and point lights. Check it after adding geometry or lights.
- Fictional names only (Station Kestrel-4, R. Vance, Hollis, Imogen Price at Dispatch).

## Where things live
- `index.html`: the page, with the built-in loading screen (`#boot`).
- `src/main.js`: boot, renderer, game flow (title, night card, playing, panels, pause,
  summary, lost, ending), the debug panel wiring and the main loop.
- `src/config.js`: every tuning number, grouped by system.
- `src/core/`: `state.js` (the one state object), `events.js` (event bus), `rng.js` (seeded
  RNG), `clock.js` (game-minute helpers), `save.js` (localStorage save and settings),
  `savecode.js` (`OP1:` save codes), `debug.js` (the `?debug=1` panel).
- `src/systems/`: the simulation, one file per system, run in order by `index.js`: time,
  failures, power, fuel, heat, duties (readings), flashlight, radio, sanity (NERVES),
  outside (gusts, body heat, mast, antenna), westdoor (night 5). Also doors, repairs
  (fuse, tape, heat gun, rations) and player (which room you are in).
- `src/player/`: `controller.js` (movement, collision), `input-desktop.js` (WASD, mouse,
  E, F, Esc), `input-touch.js` (stick, drag-look, USE, TORCH, pause), `interact.js` (what
  the crosshair is on), `actions.js` (what each interactable says and does).
- `src/world/`: the station built in code from low-poly shapes. `station.js` assembles it;
  `rooms/` has one file per room plus `shell.js` (walls, doorways) and `builder.js`;
  `layout.js` is the room map (no Three.js, shared with audio and tests); `exterior.js`
  the yard, tether, shed, mast, snow and footprints; `lighting.js` the four point lights
  and lighting states; `flashlight.js`; `textures.js` procedural surfaces; `quality.js`
  the Graphics setting and Auto step-down; `props.js`, `kit.js`, `decals.js`,
  `story-props.js` (notes, tapes, the mug, bedroll, handprints), `screens.js` (met console
  and terminal canvases), `assets.js` (palette).
- `src/audio/`: `audio.js` (positional emitters, occlusion, subtitles), `synth.js`
  (generated wind, hum, alarms, static, drone), `samples.js` (recorded layers from
  `public/audio/`), `space.js` (room-to-room muffling and direction words).
- `src/ui/`: `hud.js` (clock, meters, objective, crosshair, frost), `panels.js` (met
  console, terminal, notes, tapes, radio), `menus.js` (title, night card, pause, settings,
  save codes, summary, lost, endings, credits), `toasts.js`, `hints.js` (first-night
  hints), `styles.css`.
- `src/story/`: `nights.js` (loads the JSON, supply drop), `scripted.js` (timed and
  event-driven scripted moments), `endings.js` (which ending, the Answer log),
  `logs.js`, `radio.js`; content in `src/story/data/`.
- `public/audio/`: Kenney CC0 sound layers (credits in `public/audio/CREDITS.md`).
  `public/models/` is empty on purpose: props are built in code, not loaded from `.glb`.
- `test/`: `systems.test.js` (headless nights, simulated players, every system),
  `savecode.test.js`, `audio.test.js` (room map and occlusion), `hints.test.js`,
  `quality.test.js`.
- `docs/DESIGN.md` (design and decisions log), `docs/ITCH.md` (itch.io steps, on hold),
  `itch/index.html` (embed page for itch.io), `README.md` (Kelbo's player and editing guide).

## Current status (2026-10-24)
- All ten milestones, M0 to M9, are built and live. The campaign plays from the title
  screen to one of three endings (Relief, The Record, Answer) with five nights, 25 log
  entries, 10 notes, 5 tapes, 9 radio calls, six failure types, the yard, save codes,
  settings, a debug panel and a loading screen. `npm test` (66 tests) and `npm run build`
  both pass as of this refresh.
- Work since M9: procedural surface textures, a Graphics setting with Auto step-down,
  layout fixes for phones held sideways, and Night 1 onboarding hints.
- Next, when Kelbo asks: the itch.io page (files are ready, see `docs/ITCH.md`; on hold by
  his decision) and the open price question. Otherwise, polish from his phone playtests.
- Known gaps: no voice acting (text only, by decision); DESIGN.md's playtest-style "done
  when" lines (frame rate on a phone, strangers finishing night 1) have no written record;
  the test suite covers the simulation, save codes, audio routing, hints and quality, not
  the renderer or the UI, so phone checks are manual.

## Definition of done for any task
1. `npm test` and `npm run build` pass with no errors.
2. The feature works on desktop and with touch controls.
3. Tuning values are in `config.js`, content is in JSON.
4. Anything new can be triggered from the debug panel.
5. A short plain-language summary and test steps are in the PR description.
6. If the change alters how the game works, `docs/DESIGN.md` and `README.md` say so too.
