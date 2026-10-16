# Outpost — Design Doc & Build Handoff

Exported from the Claude Docs design doc on 2026-10-15 · Longlight Interactive

## Overview

Outpost is a first-person survival-mystery game in a browser: you are the lone keeper of an arctic weather station for five nights, keeping failing systems alive while a logbook reveals what happened to the keeper before you.

| Item | Decision |
|---|---|
| Genre | First-person systems survival with environmental storytelling |
| Comparable games | Five Nights at Freddy's (night structure), Firewatch (isolation and voice), FTL (juggling failing systems), Iron Lung (contained dread) |
| Platform | Web browser, phone first, desktop fully supported; hosted on GitHub Pages |
| Engine | Three.js, plain JavaScript modules, Vite build |
| Session length | One night = 8 to 12 minutes; full campaign = 60 to 90 minutes |
| Scope target | Five handcrafted nights, one station interior plus a small exterior, two endings |
| Studio | Longlight Interactive |

A working prototype already exists (single file, `outpost.html`). It proved three things: the three-system juggle (power, fuel, heat) creates tension on its own; reading logs between emergencies paces the story naturally; and a full 3D scene with generated audio runs smoothly on a phone from one HTML file. The full game keeps that loop and adds content, polish and structure around it, not a different game.

## Design pillars

Every feature must serve at least one of these four pillars; anything that serves none gets cut.

1. **Quiet dread, not jump scares.** Fear comes from what the station implies: a light that shouldn't be on, a reading that doesn't add up, three knocks. At most one scripted scare per night, and never a monster on screen before night 5.
2. **Too many jobs, one pair of hands.** The player should always have two problems and time for one. Systems fail independently, so priorities change minute to minute.
3. **The station is the storyteller.** Lore lives in objects: logs, notes, recordings, scratches, a rearranged room. No cutscenes, no narrator, no exposition dumps.
4. **Readable on a phone in the dark.** Every interaction works with one thumb. The HUD is minimal, text is legible at arm's length, and nothing important is communicated by sound alone.

The target feeling at the end of a night: relief, then the urge to read one more log before quitting.

## Core loop and systems

Each night the player survives from 18:00 to 06:00 by keeping power, fuel and heat above failure while completing scheduled duties, which unlock story.

The minute-to-minute loop: notice a problem (HUD, sound, light change) → walk to it → fix it → do a duty if there's time → read what the duty unlocked → the next problem arrives.

### Resources

| System | Range | Goes up by | Goes down by | Failure state |
|---|---|---|---|---|
| Battery power | 0 to 100% | Generator running | Lights, heater, consoles, radio | At 0%: lights and heater off, red emergency light only |
| Generator fuel | 0 to 100% | Pouring jerry cans (+30 each) | Burns while generator runs | At 0%: generator stops and won't restart |
| Inside temperature | −30 to +18 °C | Heater on with power | Heater off or no power | Below −6 °C for 80 game minutes: player freezes, night lost |
| Sanity (new, night 3+) | 0 to 100 | Lights on, warmth, logging duties | Darkness, cold, anomaly events | Below 30: hallucinated sounds and fake HUD alerts; at 0: night lost |

### Failures

Failures are random but weighted by night. Each has a location, a tell, and a fix, so the player learns to recognise them by sound before seeing them.

| Failure | Tell | Fix | First night |
|---|---|---|---|
| Generator stall | Hum stops, lamp blinks red | Restart at generator (30% chance each try fails) | 1 |
| Tripped breaker | Clunk, main room goes dark | Reset at breaker panel | 1 |
| Heater fault | Grille stops glowing while powered | Replace fuse from supply locker | 2 |
| Frozen fuel line | Generator sputters, burns fuel faster | Thaw with heat gun (takes 10 seconds, holding Use) | 3 |
| Antenna icing | Radio and console go to static | Go outside, knock ice off the mast | 3 |
| Window crack | Wind gets louder, temperature drops 2× faster | Seal with tape from workshop | 4 |

### Duties

Duties are the player's job and the story's delivery system. Missing a duty costs story, not the night.

- **Weather readings** (every 2 game hours at the met console): log within a 65-minute window. Each logged reading recovers a keeper log entry.
- **Radio check-ins** (twice a night, nights 2+): answer base on the radio; dialogue choices change base's later responses.
- **Mast inspection** (once a night, nights 3+): go outside, check the instruments. This is where the exterior dread lives.

### Tuning baseline (from the prototype)

