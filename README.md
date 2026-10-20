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

On the first night a few short hints appear as they become useful (how to move, what the meters mean, what to do when something breaks). Each shows once, and you can turn them off in Settings.

## Save codes (moving your progress)

Progress is saved in the browser you play in. To carry it to another phone or browser, or keep a backup:

1. On the title screen (or the pause menu, II), under **Save code**, tap **Back up**, then **Copy code**. Paste it somewhere safe, like your notes app or a message to yourself. The code starts with `OP1:`.
2. On the other phone or browser, open the game and tap **Restore** under **Save code**, paste the code and tap **Restore**. It shows what's in the code next to what's saved there now, and asks before replacing anything.

The code holds your nights, supply choices, logs and notes found, and settings. A night you're in the middle of isn't included, because the game saves between nights. Nothing is sent anywhere: the code is made and read inside the page. A damaged or cut-short code is turned down with a message and changes nothing. How it works is in `src/core/savecode.js`.

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
npm run build:itch   # self-contained build into dist-itch/, for uploading to itch.io
```

Every push to `main` builds, tests and deploys to GitHub Pages. Pull requests run the tests and the build as a check.

### One-time GitHub Pages setup

In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**. Until this is done, the deploy step on `main` fails and the live link shows a 404.

## Status

All milestones, M0 to M9, are done. The game is complete from title screen to credits:

- **Five nights**, each adding something: power, fuel, heat and readings; the radio, heater fuses and the supply room; NERVES, the frozen fuel line and the yard outside with the north mast; the cracked window and Vance's sealed room; and night 5, with everything at once and a voice at the west door.
- **The story:** 25 keeper log entries recovered by logging readings, 10 handwritten notes, 5 recorder tapes, radio calls that remember your replies, and small changes around the station between nights.
- **Three endings:** Relief, Answer, and a secret one for finding every log entry and note.
- **The station:** low-poly rooms built in code, the yard with its tether, fuel shed and mast, whiteout gusts, positional sound through walls, subtitles for every sound, saving, save codes, settings and a debug panel (`?debug=1`).

To put it on itch.io, see [docs/ITCH.md](docs/ITCH.md).
