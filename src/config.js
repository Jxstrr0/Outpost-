// Every tuning number in the game lives here. Change balance here, never in system code.
// Rates are per game minute unless the name says otherwise.

export const CONFIG = {
  time: {
    nightStart: 18 * 60, // 18:00
    nightEnd: 30 * 60, // 06:00 the next morning
    gameMinutesPerSecond: 1.6,
    ticksPerSecond: 10, // fixed simulation step, independent of frame rate
    maxStepsPerFrame: 20, // stops a stalled tab from fast-forwarding the night
  },

  start: {
    power: 68,
    fuel: 30,
    temp: 7,
  },

  power: {
    generatorCharge: 0.36,
    baseLoad: 0.08,
    lightsLoad: 0.06,
    heaterLoad: 0.2,
    unstableBelow: 25, // lights flicker under this, or while the generator is off
    frozenLineCharge: 0.6, // charge multiplier while a frozen fuel line makes the engine sputter
    dangerBelow: 20, // HUD meter turns red
  },

  fuel: {
    burn: 0.12,
    canAmount: 30,
    frozenLineBurn: 2.5, // burn multiplier while the fuel line is frozen
    dangerBelow: 15,
  },

  heat: {
    heatingRate: 0.012, // fraction of the gap to target closed each game minute
    coolingRate: 0.0045,
    heaterTarget: 18,
    coldTarget: -30,
    min: -30,
    max: 18,
    freezeBelow: -6,
    freezeMinutes: 80, // game minutes below freezeBelow before the night is lost
    freezeRecoveryRate: 1, // freeze minutes recovered per game minute above freezeBelow
    dangerBelow: 0,
    frostStartsBelow: 5, // screen-edge frost begins
    frostFullAt: -10,
    crackCooling: 2, // a cracked window makes the station lose heat this many times faster
    outerDoorCooling: 1.6, // the outer airlock door left open
    throughDraftCooling: 3, // the outer door and an inner airlock door both open: wind blows through
  },

  failures: {
    generatorStallEvery: 85, // average game minutes between stalls while running
    breakerTripEvery: 230, // average game minutes between trips while the heater runs
    restartFailChance: 0.3,
    crankMinutes: 2.4, // how long one restart attempt takes
    graceMinutes: 20, // no random failures this soon after 18:00
    // Faults from night 2 on. They only happen on nights whose JSON gives them a weight.
    heaterFaultEvery: 520, // the heater blows a fuse
    fuelLineEvery: 420, // the fuel line freezes while the generator runs
    windowCrackEvery: 520, // the north window cracks
    antennaIcingEvery: 480, // ice builds on the mast antenna: radio and console go to static
  },

  repairs: {
    // Seconds of holding Use. These count real time, so the night keeps moving while you work.
    fuseSeconds: 1.5,
    tapeSeconds: 4,
    cutTapeSeconds: 2, // cutting the tape off Vance's door
    thawSeconds: 10,
    inspectSeconds: 4, // checking the instruments on the north mast
    deiceSeconds: 3, // knocking the ice off the antenna
  },

  // Outside (night 3 on). Body heat is per game minute, like everything else: a trip to the
  // mast and back takes 60 to 90 real seconds, which is 100 to 145 game minutes.
  body: {
    outsideLoss: 0.45, // body heat lost per game minute outside
    gustFactor: 2, // lost this many times faster in a whiteout gust
    warmGain: 1.6, // regained per game minute indoors when the station is 5 °C or warmer
    coldGain: 0.4, // regained indoors when it's colder than that
    warmAbove: 5,
    dangerBelow: 35, // HUD meter turns red and the screen frosts
    frostFrom: 60, // body heat where screen frost starts
  },

  weather: {
    gustEvery: [70, 140], // game minutes between whiteout gusts, min and max
    gustMinutes: 12, // how long a gust lasts (about 7.5 real seconds)
  },

  exterior: {
    snowSpeed: 0.7, // walking speed outside, as a fraction of indoors
    gustSpeed: 0.55, // walking into a gust
    fogColor: 0x1b232c,
    fogNear: 1,
    fogFar: 14, // the design's 8 to 15 m visibility
    gustFogFar: 4,
    fogBlendPerSecond: 2.5,
    snowFlakes: 700,
    snowBox: 22, // metres around the player that snow falls in
    snowHeight: 6,
    snowFlakeSize: 0.09,
    snowFall: 0.9, // metres per second
    snowWind: 1.2, // sideways drift, metres per second
    gustSnowWind: 7,
    footprintEvery: 0.75, // metres between prints
    footprintCount: 220,
    beaconBlinkSeconds: 1.4,
  },

  endings: {
    voiceEvery: 6, // game minutes between the voice's calls at the west door, night 5
    answerMinutes: 10, // game minutes walking out from the open west door before the white
    answerFadeMinutes: 4, // how fast the white fades if the player turns back
  },

  stock: {
    // What the supply room holds at the start of a night, before the supply drop adds to it.
    // A night's JSON can override these.
    spareFuses: 2,
    tape: 2,
    rations: 1,
  },

  radio: {
    ringMinutes: 40, // game minutes a call keeps ringing before Dispatch gives up
    ringEvery: 3, // real seconds between rings
  },

  sanity: {
    // Night 3 on. Per game minute unless noted.
    darkLoss: 0.11, // standing somewhere unlit
    flashlightDarkFactor: 0.5, // the flashlight halves the dark's effect
    coldLoss: 0.06, // inside temperature below 0 °C
    lightGain: 0.03, // standing in a lit room
    warmGain: 0.02, // inside temperature 10 °C or more
    readingBonus: 5, // logging a weather reading
    radioBonus: 4, // answering a radio call
    rationBonus: 12, // eating a ration
    rationMinutes: 90, // and for this long afterwards, losses are slowed
    rationLossFactor: 0.5,
    hallucinateBelow: 30, // sounds and HUD alerts that aren't real
    hallucinationEvery: 22, // average game minutes between them
    dangerBelow: 30,
    shocks: { knocks: 8, roofSteps: 6, anomaly: 10, radioEcho: 8, footprints: 10 }, // scripted moments
  },

  duties: {
    readingWindow: 65,
  },

  supplies: {
    picks: 2,
    fuelCansPerPick: 2,
    fusesPerPick: 2,
    foodPerPick: 2,
    batteriesPerPick: 1,
  },

  player: {
    eyeHeight: 1.62,
    radius: 0.3,
    walkSpeed: 2.7, // metres per real second
    pickupThroughProps: 0.5, // metres past a furniture blocker that a note or tape can still be picked up
    interactDistance: 2.3,
    lookSensitivityMouse: 0.0022, // radians per pixel at sensitivity 1
    lookSensitivityTouch: 0.0055,
    stickRadius: 56, // pixels
    holdToUseSeconds: 0.45,
    pitchLimit: 1.45,
  },

  render: {
    fov: 70,
    fogColor: 0x05070a,
    fogNear: 4,
    fogFar: 26,
    screenRefreshPerSecond: 6,
    kit: {
      shade: 0.22, // how much darker the bottom of each prop part is than its top
      colorJitter: 0.05, // brightness wobble between repeated parts
    },
    // Procedural surface textures (world/textures.js), drawn on canvases at start-up.
    surfaces: {
      detail: 'full', // 'full' (colour and relief), 'flat' (colour only) or 'off'; the debug panel cycles these
      size: 512, // pixels across a floor texture; grain textures use half
      anisotropy: 4,
      propTile: 1.0, // metres per repeat of the grain on props and doors
      wallTile: [1.4, 2.8], // metres per repeat on walls: one repeat is a full wall height
      floorTile: 2.0, // metres per repeat on floors and the ceiling
      snowTile: 2.0, // metres per repeat on the snow and the outer cladding
      bump: { prop: 0.035, wall: 0.07, floor: 0.1, snow: 0.06 }, // relief strength per surface
    },
    // Graphics quality (Settings → Graphics, world/quality.js). 'Auto' starts on a level that
    // suits the device and steps down one level at a time if play gets choppy.
    quality: {
      levels: {
        // pixelRatio caps the screen's own; snow is the share of snowflakes drawn.
        low: { pixelRatio: 1, surfaces: 'flat', shadows: false, snow: 0.5 },
        medium: { pixelRatio: 1.5, surfaces: 'full', shadows: true, snow: 1 },
        high: { pixelRatio: 2, surfaces: 'full', shadows: true, snow: 1 },
      },
      autoDesktop: 'high',
      autoPhone: 'medium',
      autoWeakPhone: 'low', // a phone that reports this much memory or less (Chrome only)
      weakMemoryGb: 2,
      autoMinFps: 40, // auto steps down when play averages less than this
      autoSampleSeconds: 4, // over this long
      autoSettleSeconds: 3, // frames this soon after starting play or changing level don't count
      autoMaxGapSeconds: 1, // a longer frame (the tab was switched away) is left out
    },
  },

  ui: {
    toastSeconds: 4,
    maxToasts: 3,
  },

  hints: {
    seconds: 7, // how long a hint stays up
    gapSeconds: 1.5, // pause between one hint and the next
    maxQueued: 3, // hints waiting their turn; extras are dropped
  },

  saveCode: {
    checksumChars: 6, // characters at the end of a save code that catch damaged pastes
    maxPasteChars: 20000, // anything longer than this can't be a real code
  },

  audio: {
    windVolume: 0.32,
    generatorVolume: 0.55,
    engineLayerVolume: 0.5, // the recorded engine loop under the generated hum
    heaterVolume: 0.22,
    lightBuzzVolume: 0.05, // fluorescent hum from the ceiling fixtures
    radioStaticVolume: 0.05, // the radio set's standby hiss
    droneVolume: 0.35, // the low drone on the day summary screen
    hrtf: true, // head-related panning: sounds have a clear left, right, front and back
    refDistance: 1.6,
    rolloff: 1.3,
    // Walls muffle sound. Occlusion runs from 0 (same room) to 1 (behind closed walls).
    occlusionByHops: [0, 0.3, 0.6], // through 0, 1 or 2 open doorways
    clearCutoff: 18000, // low-pass cutoff in Hz with nothing in the way
    occludedCutoff: 600,
    occludedGain: 0.45,
    reverbSend: 0.18, // how much of each sound goes into the room echo
    reverbSeconds: 1.3,
    // Failure tells repeat while the fault lasts, so the player can find them by ear.
    stallAlarmEvery: 2.4, // seconds between generator alarm buzzes while stalled
    fuelAlarmEvery: 3.5,
    relayBuzzEvery: 3.2, // the tripped breaker panel's buzz
    coolingSeconds: 45, // a stopped engine ticks as it cools
    subtitleRepeatSeconds: 20, // a repeating tell is subtitled again this often
    stepEvery: 0.8, // metres walked per footstep
    stepVolume: 0.35,
    creakEvery: [14, 40], // seconds between building creaks, min and max
    groanEvery: [35, 80], // distant metal groans outside
    groanDistance: 14, // metres from the station centre
    crackWindBoost: 1.8, // the wind is this much louder with the north window cracked
    sputterEvery: [3, 6], // a frozen fuel line makes the engine sputter this often (seconds)
    glassTickEvery: [5, 11], // a cracked window ticks in the cold
    outsideWindBoost: 2.6, // the wind outside, against the wind heard through the walls
    openDoorWindBoost: 1.6,
    gustWindBoost: 1.7,
    gustIndoorBoost: 1.25,
    icedStaticBoost: 4, // the radio set hisses loudly while the antenna is iced
  },

  lighting: {
    ambient: 0.55, // hemisphere light while the main room is lit
    ambientDark: 0.32, // during a blackout or with the lights switched off
    moonIntensity: 0.3,
    decay: 1.3,
    lightHeight: 2.2, // point lights hang below their fixtures
    mainIntensity: 11, // one light between the main room's two fixtures
    mainDistance: 13,
    generatorRoomIntensity: 5,
    generatorRoomDistance: 9,
    smallRoomIntensity: 3.2, // shared by the supply room and the airlock
    smallRoomDistance: 6.5,
    emergencyLevel: 0.18, // red emergency light, as a fraction of the main light
    blackoutScreenBrightness: 0.15,
    emergencyPulseSeconds: 1.8,
    anomalyStutterSeconds: 1.2,
    anomalyDarkSeconds: 2,
  },

  flashlight: {
    drainPerMinute: 0.5, // a full cell lasts about 200 game minutes switched on
    betterCellDrain: 0.6, // drain multiplier with the better cell from the supply drop
    rechargePerMinute: 0.9, // while off, if the station has power
    chargeLoad: 0.02, // station battery used while it recharges
    lowBelow: 15, // warns, and the beam starts to flicker
    minToSwitchOn: 3,
    intensity: 26,
    distance: 15,
    decay: 1.4,
    angle: 0.46, // half-angle of the beam, radians
    penumbra: 0.5,
    shadowMapSize: 512,
    blackoutAmbient: 0.17, // the station is darker in a blackout once you have a flashlight
  },

  doors: {
    swingSpeed: 6, // how fast a door leaf follows its open/closed state (per second)
    openAngle: 1.62, // radians a door swings when open
  },
};