All numbers live in one config file so they can be changed without touching code. Time runs at 1.6 game minutes per real second, so a 12-hour night lasts about 7.5 real minutes before any pauses.

| Value | Prototype number |
|---|---|
| Generator charge | +0.36% battery per game minute |
| Fuel burn | 0.12% per game minute |
| Base load / lights / heater | 0.08 / 0.06 / 0.20% per game minute |
| Generator stall chance | about once every 85 game minutes |
| Breaker trip chance | about once every 230 game minutes while heater runs |
| Heating / cooling rate | 0.012 / 0.0045 toward target, per game minute |
| Starting power / fuel / temperature | 68% / 30% / 7 °C |
| Jerry cans per night | 3 (night 1), then 2, then scavenged |

## Narrative

The player is the third keeper of Station Kestrel-4 in two years; both keepers before them walked out into the storm at 03:00 and were never found, and the player slowly learns why.

### The truth (for writers only, never stated outright in game)

Something lives under the ice north of the station. It shows up on instruments as a pressure drop at the north mast that the south mast never sees. It cannot enter the station. It can only make the keeper want to come out: it imitates voices on the radio, leaves tracks that lead to the door, knocks, and rearranges small things inside to make the keeper doubt their own mind. The Polar Meteorological Service knows keepers go missing at Kestrel-4 and keeps staffing it anyway, because the anomaly data is valuable.

### Characters

| Character | Role | How the player meets them |
|---|---|---|
| R. Vance | The previous keeper, 19 days on station | Keeper log, handwritten notes, pocket recorder |
| Hollis | The keeper before Vance | Vance's mentions; one old tape found on night 4 |
| Dispatch (Imogen Price) | Voice of the Polar Met Service on the radio | Radio check-ins from night 2 |
| The player | New keeper, never named or seen | Their own reading log and choices |

### Story channels

- **Keeper log** at the desk terminal. Entries are corrupted and recover one per logged reading. This is the spine of the story.
- **Handwritten notes** hidden around the station, one or two per night. Short, personal, unsettling ("Count the jerry cans. I left four.").
- **Recorder tapes**, one per night. Audio-style transcripts of Vance and later Hollis.
- **Radio** from night 2. Dispatch is friendly and evasive. From night 4, some calls come in when Dispatch says she never called.
- **The station itself.** Small changes between nights: the mug moves, frost handprints appear on the inside of the window, a locker is open that was closed.

### Rules for writing

Short entries, under 60 words each. Concrete details over adjectives. Never confirm the creature; let the player assemble it. Every entry should change what the player suspects or what they do next.

## Campaign structure

The campaign is five nights; each night adds one new system or space and one new kind of wrongness, and each ends with a short daytime summary screen.

| Night | New mechanic | New space | Story beat | Scripted moment |
|---|---|---|---|---|
| 1 | Power, fuel, heat, readings (the prototype) | Main room, generator room | Vance's early logs; the pressure mismatch | Three knocks at 03:00 |
| 2 | Radio check-ins, heater fuses | Supply room | Tracks that lead to the door; Dispatch dodges questions about Vance | The radio plays your own voice back |
| 3 | Sanity, frozen fuel line, mast inspection | Exterior yard and north mast | Vance starts sleeping in the generator room | A second set of footprints beside yours outside |
| 4 | Window crack, false radio calls | Vance's sealed bunk room | Hollis's tape; the Service knew | Dispatch calls, then Dispatch calls again and says she didn't |
| 5 | All failures at full weight | Whole station, storm at peak | Vance's last entry; the choice | Something calls you outside in Vance's voice |

### Between nights

A one-screen "day" summary: readings logged, logs recovered, lowest temperature, and a supply drop the player allocates (choose two of: fuel cans, fuses, food that slows sanity loss, a better flashlight battery). This is the only meta-progression.

### Endings

- **Relief.** Survive night 5 without opening the west door. The helicopter lands at 06:00. The pilot asks who has been logging readings for the past week, since the station's radio went silent nine days ago.
- **Answer.** Open the door at 03:00 on night 5 and walk toward the mast light. The screen fades to white. The credits roll over a new keeper log entry, written in the player's own words from their logged choices.

A night is lost by freezing or by sanity reaching zero; the player retries that night from its start with their previous supply choices.

## Station layout

The station is one single-storey prefab building about 22 × 12 m, plus a fenced yard with a fuel shed and the north mast; every room is reachable in under 10 seconds of walking so failures stay a dash, not a trek.

