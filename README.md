# Outpost

A first-person survival-mystery game for the browser, by Longlight Interactive.

You are the lone keeper of an arctic weather station for five nights. Keep the generator, the battery and the heater alive, log the weather every two hours, and read what the keeper before you left behind.

**Play:** https://jxstrr0.github.io/Outpost-/
**Debug mode:** https://jxstrr0.github.io/Outpost-/?debug=1 (skip time, set meters, trigger failures and scripted events, jump nights; add `&seed=123` to replay a night exactly)

## Controls

| Action | Phone (landscape) | Desktop |
|---|---|---|
| Move | Left thumb, anywhere on the left half | WASD or arrow keys |
| Look | Drag on the right half | Mouse (click the game first) |
| Use | USE button | E or left click |
| Flashlight (night 2 on) | TORCH button, above USE | F |
| Pause | II button, top centre | Esc |

## Where things are

- `docs/DESIGN.md`: the full design and the decisions log. Start here.
- `CLAUDE.md`: standing instructions for Claude Code.
- `src/config.js`: every tuning number.
- `src/story/data/`: nights, keeper logs, notes, supplies and subtitles, as JSON.
- `public/audio/`: recorded sound layers (CC0, from Kenney). Credits in `public/audio/CREDITS.md`.

## Working on it

```sh
npm install
npm run dev      # local server at http://localhost:5173/Outpost-/
npm test         # headless simulation tests (no browser needed)
npm run build    # production build into dist/
```

Every push to `main` builds, tests and deploys to GitHub Pages. Pull requests run the tests and the build as a check.

### One-time GitHub Pages setup

In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**. Until this is done, the deploy step on `main` fails and the live link shows a 404.

## Status

Milestones M0 to M7 are done: the full night loop, nights 1 and 2 with their story, the day summary and supply drop, saving, settings, the debug panel, the low-poly station with its supply room, airlock, doors and flashlight, and the audio pass (positional sound through walls, a sound for every fault, directional subtitles), and the new systems: radio calls from Dispatch, the NERVES meter, heater fuses, a freezing fuel line, a cracking window and hold-to-repair, across all five nights (nights 3 to 5 still need their logs and notes), and the exterior: a snowy yard with a tether out to the north mast, a fuel shed, body heat, whiteout gusts, antenna icing and footprints. See the Milestones section of `docs/DESIGN.md` for what comes next.
