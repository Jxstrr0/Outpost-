# Outpost: Design Doc and Build Handoff

Exported from the Claude Docs design doc on 2026-10-15 · Longlight Interactive
Refreshed against the code on 2026-10-24. This document now describes the game as built.
Anything planned but not built is in a "Not built yet" note in its section. The
"Decisions log" at the end overrides anything earlier in the document.

## Overview

Outpost is a first-person survival-mystery game in a browser: you are the lone keeper of an arctic weather station for five nights, keeping failing systems alive while a logbook reveals what happened to the keeper before you.

| Item | Decision |
|---|---|
| Genre | First-person systems survival with environmental storytelling |
| Comparable games | Five Nights at Freddy's (night structure), Firewatch (isolation and voice), FTL (juggling failing systems), Iron Lung (contained dread) |
| Platform | Web browser, phone first, desktop fully supported; hosted on GitHub Pages |
| Engine | Three.js 0.186.1, plain JavaScript ES modules, Vite 8.3.4 build |
| Session length | One night's clock runs 7.5 real minutes (720 game minutes at 1.6 a second); reading panels pause it, so a night is about 8 to 12 minutes in practice. Full campaign: roughly an hour |
| Scope (as built) | Five handcrafted nights, one station interior plus a fenced yard, three endings |
| Status | Complete: all milestones M0 to M9 are built and live |
| Studio | Longlight Interactive |

The original single-file prototype (`outpost.html`) was never committed to the repo. It proved three things: the three-system juggle (power, fuel, heat) creates tension on its own; reading logs between emergencies paces the story naturally; and a full 3D scene with generated audio runs smoothly on a phone. M1 rebuilt that loop from this document's tables rather than porting code.

## Design pillars

Every feature must serve at least one of these four pillars; anything that serves none gets cut.

1. **Quiet dread, not jump scares.** Fear comes from what the station implies: a light that shouldn't be on, a reading that doesn't add up, three knocks. At most one scripted scare per night, and never a monster on screen.
2. **Too many jobs, one pair of hands.** The player should always have two problems and time for one. Systems fail independently, so priorities change minute to minute.
3. **The station is the storyteller.** Lore lives in objects: logs, notes, recordings, a moved mug, a rearranged room. No cutscenes, no narrator, no exposition dumps.
4. **Readable on a phone in the dark.** Every interaction works with one thumb. The HUD is minimal, text is legible at arm's length, and nothing important is communicated by sound alone (every sound has a subtitle).

The target feeling at the end of a night: relief, then the urge to read one more log before quitting.

## Core loop and systems

Each night the player survives from 18:00 to 06:00 by keeping power, fuel and heat above failure while completing scheduled duties, which unlock story.

The minute-to-minute loop: notice a problem (HUD, sound, light change) → walk to it → fix it → do a duty if there's time → read what the duty unlocked → the next problem arrives.

No random failure happens in the first 20 game minutes of a night (`failures.graceMinutes`).

### Resources

All numbers are from `src/config.js`.

| System | Range | Goes up by | Goes down by | Failure state |
|---|---|---|---|---|
| Battery power | 0 to 100% | Generator running (+0.36 a game minute, 0.6× with a frozen fuel line) | Base load 0.08, lights 0.06, heater 0.20 a game minute; the flashlight recharging 0.02 | At 0%: lights, heater and consoles off, red emergency light only. HUD meter red below 20 |
| Generator fuel | 0 to 100% | Pouring jerry cans (+30 each) | Burns 0.12 a game minute while the generator runs, 2.5× with a frozen line | At 0%: generator stops and won't restart until refuelled. Red below 15 |
| Inside temperature | −30 to +18 °C | Heater on with power (0.012 of the gap to 18 °C each game minute) | Cooling toward −30 °C at 0.0045 of the gap, faster with a cracked window (2×) or open outside doors (1.6× or 3×) | Below −6 °C for 80 game minutes: frozen, night lost. Minutes recover one for one above −6. Red below 0. Screen frost from 5 °C, full at −10 |
| Nerves (sanity, nights 3 to 5) | 0 to 100 | Standing in light (+0.03), warmth 10 °C or more (+0.02), logging a reading (+5), answering the radio (+4), eating a ration (+12, and losses halved for 90 game minutes) | Dark (−0.11, halved with the flashlight on), inside temperature below 0 °C (−0.06), scripted moments (knocks 8, roof steps 6, anomaly 10, radio echo 8, footprints 10) | Below 30: hallucinated sounds and fake HUD alerts about every 22 game minutes; at 0: breakdown, night lost |
| Body heat (nights 3 to 5, outside) | 0 to 100 | Indoors: +1.6 a game minute when the station is 5 °C or warmer, else +0.4 | Outside: −0.45 a game minute, 2× in a gust | Red and screen frost below 35; at 0: exposure, night lost |
| Flashlight cell (night 2 on) | 0 to 100 | Recharges 0.9 a game minute while off, if the station has power | Drains 0.5 a game minute switched on (0.6× that with the better cell) | Warns and flickers below 15; a cell under 3 won't switch on; dead at 0 |