| Space | Size | Contents | Unlocks |
|---|---|---|---|
| Main room | 11 × 10 m | Keeper terminal, met console, heater, bunk, table, west door, north window | Night 1 |
| Generator room | 5 × 10 m | Generator, jerry cans, breaker panel, recorder shelf | Night 1 |
| Supply room | 4 × 4 m | Fuse box spares, tape, heat gun, food, radio set | Night 2 |
| Airlock | 2 × 3 m | Cold-weather gear hook, inner and outer doors | Night 3 |
| Yard and north mast | about 40 × 30 m | Fuel shed, instrument mast, tracks in the snow, whiteout visibility of 8 to 15 m | Night 3 |
| Vance's bunk room | 3 × 4 m | Sealed with tape; personal effects, the last tape | Night 4 |

Layout rules:

- One loop: main room → generator room → supply room → airlock → main room, so the player can always route around.
- The north window and the west door are both visible from the met console, so the player watches them while doing the duty that matters most.
- Outside is short and hostile: a tether line from the airlock to the mast, body heat drains while outside, and visibility collapses in gusts.

## Art, lighting and audio

The look is stylized low-poly realism: simple shapes, honest materials, and almost all of the mood carried by light, fog and sound rather than detailed models.

### Visual style

- **Models:** low-poly props (under 2,000 triangles each), built from free CC0 kits (Kenney, Quaternius, Poly Pizza) or simple shapes in Blender, exported as .glb. No textures larger than 512 px.
- **Palette:** cold blue-grey steel, dull olive fabric, safety orange and yellow for things the player interacts with. Interactive objects always carry a touch of orange so they read in the dark.
- **Screens:** amber for the met console, green for the keeper terminal, drawn live on canvas textures with scanlines.

### Lighting states

| State | When | Look |
|---|---|---|
| Normal | Power above 25% | Cool white ceiling fixtures, soft blue moonlight from the window |
| Unstable | Generator off or power under 25% | Fixtures dim and flicker at random |
| Blackout | Power 0% or breaker tripped | Red pulsing emergency strip, screens at 15% brightness, flashlight only |
| Anomaly | Scripted moments | Every light stutters together, then holds dark for 2 seconds |

The flashlight arrives on night 2, with a battery that drains and recharges only from station power.

### Audio

Audio is half the game; it gets a third of the polish time. Keep the generated sound from the prototype as a base and layer recorded CC0 sounds (freesound.org) on top.

- **Always on:** wind that gusts and shifts pitch, building creaks, distant metal groans.
- **Positional:** generator hum, heater hiss, console beeps, radio static. All use Three.js positional audio so the player can find problems by ear.
- **Tells:** every failure has a unique sound (stall cough, breaker clunk, fuse pop, glass tick).
- **Dread layer:** knocks, footsteps on the roof, the radio voice. These play from specific directions and are used sparingly.
- **Music:** none during play. One low drone on the day summary screen.

## Controls, HUD and UX

The game is designed phone-first in landscape; desktop gets keyboard and mouse with identical actions.

| Action | Phone | Desktop |
|---|---|---|
| Move | Virtual stick, left half of screen | WASD or arrow keys |
| Look | Drag right half of screen | Mouse (pointer lock) |
| Use / interact | Use button, bottom right | E or left click |
| Hold to repair | Hold Use | Hold E |
| Flashlight | Torch button above Use | F |
| Pause / settings | Pause button, top centre | Esc |

### HUD

- Top left: clock, then three thin meters (power, fuel, inside temperature). Meters turn red below their danger line.
- Top right: the current most urgent objective in one line, with where to go underneath.
- Centre: a small ring crosshair that grows and turns orange when an object can be used, with its action named below ("Restart the generator").
- Bottom centre: up to three short status messages that fade after 4 seconds.
- Screen edge frost that grows as the player gets cold; it doubles as a temperature warning.

### Panels

Logs, notes, the met console and the radio open as full-screen panels that pause the game. The game pausing during reading is deliberate: story never competes with survival.

### Settings (required for launch)

Look sensitivity, invert Y, master and effects volume, subtitles for all voiced and dread sounds, reduced flicker (replaces strobing with steady dimming), and text size.

## Technical architecture

The game is plain JavaScript ES modules on Three.js, built with Vite into a static site, so GitHub Pages can host it with no server.

### Stack

