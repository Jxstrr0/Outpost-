# Putting Outpost on itch.io

There are two ways to put the game on an itch.io page. Both are free to set up.

| | A. Embed the live site (recommended) | B. Upload the built game |
|---|---|---|
| What you upload | `itch/index.html`, zipped (one tiny file) | the `dist-itch` folder, zipped (about 1.5 MB) |
| Updates | automatic: the page always runs whatever is live on GitHub Pages | upload a new zip every time |
| Works if GitHub Pages is down | no | yes |

Saves live in the player's browser either way. If a player's browser blocks storage inside
embedded games, the Save code buttons on the title screen still let them back up and restore.

## A. Embed the live site

1. Zip the file `itch/index.html` on its own (the zip should contain `index.html` at the top level).
2. On itch.io: **Dashboard → Create new project**.
3. **Kind of project:** HTML.
4. **Uploads:** upload the zip and tick **This file will be played in the browser**.
5. **Embed options** (see the settings below).
6. Fill in the page text below, add screenshots, then **Save & view page**. Leave it as a
   **Draft** or **Restricted** until you've tried it on your phone, then set it to **Public**.

## B. Upload the built game

1. On a computer with the project: `npm ci` then `npm run build:itch`. This builds the game
   with relative paths into `dist-itch/`.
2. Zip the **contents** of `dist-itch` (so `index.html` is at the top of the zip, not inside a folder).
3. Follow steps 2 to 6 above with that zip.

## Embed options

- **Viewport dimensions:** 960 × 540
- **Mobile friendly:** ticked. **Orientation:** landscape.
- **Fullscreen button:** ticked
- **Automatically start on page load:** off (the title screen needs a tap first anyway, so
  the browser lets the sound play)
- **Enable scrollbars:** off

## Page text

**Title:** Outpost

**Short description (tagline):** Five nights alone on an arctic weather station. Don't open the west door.

**Genre:** Survival · **Tags:** horror, survival, first-person, atmospheric, mystery, low-poly,
short, web, mobile-friendly

**Description:**

> You are the third keeper of Station Kestrel-4 in two years. The other two walked out into
> the storm at 03:00 and were never found.
>
> Keep the generator fed. Reset the breaker. Log the weather every two hours, because every
> reading you log recovers a little more of the last keeper's corrupted journal. Mind the
> heater, the fuel line, the window and the antenna on the north mast. Answer the radio.
> Count the jerry cans.
>
> And whatever you hear at the west door, don't open it.
>
> **Features**
> - Five nights, each adding a new system, a new space and a new kind of wrongness
> - A story told through a corrupted keeper log, handwritten notes, recorder tapes and the radio
> - Three endings, one of them hidden
> - Positional sound: every fault has its own noise, and walls muffle it
> - Plays in the browser on desktop and on phones (turn your phone sideways)
>
> **Controls**
> - Phone: left thumb moves, right thumb looks, USE to interact, TORCH for the flashlight
> - Desktop: WASD to move, mouse to look, E or click to use, F for the flashlight, Esc to pause
>
> Headphones recommended. Subtitles for every sound, reduced flicker and motion, and text
> size are in Settings.
>
> A Longlight Interactive game. Sound layers by Kenney (CC0). Built with three.js.

**Price:** your call (see the open question in `docs/DESIGN.md`). "No payments" or "Donate"
both work for a free web game.

## Screenshots to take

itch shows up to five. Good ones: the title screen; the main room with the met console
glowing; the generator room in a red blackout; the tether out to the north mast in a gust;
Vance's room by torchlight. Take them at 1920 × 1080 (desktop, F11 for fullscreen) or from
your phone in landscape.