### Failures

Failures are random but weighted per night by that night's JSON (`failures` table). Each has a location, a tell, and a fix, so the player learns to recognise them by sound before seeing them. Average spacings are game minutes at weight 1.

| Failure | Tell | Fix | First night | Average spacing |
|---|---|---|---|---|
| Generator stall | Hum stops, alarm buzzes every few seconds, lamp blinks red | Restart at the generator: a 2.4 game-minute crank, 30% chance each try fails | 1 | 85 while running |
| Tripped breaker | Clunk, main room goes dark, panel buzzes | Reset at the breaker panel beside the generator room doorway | 1 | 230 while the heater runs |
| Heater fault | Pop; grille stops glowing while the lights are on | Take a spare fuse from the supply room shelves, hold Use at the heater (1.5 s) | 2 | 520 while the heater runs |
| Frozen fuel line | Generator sputters, burns fuel 2.5× faster and charges 0.6× | Take the heat gun from the supply room, hold Use at the generator (10 s). The heat gun is never used up | 3 | 420 while running |
| Antenna icing | Radio and met console go to static; the radio hisses | Go outside to the north mast, hold Use on the antenna (3 s). An open reading's window is held until the ice is cleared | 3 | 480 |
| Window crack | Wind gets louder, glass ticks, station cools 2× faster | Take seal tape from the supply room, hold Use at the north window (4 s) | 4 | 520 |

Parts: the station starts each night with 2 spare fuses, 2 rolls of tape and 1 ration (`stock`), plus the supply drop. The player carries one fuse, one roll of tape and the heat gun at a time in their pockets. A jerry can takes both hands.

### Duties

Duties are the player's job and the story's delivery system. Missing a duty costs story, not the night.