| Piece | Choice | Why |
|---|---|---|
| Rendering | three (npm), pinned to an exact version, e.g. 0.170.0 | Same library as the prototype, now with modern add-ons (GLTFLoader, PositionalAudio) |
| Language | JavaScript, no TypeScript | Lower barrier for a beginner-plus coder; JSDoc comments for clarity |
| Build | Vite | Instant local dev server, bundles for production, simple GitHub Pages setup |
| Content | JSON files for nights, logs, notes, radio lines | Story can be edited without touching code |
| Saving | localStorage, wrapped in try/catch | Works on GitHub Pages; no accounts needed |
| Hosting | GitHub Pages via GitHub Actions | Free, deploys on every push to main |

### Folder structure

```
outpost/
  index.html
  package.json
  vite.config.js            base set to '/Outpost-/'
  CLAUDE.md                 standing instructions for Claude Code
  docs/
    DESIGN.md               this document, exported
    prototype/outpost.html  the original single-file prototype, for reference
  public/
    models/                 .glb files
    audio/                  .ogg and .mp3 files
  src/
    main.js                 boot, renderer, main loop
    config.js               every tuning number in one place
    core/                   state.js, events.js, rng.js, save.js, savecode.js, debug.js
    world/                  station.js, rooms/, exterior.js, lighting.js, assets.js
    player/                 controller.js, input-desktop.js, input-touch.js, interact.js
    systems/                time.js, power.js, fuel.js, heat.js, sanity.js, failures.js, duties.js
    story/                  nights.js, logs.js, radio.js, scripted.js
    story/data/             night1.json ... night5.json, logs.json, notes.json, radio.json
    audio/                  audio.js, synth.js
    ui/                     hud.js, panels.js, toasts.js, menus.js, styles.css
  .github/workflows/
    deploy.yml
```

### Rules the code follows

1. **One game state object** (`core/state.js`) holds every number: time, power, fuel, temperature, sanity, flags. Systems read and write state; nothing else does.
2. **Systems never touch the scene.** They emit events (`generator:stalled`, `reading:logged`). World, audio and UI listen and react. This keeps game logic testable without graphics.
3. **Fixed simulation step** of 10 game-ticks per second, separate from rendering, so the game plays the same at 30 or 120 fps.
4. **Seeded randomness** per night (`core/rng.js`), so a reported bug can be replayed exactly.
5. **Content is data.** Adding a log, note or radio line means editing JSON, never code.
6. **Debug mode** at `?debug=1`: skip time, set any meter, trigger any failure or scripted event, jump to any night.

### Save data

One localStorage key, `outpost.save.v1`, storing: highest night reached, supply choices, logs and notes found, ending(s) seen, and settings. A night in progress is not saved; quitting restarts the night.

**Save codes** (`core/savecode.js`) move that save between browsers and phones with no server. Back up (title screen or pause menu, under "Save code") shows the whole save as one line of text starting `OP1:`, with a Copy button. Restore takes a pasted code, shows what's in it next to what's saved now, asks before replacing anything, then writes the whole save in one go. The code is the save as JSON in base64url (letters, digits, `-` and `_`, so chat apps leave it alone) plus a 6-character checksum, so a code with a missing or changed character is turned down with a plain message instead of half-loading. Codes from another game, from a newer version (`OP2:`, or a save version above 1) or with a field of the wrong type are turned down the same way. Fields missing from an older code get their defaults. A code is about 350 to 900 characters, small enough not to need compression.

### Performance budget

| Budget | Target |
|---|---|
| Frame rate | 60 fps on an iPhone 12-class phone, 30 fps floor |
| Triangles on screen | under 100,000 |
| Draw calls | under 150 |
| Dynamic lights | 4 point lights plus the flashlight; shadows only from the flashlight |
| Total download | under 15 MB |
| First load on 4G | under 5 seconds to the title screen |

## Repo and GitHub Pages deployment

The repo is the public GitHub repository `Jxstrr0/Outpost-`; every push to `main` builds the game and publishes it at `https://jxstrr0.github.io/Outpost-/` within about two minutes.

### One-time setup (you do these, about 5 minutes)

1. On GitHub, create a new **public** repository named `outpost` with a README. Pages is free for public repos.
2. In the repo, go to Settings → Pages, and set Source to **GitHub Actions**.
3. Upload the prototype file to `docs/prototype/outpost.html` (Add file → Upload files) so Claude Code can reference it.
4. Connect the repo to Claude Code and start a session with the first-session prompt in the handoff section below.

### What Claude Code sets up in session 1

`vite.config.js` must set the base path to the repo name, or every asset will 404 on Pages:

