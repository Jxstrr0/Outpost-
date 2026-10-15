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
    dangerBelow: 20, // HUD meter turns red
  },

  fuel: {
    burn: 0.12,
    canAmount: 30,
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
  },

  failures: {
    generatorStallEvery: 85, // average game minutes between stalls while running
    breakerTripEvery: 230, // average game minutes between trips while the heater runs
    restartFailChance: 0.3,
    crankMinutes: 2.4, // how long one restart attempt takes
    graceMinutes: 20, // no random failures this soon after 18:00
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
    interactDistance: 2.3,
    lookSensitivityMouse: 0.0022, // radians per pixel at sensitivity 1
    lookSensitivityTouch: 0.0055,
    stickRadius: 56, // pixels
    holdToUseSeconds: 0.45,
    pitchLimit: 1.45,
  },

  render: {
    fov: 70,
    maxPixelRatio: 2,
    phonePixelRatio: 1.5,
    fogColor: 0x05070a,
    fogNear: 4,
    fogFar: 26,
    screenRefreshPerSecond: 6,
    kit: {
      shade: 0.22, // how much darker the bottom of each prop part is than its top
      colorJitter: 0.05, // brightness wobble between repeated parts
    },
  },

  ui: {
    toastSeconds: 4,
    maxToasts: 3,
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
