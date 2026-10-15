# Outpost — instructions for Claude Code

Outpost is a first-person survival-mystery browser game by Longlight Interactive.
The full design is in docs/DESIGN.md. Read it before starting any milestone, including its
"Decisions log" at the end, which overrides anything earlier in the document.
There is no prototype file: M1 rebuilt the loop from DESIGN.md.

## Stack
- Three.js (npm, exact pinned version), plain JavaScript ES modules, Vite.
- Deployed to GitHub Pages by .github/workflows/deploy.yml on every push to main.
  Pull requests run `npm test` and `npm run build` as a check.
- vite.config.js base is '/Outpost-/' (the repo name). Asset paths must work under that base:
  use `import.meta.env.BASE_URL` for anything in public/.
- Live URL: https://jxstrr0.github.io/Outpost-/

## How the owner works
- Beginner-plus coder who tests mostly on a phone via the live Pages URL.
- Explain what you changed in plain language at the end of every task, plus how to test it on the live site.
- Work on a branch and open a pull request into main; never push straight to main.
- Once `npm test` and `npm run build` pass and the PR check is green, merge the PR into main yourself.
  The owner has given standing permission to merge.
- Keep pull requests small enough to review on a phone.
- When something is a real design decision, ask the owner rather than guessing, and record the answer
  in the Decisions log at the end of docs/DESIGN.md.

## Code rules
- All game numbers live in src/config.js. No magic numbers elsewhere.
- One state object (src/core/state.js). Only systems/ modules change game state.
- Systems emit events; world/, audio/ and ui/ listen. Systems never import Three.js.
- Fixed simulation timestep, separate from rendering.
- Story content (logs, notes, radio, nights) lives in src/story/data/*.json.
- Every new failure, event or night must be triggerable from the debug panel (?debug=1).
- Phone first: every feature must work with touch controls before it is done.
- Wrap all localStorage access in try/catch.
- Stay inside the performance budget in DESIGN.md. Check it after adding models or lights.

## Definition of done for any task
1. npm test and npm run build pass with no errors.
2. The feature works on desktop and with touch controls.
3. Tuning values are in config.js, content is in JSON.
4. The milestone's "done when" line in DESIGN.md is met.
5. A short plain-language summary and test steps are written in the PR description.