```
import { defineConfig } from 'vite';
export default defineConfig({ base: '/Outpost-/' });
```

`.github/workflows/deploy.yml`:

```
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Action versions above were confirmed as the latest majors in October 2026.

### Day-to-day workflow

- Claude Code works on a branch per milestone, opens a pull request, and you merge it from the GitHub app. Merging to `main` deploys.
- Test on your phone by opening the Pages link after each merge. Add it to your home screen for a full-screen feel.
- If a deploy fails, the Actions tab shows the red step; paste that error into Claude Code.

## Milestones

Build in ten milestones, in order; each one ends deployed and playable on the Pages link, so there is never a long stretch without a working game.

1. **M0 — Foundation.** Vite project, folder structure, deploy workflow, empty scene with a spinning cube on the live URL.
   - Done when: the Pages link loads on your phone and desktop.
2. **M1 — Port the prototype.** Split `outpost.html` into the module structure: state, systems, world, player, UI, audio. No new features.
   - Done when: the live game plays exactly like the prototype, and every tuning number lives in `config.js`.
3. **M2 — Engine hardening.** Event bus, fixed timestep, seeded RNG, save system, debug panel, pause menu and settings.
   - Done when: `?debug=1` can skip to 03:00 and trigger every failure; settings survive a reload.
4. **M3 — Night system.** Nights load from JSON; day summary screen; supply drop choice; retry a lost night.
   - Done when: nights 1 and 2 are playable back to back with placeholder content.
5. **M4 — Real station.** Replace boxes with low-poly models, add the supply room and airlock, the flashlight, and the lighting states.
   - Done when: the station looks finished in normal, unstable and blackout lighting, and holds 60 fps on your phone.
6. **M5 — Audio pass.** Positional audio, recorded sound layers, a unique tell for every failure, subtitles.
   - Done when: you can find a stalled generator with your eyes closed.
7. **M6 — New systems.** Radio check-ins, sanity, heater fuses, frozen fuel line, window crack, hold-to-repair.
   - Done when: each system works in debug mode and appears on its intended night.
8. **M7 — Exterior.** Yard, tether, mast inspection, body-heat drain outside, whiteout gusts, footprints.
   - Done when: night 3's mast trip is tense and takes 60 to 90 seconds.
9. **M8 — Full content.** All five nights, every log, note, tape and radio line, both endings, scripted moments.
   - Done when: the campaign can be completed start to finish on both endings.
10. **M9 — Polish and launch.** Balancing, title screen, credits, accessibility check, loading screen, itch.io page that embeds the Pages build.
   - Done when: three people who haven't seen it finish night 1 without help.

## Claude Code handoff

Commit two things before the first session: this document exported as `docs/DESIGN.md`, and the `CLAUDE.md` below at the repo root; then paste the first-session prompt into Claude Code.

### CLAUDE.md (copy into the repo root)

```markdown
# Outpost — instructions for Claude Code

Outpost is a first-person survival-mystery browser game by Longlight Interactive.
The full design is in docs/DESIGN.md. The original prototype is docs/prototype/outpost.html.
Read DESIGN.md before starting any milestone.

## Stack
- Three.js (npm, exact pinned version), plain JavaScript ES modules, Vite.
- Deployed to GitHub Pages by .github/workflows/deploy.yml on every push to main.
- vite.config.js base is '/Outpost-/'. Asset paths must work under that base.

## How the owner works
- Beginner-plus coder who tests mostly on a phone via the live Pages URL.
- Explain what you changed in plain language at the end of every task, plus how to test it on the live site.
- Work on a branch per milestone and open a pull request; never push straight to main.
- Keep pull requests small enough to review on a phone.

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
1. npm run build passes with no errors.
2. The feature works on desktop and with touch controls.
3. Tuning values are in config.js, content is in JSON.
4. The milestone's "done when" line in DESIGN.md is met.
5. A short plain-language summary and test steps are written in the PR description.
```

### First-session prompt (paste into Claude Code)

```
Read CLAUDE.md and docs/DESIGN.md, then look at docs/prototype/outpost.html.

Complete milestone M0 (Foundation) from DESIGN.md:
- Set up a Vite project with three pinned to an exact version.
- Create the full folder structure from the Technical architecture section,
  with placeholder files where needed.
- Set vite.config.js base to '/Outpost-/'.
- Add .github/workflows/deploy.yml from the Repo and GitHub Pages section,
  confirming the latest action versions.
