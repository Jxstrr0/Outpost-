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
  },

  ui: {
    toastSeconds: 4,
    maxToasts: 3,
  },

  audio: {
    windVolume: 0.32,
    generatorVolume: 0.55,
    heaterVolume: 0.22,
  },

  lighting: {
    fixtureIntensity: 7,
    generatorRoomIntensity: 5,
    blackoutScreenBrightness: 0.15,
    emergencyPulseSeconds: 1.8,
    anomalyStutterSeconds: 1.2,
    anomalyDarkSeconds: 2,
  },
};