- **Weather readings** at the met console, five a night at 20:00, 22:00, 00:00, 02:00 and 04:00, each open for 65 game minutes. Each logged reading recovers its own keeper log entry (the 20:00 reading gives the night's first entry, the 04:00 its last). Some readings are anomalies: the north mast reads 6.5 to 11.5 hPa under the south mast. The console needs power and a clear antenna.
- **Radio check-ins** at the radio set in the supply room, nights 2 to 5: two calls a night, three on night 4. A call rings for 40 game minutes, then it is missed. The reply the player picks is remembered as a tag (saved with the game) and later calls change their lines because of it. Needs power and a clear antenna.
- **Mast inspection**, once a night on nights 3 to 5: follow the tether to the north mast and hold Use on the instrument box (4 s). On night 3 this sets off the second set of footprints.

### Tuning baseline

All numbers live in `src/config.js` so they can be changed without touching code. Time runs at 1.6 game minutes per real second in a fixed step of 10 ticks a second (0.16 game minutes a tick).

| Value | Number in config.js |
|---|---|
| Generator charge | +0.36% battery per game minute |
| Fuel burn | 0.12% per game minute |
| Base load / lights / heater | 0.08 / 0.06 / 0.20% per game minute |
| Generator stall | about once every 85 game minutes while running |
| Breaker trip | about once every 230 game minutes while the heater runs |
| Heating / cooling rate | 0.012 / 0.0045 toward target, per game minute |
| Starting power / fuel / temperature | config default 68% / 30% / 7 °C; nights override: N1 68/30/7, N2 64/26/6, N3 62/24/5, N4 60/22/4, N5 58/20/4 |
| Jerry cans | N1: 3 in the generator room. N2: 2. N3 to N5: 1 inside plus 2 in the fuel shed outside |
| Whiteout gusts | every 70 to 140 game minutes (45 to 90 on night 5), lasting 12 |

## Narrative

The player is the third keeper of Station Kestrel-4 in two years; both keepers before them walked out into the storm at 03:00 and were never found, and the player slowly learns why.

### The truth (for writers only, never stated outright in game)

Something lives under the ice north of the station. It shows up on instruments as a pressure drop at the north mast that the south mast never sees. It cannot enter the station. It can only make the keeper want to come out: it imitates voices on the radio, leaves tracks that lead to the door, knocks, and rearranges small things inside to make the keeper doubt their own mind. The Polar Meteorological Service knows keepers go missing at Kestrel-4 and keeps staffing it anyway, because the anomaly data is valuable.

### Characters

| Character | Role | How the player meets them |
|---|---|---|
| R. Vance | The previous keeper, 19 days on station | Keeper log (25 entries, days 1 to 19), handwritten notes, pocket recorder tapes |
| Hollis | The keeper before Vance | Vance's mentions, the mug with HOLLIS scratched in it, one undated tape found in Vance's room on night 4 |
| Dispatch (Imogen Price) | Voice of the Polar Met Service on the radio | Radio check-ins from night 2 |
| The player | New keeper, never named or seen | Their own reading log and radio replies |

### Story channels (as built)

- **Keeper log** at the desk terminal (`logs.json`, 25 entries `v01` to `v25`, five a night). Entries show corrupted until their reading is logged. The terminal also lists the tapes played.
- **Handwritten notes** around the station (`notes.json`, 10 notes `n01` to `n10`, two a night, each with a spot named in the night's JSON: by the jerry cans, on the table, the breaker, the met console, the bedroll, the shed wall, the window sill, Vance's pillow, the mast box, the radio desk).
- **Recorder tapes** (`tapes.json`, five). Vance's pocket recorder turns up in a new spot each night with a tape; playing it shows a transcript. Nights 1, 2, 3 and 5 are Vance (days 2, 8, 14, 19); night 4's is Hollis's, behind a loose panel in Vance's room.
- **Radio** (`radio.json`, nine calls: `n2a`, `n2b`, `n3a`, `n3b`, `n4a`, `n4b`, `n4c`, `n5a`, `n5b`), each with two replies. Lines can show or hide depending on tags from earlier replies (`if` / `unless`). Night 4 has three calls, so Dispatch can call and then call again. Night 2's scripted moment plays the player's own last reply back through the radio.
- **The station itself.** Small changes between nights, set in each night's `station` block: Hollis's mug moves every night (sink, met console, Vance's bedroll, the window sill, the floor in front of the west door, each with its own line of text); Vance's bedroll is in the generator room from night 3; frost handprints inside the north window and an open locker from night 4.

### Rules for writing

Short entries, under 60 words each (the longest log entry is 47 words). Concrete details over adjectives. Never confirm the creature; let the player assemble it. Every entry should change what the player suspects or what they do next. Fictional names only.

## Campaign structure

The campaign is five nights (`nights.json` lists the order); each night adds one new system or space and one new kind of wrongness, and each ends with a short daytime summary screen. Each night's JSON also carries a `newTonight` list shown on its night card.

| Night | New mechanic | New space | Story beat | Scripted moment (from the night's JSON) |
|---|---|---|---|---|
| 1 | Power, fuel, heat, readings; first-night hints | Main room, generator room | Vance's early logs; the pressure mismatch | Three knocks at 03:00 |
| 2 | Flashlight, radio check-ins, heater fuses | Supply room and airlock (outer door still frozen) | Tracks that lead to the door; Dispatch dodges questions about Vance | The radio plays your own words back at 02:40 |
| 3 | Nerves, frozen fuel line, antenna icing, mast inspection, body heat, gusts | Yard, tether, fuel shed and north mast | Vance starts sleeping in the generator room | A second set of footprints beside yours, once the mast is inspected |
| 4 | Window crack, three radio calls | Vance's taped-shut bunk room (cut the tape, 2 s) | Hollis's tape; the Service knew | Dispatch calls, then calls again (done through the radio script, no `scripted` entry) |
| 5 | All failures at their highest weights, gusts twice as often | The west door, free from 03:00 to 04:00 | Vance's last entry at 02:58; the choice | Three knocks at 03:00, then Vance's voice through the west door every 6 game minutes |

### Between nights

A one-screen "day" summary: readings logged out of five, log entries recovered, lowest temperature, notes found and (nights 3 to 5) whether the mast was inspected. Then the supply drop: choose two of fuel cans (+2 jerry cans), heater fuses (+2), proper food (+2 rations), or a better flashlight cell (drains 40% slower). This is the only meta-progression. Choices are saved per night, so retrying a lost night keeps them.

### Endings (three)

- **Relief.** Survive night 5 without walking out of the west door. The helicopter lands at 06:00. The pilot asks who has been sending the readings, since the station's radio went dead nine days ago.
- **The Record** (secret). Replaces Relief when every log entry and every note across the campaign has been found (tapes don't count). They hand everything over, the Service closes Kestrel-4, and the north mast keeps transmitting by itself.
- **Answer.** Open the west door between 03:00 and 04:00 on night 5 and walk out into the white. After 10 game minutes outside the screen is white (going back inside lets it fade over 4). The closing keeper log is built from the last five things the player said on the radio.

Answer wins over the other two. All three end on a short credits list (`credits.json`). Endings seen are saved and survive a new campaign; the title screen shows "Endings found: n of 3".

A night is lost by freezing, by nerves reaching zero (breakdown), or by body heat reaching zero outside (exposure); the lost screen's text is in `outcomes.json`. The player retries that night from its start with the same supply choices.

## Station layout

The station is one single-storey prefab about 16 × 14 m plus Vance's corner, inside a fenced yard with a fuel shed and the north mast. Every room is reachable in a few seconds of walking so failures stay a dash, not a trek. Sizes below are from `src/world/layout.js` (north is −z).

| Space | Size | Contents | Open from |
|---|---|---|---|
| Main room | 11 × 10 m | Keeper terminal, met console, heater, light switch, bunk, table, sink, bookcase, west door, north window | Night 1 |
| Generator room | 5 × 10 m | Generator, jerry cans on the east wall, breaker panel by the doorway, recorder shelf; Vance's bedroll from night 3 | Night 1 (open doorway) |
| Supply room | 4 × 4 m | Shelves with fuses, tape, heat gun and rations; the radio set | Night 2 |
| Airlock | 3 × 2 m | Gear hook, inner door to the main room, side door to the supply room, outer door to the yard | Night 2 (outer door frozen until night 3) |
| Yard and north mast | 38 × 50 m fence | Snow, tether rope, three-sided fuel shed east of the generator room, mast with a red beacon and the instrument box, about 34 m from the outer door in a straight line (47 m along the tether) | Night 3 |
| Vance's bunk room | 4 × 3 m | Taped shut; his bunk and pillow note, desk with Hollis's count on the wall, parka, loose wall panel with Hollis's tape. No light of its own | Night 4 (night 5 unlocked) |

Layout rules, as built:

- One loop: main room → generator room → supply room → airlock → main room (door ids `supply`, `airlockSide`, `airlockInner`). The outer door `airlockOuter` leads outside; `bunkRoom` and `west` open off the main room. Doors are `locked`, `taped`, `closed` or `open`; anything a night's JSON doesn't list stays locked.
- The north window and the west door are both in the main room with the met console, so the player watches them while doing the duty that matters most.
- Outside is short and hostile: the tether runs from the outer door west along the south wall, past the west door and north to the mast; walking is 70% of indoor speed in snow and 55% in a gust; fog visibility is about 14 m, 4 m in a gust; body heat drains the whole time. The round trip plus the inspection takes 60 to 90 real seconds (tested headless).
- An open outer door cools the station 1.6× faster, 3× if an inner airlock door or the west door is open too, even with the heater running.

## Art, lighting and audio

The look is stylized low-poly realism: simple shapes, honest materials, and almost all of the mood carried by light, fog and sound rather than detailed models.

### Visual style (as built)

- **Models:** every prop is built in code from low-poly shapes (`src/world/kit.js`, `props.js`, one file per room in `rooms/`) and baked into one mesh per room. No `.glb` files are loaded; `public/models/` is empty on purpose. Individual props could still be swapped for `.glb` models later.
- **Surfaces:** procedural tiling textures drawn on canvases at start-up (`textures.js`, 512 px floors, half that for grain) with bump maps: brushed paint on props and doors, painted panels with grime and rivets on walls, lino and tread plate floors, perforated ceiling tiles, rippled snow crust. Sizes and strengths in `config.render.surfaces`.
- **Palette:** cold blue-grey steel, dull olive fabric, safety orange and yellow for things the player interacts with (`assets.js`).
- **Screens:** amber for the met console, green for the keeper terminal, drawn live on canvas textures with scanlines (`screens.js`), refreshed 6 times a second. They show NO MAIN POWER in a blackout and static while the antenna is iced.
- **Graphics setting** (`quality.js`): Auto, Low, Medium or High. Low draws at plain resolution with flat surfaces, no flashlight shadows and half the snow; Medium up to 1.5× resolution with everything on; High up to 2×. Auto starts desktops on High and phones on Medium (Low on a phone reporting 2 GB of memory or less), then steps down one level whenever play averages under 40 fps for 4 seconds. It never steps back up by itself.

### Lighting states (as built)

Four point lights in total (main room, generator room, one shared by the supply room and airlock, the heater glow), plus a hemisphere light, a blue moon light and the flashlight. Lights are dimmed, never added or removed, during play.

| State | When | Look |
|---|---|---|
| Normal | Circuit live and power above 25% | Cool white fixtures, soft blue moonlight from the window |
| Unstable | Generator off or power under 25% | Fixtures dim and flicker at random (steady dimming with Reduced flicker on) |
| Blackout | Power 0% or breaker tripped | Red pulsing emergency light (18% of the main light), screens at 15% brightness. A tripped breaker darkens only the main room; a flat battery darkens everything. Darker still once the player owns a flashlight |
| Anomaly | Scripted moments | Every light stutters together for 1.2 s, then holds dark for 2 s |

The flashlight arrives on night 2 (`flashlight: true` in the night's JSON): a spotlight on the camera that casts the only shadows in the game (off on Low graphics). Outdoor surfaces ignore the station's point lights, so interior light never leaks through the walls onto the snow.

### Audio (as built)

Audio is half the game. Generated sound from `synth.js` is the base; recorded CC0 layers from Kenney's packs (`public/audio/`, mono MP3 plus one WAV engine loop, about 0.5 MB in total) play on top. Audio starts on the first "Begin shift" tap, because phone browsers block it until then.

- **Always on:** wind that shifts and gusts (louder outside, with the outer door open, or with a cracked window), building creaks, distant metal groans, fluorescent buzz, the radio's standby hiss.
- **Positional:** every sound has an emitter at its source, run through a low-pass filter that closes with each wall or shut door between it and the player (`space.js`, hops through open doorways), then head-related (HRTF) panning, so a fault can be found by ear.
- **Tells:** every failure has its own sound, and the tell repeats while the fault lasts: stall alarm every 2.4 s, empty-tank beep every 3.5 s, breaker panel buzz every 3.2 s, a cooling engine ticking for 45 s, sputters with a frozen line, glass ticks with a cracked window, loud static with an iced antenna.
- **Dread layer:** knocks, roof steps, whispers, the radio echo, the west door voice, plus hallucinations below 30 nerves (knocks, roof steps, whisper, fake stall, fake breaker, fake call). Used sparingly, from specific directions.
- **Subtitles** for every sound, saying where it came from ("to your right, in the generator room"), repeated every 20 s for a lasting tell; text in `subtitles.json`.
- **Music:** none during play. One low drone on the summary and ending screens.

## Controls, HUD and UX

The game is designed phone-first in landscape; desktop gets keyboard and mouse with identical actions.

| Action | Phone | Desktop |
|---|---|---|
| Move | Floating stick, anywhere on the left half | WASD or arrow keys |
| Look | Drag on the right half | Mouse (pointer lock after clicking the game) |
| Use / interact | USE button, bottom right | E or left click |
| Hold to repair | Hold USE | Hold E or the mouse button |
| Flashlight (night 2 on) | TORCH button above USE | F |
| Pause / settings | II button, top centre | Esc |

Notes, tapes and the mug can be picked up through the furniture they lie on (`player.pickupThroughProps`), with grab areas bigger than they look, so they're easy to aim at on a phone. A touch on a desktop page switches the controls to touch mode.

### HUD (as built)

- Top left: clock, then thin meters: POWER, FUEL, TEMP, plus TORCH once the flashlight is owned, NERVES on nights 3 to 5 and BODY while outside or below full. Meters turn red below their danger line.
- Top right: the single most urgent objective in one line (`computeObjective` in `hud.js`), with where to go underneath.
- Centre: a small ring crosshair that grows and turns orange when an object can be used, with its action named below ("Restart the generator"). Holds show a progress ring.
- Bottom centre: up to three short status messages that fade after 4 seconds.
- Screen-edge frost that grows as the station or the player gets cold.
- Night 1 hints: a short banner under the pause button (`hints` list in `night1.json`), three on a timer at the start, then one each the first time a reading opens, the generator stalls, the breaker trips or the tank runs dry. Each shows once ever (ids saved as `hintsSeen`) and the Hints setting turns them off. Later nights can add their own lists; none do yet.

### Panels

Logs, notes, tapes, the met console and the radio open as full-screen panels that pause the game. The game pausing during reading is deliberate: story never competes with survival. Switching away from the tab pauses too.

### Settings (as built)

Look sensitivity, invert Y, master and effects volume, subtitles, hints on the first night, reduced flicker and motion (steady dimming instead of strobing, and no head bob; starts on when the device asks for reduced motion), text size (small, medium, large) and graphics (Auto, Low, Medium, High). Settings are part of the save and the save code.

## Technical architecture

The game is plain JavaScript ES modules on Three.js, built with Vite into a static site, so GitHub Pages can host it with no server.

### Stack (as built)

| Piece | Choice | Why |
|---|---|---|
| Rendering | `three` 0.186.1 from npm, exact pin | Same library as the prototype; only the core and `BufferGeometryUtils` are used (no GLTFLoader, no PositionalAudio: audio uses the Web Audio API directly) |
| Language | JavaScript, no TypeScript | Lower barrier for a beginner-plus coder; JSDoc comments for clarity |
| Build | Vite 8.3.4 | Instant local dev server, bundles for production, simple GitHub Pages setup |
| Tests | Node 22's built-in `node --test` | Headless simulation tests, no browser, no extra packages |
| Content | JSON files for nights, logs, notes, tapes, radio, endings, outcomes, supplies, subtitles, credits | Story can be edited without touching code |
| Saving | localStorage, wrapped in try/catch, plus `OP1:` save codes | Works on GitHub Pages; no accounts needed |
| Hosting | GitHub Pages via GitHub Actions | Free, deploys on every push to main |

### Folder structure (as built)

```
outpost-/
  index.html                page with the built-in loading screen
  package.json              scripts: dev, build, preview, test, build:itch
  vite.config.js            base '/Outpost-/'
  CLAUDE.md                 standing instructions for Claude Code
  README.md                 Kelbo's player and editing guide
  docs/
    DESIGN.md               this document
    ITCH.md                 itch.io steps and page text (on hold)
  itch/index.html           itch.io embed of the live Pages build
  public/
    audio/                  Kenney CC0 layers (mp3, one wav) and CREDITS.md
    models/                 empty on purpose: props are built in code
  src/
    main.js                 boot, renderer, game flow, debug wiring, main loop
    config.js               every tuning number
    core/                   state.js, events.js, rng.js, clock.js, save.js, savecode.js, debug.js
    systems/                index.js (step order), time, failures, power, fuel, heat, duties,
                            flashlight, radio, sanity, outside, westdoor, doors, repairs, player
    player/                 controller.js, input-desktop.js, input-touch.js, interact.js, actions.js
    world/                  station.js, rooms/ (shell, builder, main-room, generator-room,
                            supply-room, airlock, bunk-room), layout.js, exterior.js, lighting.js,
                            flashlight.js, textures.js, quality.js, props.js, kit.js, decals.js,
                            story-props.js, screens.js, assets.js
    audio/                  audio.js, synth.js, samples.js, space.js
    ui/                     hud.js, panels.js, menus.js, toasts.js, hints.js, styles.css
    story/                  nights.js, scripted.js, endings.js, logs.js, radio.js
    story/data/             nights.json, night1..5.json, logs.json, notes.json, tapes.json,
                            radio.json, endings.json, outcomes.json, supplies.json,
                            subtitles.json, doors.json, credits.json
  test/                     systems, savecode, audio, hints, quality tests
  .github/workflows/
    deploy.yml
```

### Rules the code follows

1. **One game state object** (`createState` in `core/state.js`) holds every number: time, power, fuel, temperature, nerves, body heat, doors, inventory, readings, calls, flags. Only `systems/` write to it; everything else reads.
2. **Systems never touch the scene.** They emit events (`generator:stalled`, `reading:logged`, `westDoor:voice`). World, audio and UI listen and react. No file in `systems/` or `core/` imports Three.js, which is what lets the tests run headless.
3. **Fixed simulation step** of 10 ticks a second (0.16 game minutes each), separate from rendering, with a cap of 20 steps a frame so a stalled tab can't fast-forward the night. The debug panel can run at 1×, 4× or 16×.
4. **Seeded randomness** per night (`core/rng.js`, mulberry32; `?seed=123` fixes it), so a reported bug can be replayed exactly.
5. **Content is data.** Adding a log, note, tape, radio line, hint or night is a JSON edit.
6. **Debug mode** at `?debug=1`: skip time, set any meter, trigger any failure or scripted event, play any tell, jump to any night, force an outcome or ending, unlock doors, give the flashlight, fill pockets, ring the radio, hallucinate, go outside, start a gust, free the west door, cycle surfaces and graphics, replay hints, wipe the save. It shows fps, draw calls, triangles and point lights. `window.__outpost` exposes the game for browser automation.

### Save data (as built)

One localStorage key, `outpost.save.v1`, storing: highest night reached, current night, supply choices per night, logs, notes and tapes found, endings seen, hints seen, radio tags and the last five things said on the radio, and settings. A night in progress is not saved; Continue restarts the current night.

**Save codes** (`core/savecode.js`) move that save between browsers and phones with no server. Back up (title screen or pause menu, under "Save code") shows the whole save as one line of text starting `OP1:`, with a Copy button. Restore takes a pasted code, shows what's in it next to what's saved now, asks before replacing anything, then writes the whole save in one go. The code is the save as JSON in base64url (letters, digits, `-` and `_`, so chat apps leave it alone) plus a 6-character checksum, so a code with a missing or changed character is turned down with a plain message instead of half-loading. Codes from another game, from a newer version (`OP2:`, or a save version above 1) or with a field of the wrong type are turned down the same way. Fields missing from an older code get their defaults. Pastes over 20,000 characters are refused.

### Performance budget

| Budget | Target | As of 2026-10-24 |
|---|---|---|
| Frame rate | 60 fps on an iPhone 12-class phone, 30 fps floor | Not re-measured in this refresh. Auto graphics steps down under 40 fps |
| Triangles on screen | under 100,000 | Shown live in the debug panel; not recorded here |
| Draw calls | under 150 | Decisions log: the station draws in about 25, plus one for the walls |
| Dynamic lights | 4 point lights plus the flashlight; shadows only from the flashlight | Met |
| Total download | under 15 MB | `dist/` is about 1.3 MB: 765 KB of JavaScript (211 KB gzipped), 15 KB CSS, 0.5 MB audio |
| First load on 4G | under 5 seconds to the title screen | Not measured |

## Repo and GitHub Pages deployment

The repo is the public GitHub repository `Jxstrr0/Outpost-`; every push to `main` tests, builds and publishes the game at https://jxstrr0.github.io/Outpost-/ within about two minutes.

### One-time setup (done)

The repo exists, Pages is set to "GitHub Actions" as its source, and the first deploy succeeded. The prototype file was never uploaded (see the Decisions log). Nothing here needs doing again unless the repo moves.

### The workflow (as in the repo)

`vite.config.js` sets the base path to the repo name, or every asset would 404 on Pages:

```
export default defineConfig({ base: '/Outpost-/', build: { target: 'es2020', chunkSizeWarningLimit: 900 } });
```

`.github/workflows/deploy.yml` ("Deploy to GitHub Pages") runs on pushes to `main`, on pull requests into `main`, and by hand. One `build` job on Node 22 runs `npm ci`, `npm test`, `npm run build`, then (not on pull requests) uploads `dist/` and a `deploy` job publishes it. Pull requests therefore get the tests and the build as a check and nothing is published until the merge. The concurrency group is per branch (`pages-${{ github.ref }}`). Action versions: checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5.

### Day-to-day workflow

- Claude Code works on a branch, opens a pull request, and merges it once `npm test` and `npm run build` pass and the PR check is green (standing permission from Kelbo). Merging to `main` deploys.
- Test on your phone by opening the Pages link after each merge. Add it to your home screen for a full-screen feel.
- If a deploy fails, the Actions tab shows the red step; paste that error into Claude Code.

## Milestones

Built in ten milestones, in order; each one ended deployed and playable on the Pages link. Status as of 2026-10-24, checked against the code. Where a "done when" line needs a person (a phone frame rate, a feeling, strangers playing), there is no written record, so it is marked unverified rather than claimed.

1. **M0, Foundation.** Done. Vite project, folder structure, deploy workflow.
   - Done when: the Pages link loads on your phone and desktop. Met (the game is live).
2. **M1, Port the prototype.** Done, rebuilt from this document rather than ported (no prototype file).
   - Done when: the live game plays like the prototype and every tuning number lives in `config.js`. Met.
3. **M2, Engine hardening.** Done. Event bus, fixed timestep, seeded RNG, save system, debug panel, pause menu and settings.
   - Done when: `?debug=1` can skip to 03:00 and trigger every failure; settings survive a reload. Met.
4. **M3, Night system.** Done. Nights load from JSON; day summary; supply drop; retry a lost night.
   - Done when: nights 1 and 2 play back to back. Met.
5. **M4, Real station.** Done, with props built in code instead of downloaded models. Supply room, airlock, flashlight, lighting states.
   - Done when: the station looks finished in all lighting states and holds 60 fps on your phone. Look: met. 60 fps on a phone: unverified.
6. **M5, Audio pass.** Done. Positional audio, recorded layers, a tell for every failure, subtitles.
   - Done when: you can find a stalled generator with your eyes closed. Tested headless for routing; by ear: unverified.
7. **M6, New systems.** Done. Radio check-ins, nerves, heater fuses, frozen fuel line, window crack, hold-to-repair.
   - Done when: each system works in debug mode and appears on its intended night. Met (tests cover each).
8. **M7, Exterior.** Done. Yard, tether, mast inspection, body heat, gusts, antenna icing, footprints.
   - Done when: night 3's mast trip takes 60 to 90 seconds. Met (tested); "tense" is a judgement call.
9. **M8, Full content.** Done in two pull requests. All five nights, 25 logs, 10 notes, 5 tapes, 9 radio calls, Vance's room, the west door, three endings.
   - Done when: the campaign can be completed start to finish on every ending. Met (the debug panel can also jump to each ending).
10. **M9, Polish and launch.** Done except the launch itself. Balancing with a simulated player, title screen, credits, accessibility pass, loading screen, itch.io embed page and build script.
   - Done when: three people who haven't seen it finish night 1 without help. Unverified: no playtest record. The itch.io page is on hold by Kelbo's decision.

### After M9

Not milestones, but shipped since: procedural surface textures (2026-10-16), the Graphics setting with Auto step-down (2026-10-17), title, settings and supply screens fitted to a sideways phone (2026-10-17 to 10-19), Night 1 onboarding hints (2026-10-20).

### Not built yet

- The itch.io page itself (files ready in `itch/` and `docs/ITCH.md`).
- Voice acting (text only, by decision).
- Hints on nights 2 to 5 (the system supports a `hints` list per night; only night 1 has one).
- `.glb` models (the station is built in code; `public/models/` is empty).

## Claude Code handoff

The live instructions are the `CLAUDE.md` at the repo root; keep it in step with the code. The original handoff copy of `CLAUDE.md` and the first-session prompt (set up M0, with a spinning cube) have been removed from this document because they were out of date. To start a session now: read `CLAUDE.md`, then this document's Decisions log, then the part of the code the task touches.

## Risks and open questions

The biggest risk was scope creep in art and the exterior; the fallback for each risk was to cut toward the prototype loop, which is already fun. How each one played out:

| Risk | Likelihood | Fallback | What happened |
|---|---|---|---|
| Models and art take far longer than code | High | Keep stylized primitives with good lighting | Props built in code, then procedural textures. No models downloaded |
| Exterior hurts phone frame rate | Medium | Shrink the yard, raise fog density, cut snow particle count | Fog at 14 m, 700 snowflakes (half on Low), and the Graphics setting with Auto step-down |
| Phone browsers block audio until a tap | Certain | Start all audio from the "Begin shift" button | Done that way |
| iOS Safari has no pointer lock or fullscreen API | Certain | Touch controls are the main scheme on phones; offer "Add to Home Screen" | Done that way; the page has the home-screen meta tags |
| Systems get too punishing in later nights | Medium | Tune from config.js using debug mode | M9 balanced with a simulated player (see the Decisions log) |
| Story feels thin with only text | Medium | Add voiced radio lines later | Text only at launch, by decision |

### Open questions

- [x] Final station setting: arctic (current), deep-sea habitat or lunar relay? Answered: arctic (Decisions log).
- [x] Voice acting for radio and tapes, or text only at launch? Answered: text only (Decisions log).
- [ ] Free on itch.io, pay-what-you-want, or a paid Steam release later (would mean wrapping the web build)? Deferred: Kelbo will set up itch.io later, alongside his other games; the files are ready (docs/ITCH.md).
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
| 2026-10-17 | Settings gains Graphics: Auto, Low, Medium or High. Low draws at the screen's plain resolution, turns off the flashlight's shadows and the surfaces' relief, and halves the snow; Medium draws at up to 1.5× resolution with everything on; High at up to 2×. Auto starts desktops on High, phones on Medium (Low if the phone reports 2 GB of memory or less), then watches the frame rate during play and steps down one level whenever it averages under 40 fps for 4 seconds. It never steps back up by itself. Numbers are in `config.render.quality`; the debug panel shows and cycles the level. |
| 2026-10-17 | On phones held sideways (screens under 420 px tall) the title buttons sit in rows instead of one tall column, so Begin shift, Settings, Credits and the save code buttons all fit without scrolling. |
| 2026-10-20 | Night 1 onboarding hints: a short banner under the pause button, driven by a `hints` list in `night1.json` (each hint has an `on` trigger, either `start` with a delay or a game event, plus text and optional phone wording). Three opening hints (move and look, the meters and objective line, using things), then one when the first reading opens, the generator stalls, the breaker trips or the tank runs dry. Each hint is shown once ever (ids kept in the save as `hintsSeen`), only counts down while playing, and a **Hints on the first night** setting turns them off. Later nights can add their own `hints` lists. The debug panel's "replay hints" forgets which were seen. |
| 2026-10-24 | Reconstructed from the code during the docs refresh (no earlier log entry): night 4 has three radio calls (`n4a` 21:00, `n4b` 01:30, `n4c` 02:30), not two, and its "Dispatch calls again" moment is carried by the radio script alone; night 4's `scripted` list is empty. |
| 2026-10-24 | Reconstructed from the code during the docs refresh: no random failure fires in the first 20 game minutes of any night (`failures.graceMinutes`), and `?seed=123` on the URL fixes a night's random seed so it can be replayed exactly. |
| 2026-10-24 | Reconstructed from the workflow during the docs refresh: the deploy workflow also runs on pull requests into `main`, running `npm test` and `npm run build` as the PR check without publishing; only pushes to `main` publish. The straight-line distance from the outer airlock door to the mast measures about 34 m in `layout.js` (the "26 m" above was an estimate); the tether is 47 m, as logged. |