- Render an empty dark scene with a slowly rotating cube and the text
  "Outpost — M0" so I can confirm the deploy works.

Work on a branch called m0-foundation and open a pull request.
When you're done, tell me in plain language what you built and exactly
how to check it on my phone after I merge.
```

After M0 is merged and live, start each new session with: "Read CLAUDE.md and DESIGN.md. Complete milestone M1." (and so on). One milestone per session keeps context clean.

## Risks and open questions

The biggest risk is scope creep in art and the exterior; the fallback for each risk is to cut toward the prototype, which is already fun.

| Risk | Likelihood | Fallback |
|---|---|---|
| Models and art take far longer than code | High | Keep stylized primitives with good lighting; buy or use one CC0 kit only |
| Exterior hurts phone frame rate | Medium | Shrink the yard, raise fog density, cut snow particle count |
| Phone browsers block audio until a tap | Certain | Start all audio from the "Begin shift" button, as the prototype does |
| iOS Safari has no pointer lock or fullscreen API | Certain | Touch controls are the main scheme on phones; offer "Add to Home Screen" for full screen |
| Systems get too punishing in later nights | Medium | Tune from config.js using debug mode; playtest each night alone |
| Story feels thin with only text | Medium | Add voiced radio lines later; text-first keeps scope sane |

### Open questions

- [x] Final station setting: arctic (current), deep-sea habitat or lunar relay? Answered: arctic (Decisions log).
- [x] Voice acting for radio and tapes, or text only at launch? Answered: text only (Decisions log).
- [ ] Free on itch.io, pay-what-you-want, or a paid Steam release later (would mean wrapping the web build)? Deferred: the owner will set up itch.io later, alongside their other games; the files are ready (docs/ITCH.md).
- [x] Should a third, secret ending exist for players who find every log? Answered: yes, "The Record" (Decisions log).

## Decisions log

Decisions made after the doc was written. They take precedence over anything above.

| Date | Decision |
|---|---|
| 2026-10-15 | The repo is `Jxstrr0/Outpost-`, so the Vite base path is `/Outpost-/` and the game lives at https://jxstrr0.github.io/Outpost-/. |
| 2026-10-15 | The prototype file was never committed. M1 rebuilt the loop from this document's systems and tuning tables instead of porting code. |
| 2026-10-15 | Setting stays arctic. |
| 2026-10-15 | Text only at launch: radio lines and tapes are subtitled text over generated static, no voice acting. |
| 2026-10-15 | A third, secret ending exists for players who find every log and note. It is written in M8. |
| 2026-10-15 | Claude Code merges its own pull requests into `main` once the build passes. |
| 2026-10-15 | M3 ships nights 1 and 2 only. Night 2's scripted moment is footsteps on the roof until the radio arrives in M6. |
| 2026-10-15 | M4 builds props in code from simple low-poly shapes, merged into one mesh per room, instead of downloading CC0 .glb kits. There is no asset pipeline to maintain, the download stays small, and the whole station draws in about 25 calls. Individual props can still be swapped for .glb models later. |
| 2026-10-15 | Layout: the supply room sits south of the generator room (x 1 to 5, z 5 to 9) and the airlock south of the main room (x −2 to 1, z 5 to 7), so the loop main → generator → supply → airlock → main works. The footprint is about 16 × 14 m instead of 22 × 12 m. |
| 2026-10-15 | The supply room and airlock unlock on night 2, so the loop exists from then on. The outer airlock door stays frozen shut until the exterior arrives (night 3, M7). |
| 2026-10-15 | Light budget: four point lights in total (main room, generator room, one shared by the supply room and airlock, heater glow) plus the flashlight. A tripped breaker darkens only the main room; a flat battery darkens everything. |
| 2026-10-15 | The flashlight arrives on night 2. Its cell lasts about 200 game minutes switched on and recharges while off, drawing a little from the station battery. The better cell from the supply drop drains 40% slower. Once the player owns a flashlight, blackouts are darker. |
| 2026-10-15 | Recorded sound layers come from Kenney's CC0 packs (Impact Sounds, RPG Audio, Sci-fi Sounds), because freesound.org can't be reached from the build environment. They ship as small mono MP3s (about 0.5 MB in total; MP3 plays on every phone browser, Ogg doesn't on older iPhones) and play on top of the generated sounds, which stay as the fallback. |
| 2026-10-15 | Walls muffle sound: each sound source runs through a low-pass filter that closes with every wall or shut door between it and the player, and the sources the player has to find use head-related (HRTF) panning. |
| 2026-10-15 | Faults keep sounding until they're fixed: a stalled generator buzzes an alarm every few seconds, an empty tank beeps, a tripped breaker panel buzzes, a stopped engine ticks as it cools. Subtitles for these and for the dread sounds say where the sound came from ("to your right, in the generator room"). |
| 2026-10-15 | M6 schedule: heater fuses can blow from night 2, the fuel line can freeze from night 3, the north window can crack from night 4. Sanity runs from night 3. Night 2's scripted moment is now the radio playing back the player's own words at 02:40; roof footsteps move to the hallucination pool. |
| 2026-10-15 | Sanity shows on the HUD as NERVES. It drains in the dark (half as fast with the flashlight on) and in the cold, and comes back in light, warmth, from logging duties, answering the radio and eating a ration. Scripted scares knock a few points off. Below 30 the player hears things that aren't there and sees fake fault alerts; at 0 the night is lost. |
| 2026-10-15 | Repairs use hold-to-use with their own lengths: a fuse takes 1.5 s, taping the window 4 s, thawing the fuel line 10 s. The player carries one fuse, one roll of tape and the heat gun at a time in their pockets; the heat gun is never used up. The station starts with 2 spare fuses, 2 rolls of tape and 1 ration, plus whatever the supply drop adds. |
| 2026-10-15 | The radio rings for 40 game minutes; a missed call is gone. Each reply the player picks is remembered (saved with the game) and later calls change what Dispatch says based on those replies. The player's own words are kept for the Answer ending's closing log in M8. |
| 2026-10-15 | Nights 3 to 5 exist from M6 with their failures, radio calls and scripted moment, but their logs and notes are written in M8. |
| 2026-10-15 | The yard is about 38 × 50 m and wraps around the station inside a fence. The north mast stands about 26 m north-west of the airlock. The tether runs from the outer airlock door west along the south wall, past the frozen west door, then north to the mast: about 47 m, so the round trip at snow walking speed (70% of indoors) plus the 4 s inspection takes about 75 seconds. |
| 2026-10-15 | A three-sided fuel shed stands east of the generator room, open to the west. From night 3 the generator room keeps one jerry can and the shed holds two more, so a long night means a trip outside for fuel. |
| 2026-10-15 | Body heat (BODY on the HUD, shown outside or while it's below full) drains about 0.45 per game minute outside, twice that in a gust: roughly 2 real minutes outside in calm air. It comes back indoors, fast where it's warm. At 0 the night is lost to exposure. |
| 2026-10-15 | Whiteout gusts come every 70 to 140 game minutes (45 to 90 on night 5) and last 12. Visibility drops from about 14 m to 4 m and walking slows to 55% of indoor speed. |
| 2026-10-15 | An open outer door cools the station 1.6 times faster, and 3 times faster if a door from the airlock into the station is open too. It leaks heat even with the heater running. |
| 2026-10-15 | Antenna icing (nights 3 to 5) turns the radio and the met console to static until the player knocks the ice off the mast antenna (3 s hold). |
| 2026-10-15 | Night 3's scripted moment is now the second set of footprints: they appear beside the player's trail once the mast has been checked, and carry on north past the fence. Night 3's 03:00 anomaly moment is gone. |
| 2026-10-15 | Outdoor surfaces ignore the station's point lights so interior lights never shine through walls onto the snow; outside, the light comes from the moon, the window glow, the door lamp, the mast beacon and the flashlight. |
| 2026-10-15 | Save codes added at the owner's request, `OP1:` prefix, local only: the code is made and read in the page, nothing is sent anywhere. It carries the whole save, settings included. Back up and Restore sit under "Save code" on the title screen and the pause menu. |
| 2026-10-15 | M8 is split into two pull requests: first the story content (logs, notes, tapes, changes between nights), then Vance's bunk room, night 5's 03:00 call and the endings. |
| 2026-10-15 | Nights 3 to 5 get five log entries each (Vance's days 14 to 19), one per reading; the last is Vance's final entry at 02:58 on day 19. Six more notes: two on night 3 (one in the fuel shed), one on the window sill and one in Vance's room on night 4, one at the mast and one on the radio on night 5. |
| 2026-10-15 | Recorder tapes: Vance's pocket recorder turns up with one tape a night, and playing it shows a transcript (text only, like the radio). Nights 1, 2, 3 and 5 are Vance; night 4's is Hollis's tape, found in Vance's bunk room. Played tapes are saved and listed at the keeper terminal. |
| 2026-10-15 | Changes between nights: Hollis's mug moves every night (by the sink, the met console, Vance's bedroll, the window sill under the handprints, then the floor in front of the west door). Vance's bedroll is in the generator room from night 3; frost handprints on the inside of the north window and an open locker from night 4. |
| 2026-10-15 | Notes, tapes and the mug can be picked up through the furniture they lie on, and have grab areas bigger than they look, so they're easy to aim at on a phone. |
| 2026-10-15 | Vance's bunk room is 4 × 3 m, south of the main room between the bookcase and the keeper terminal (x −6 to −2, z 5 to 8), so the footprint grows to about 16 × 14 m plus that corner. It has no light of its own, so it counts as dark for NERVES. Its door is taped shut on nights 1 to 3 (locked), can be cut open with a 2 s hold on night 4, and stays usable on night 5. Inside: Vance's bunk with a note on the pillow, his desk with Hollis's count copied on the wall, and Hollis's tape in front of a loose wall panel. The tether moved half a metre south to clear it. |
| 2026-10-15 | The west door is a real door now, frozen shut except from 03:00 to 04:00 on night 5. Then it unfreezes and Vance's voice calls through it every 6 game minutes (written as subtitles). Opening it chills the main room as fast as an open airlock with both doors open. At 04:00 it freezes again if it's still shut. Night 5 still has three knocks at 03:00. |
| 2026-10-15 | The Answer ending: open the west door in that hour and stay outside. The screen fades to white over about 6 real seconds; going back inside lets it fade away again. Its closing keeper log is built from the last five things the player said on the radio. |
| 2026-10-15 | Relief: survive night 5 without answering. The pilot asks who has been sending the readings, since the station's radio went dead nine days ago. The secret third ending, "The Record", replaces Relief when the player has found every log entry and every note across the campaign (tapes don't count): they hand everything over, the Service closes Kestrel-4, and the north mast keeps transmitting by itself. Answer wins over both. Endings seen are saved. |
| 2026-10-15 | All three endings finish with a short credits list (Longlight Interactive, three.js, Kenney). M9 polishes it. |
| 2026-10-15 | M9 balancing used a simulated player who reacts late, walks to every fault, fetches parts and spends the real 70 seconds outside on the mast trip. On nights 3 to 5 the average player survived about 85%, 85% and 75% of seeds; a slow first-timer about 75%, 60% and 40%. Night 1 is never lost and night 2 about 5%. Night 4's heater faults and night 5's stalls, fuses, fuel line and window are a little rarer, and night 5 starts at 4 °C. |
| 2026-10-15 | Each reading now recovers its own log entry (the 20:00 reading gives the night's first entry, the 04:00 its last), so a missed reading costs only its own entry and night 5's last reading always holds Vance's final log. An iced antenna holds an open reading's window until the ice is cleared: the trip outside costs time, not the reading. |
| 2026-10-15 | Title screen: a one-line pitch, a Credits screen, and "Endings found: n of 3" once any ending is seen. Endings seen survive starting a new campaign. A loading screen built into the page shows until the station is ready. |
| 2026-10-15 | Accessibility pass: subtitles and status lines are announced by screen readers; "Reduced flicker" is now "Reduced flicker and motion" and also turns off head bob; it starts on when the device asks for reduced motion. |
| 2026-10-15 | itch.io: `itch/index.html` embeds the live Pages build in a full-size frame (one tiny upload, always up to date), and `npm run build:itch` makes a self-contained copy with relative paths for uploading instead. Page text and settings are in docs/ITCH.md. The price stays the owner's call (open question above). |
| 2026-10-15 | itch.io is on hold: the owner will put Outpost on itch.io later, together with their other games. GitHub Pages stays the only home for now. The price question stays open until then. |
| 2026-10-16 | Surface texture pass: every surface now carries a procedural, tiling texture drawn on a canvas at start-up (no downloads), with a bump map so lights pick out relief. Props and doors share a brushed-paint grain; walls get a painted-panel texture that repeats once per wall height (grime low down, rivet rows, chips); floors are speckled lino tiles and bolted tread plate; the ceiling is perforated tiles on a grid; the snow is a rippled crust that also rimes the cladding. UVs are laid out in world metres so patterns line up across parts and rooms. The debug panel cycles surfaces full → flat → off for comparison; sizes and strengths are in `config.render.surfaces`. Walls bake into their own mesh (+1 draw call). |
