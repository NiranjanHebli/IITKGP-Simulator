/**
 * @fileoverview In-game clock, delta time clamping, and Kharagpur solar / atmospheric
 * day-night cycle controller. Can be imported in Node.js for pure clock tests.
 */

export class TimeSystem {
  /**
   * @param {object} [options]
   * @param {number} [options.initialMinutes=480] - Start time in minutes from midnight (480 = 08:00 AM).
   * @param {number} [options.timeScale=60] - Game seconds elapsed per 1 real second (60 = 1 real min per game hour).
   */
  constructor(options = {}) {
    this.totalMinutes = options.initialMinutes ?? 480; // 08:00 AM default
    this.timeScale = options.timeScale ?? 60;
    this.dayCount = 1;
    this.paused = false;

    // Kharagpur approximate latitude in radians (~22.319 deg N) for solar elevation
    this.latitudeRad = (22.319 * Math.PI) / 180;
  }

  /**
   * Advance the in-game clock.
   * @param {number} realDeltaSec - Unscaled real frame delta in seconds.
   * @returns {number} Clamped delta in seconds for physics/animations.
   */
  update(realDeltaSec) {
    const clampedDelta = Math.min(Math.max(realDeltaSec, 0.0001), 0.1);
    if (this.paused) return 0;

    const gameMinutesDelta = (clampedDelta * this.timeScale) / 60;
    this.totalMinutes += gameMinutesDelta;

    if (this.totalMinutes >= 1440) {
      this.totalMinutes -= 1440;
      this.dayCount += 1;
    }
    return clampedDelta;
  }

  /**
   * @returns {{hours: number, minutes: number, formatted12h: string, formatted24h: string, normalizedDay: number}}
   */
  getClockTime() {
    const wholeMins = Math.floor(this.totalMinutes) % 1440;
    const hours24 = Math.floor(wholeMins / 60);
    const minutes = wholeMins % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

    const pad = (n) => String(n).padStart(2, '0');
    return {
      hours: hours24,
      minutes,
      formatted12h: `${pad(hours12)}:${pad(minutes)} ${period}`,
      formatted24h: `${pad(hours24)}:${pad(minutes)}`,
      normalizedDay: this.totalMinutes / 1440
    };
  }

  /**
   * Computes solar vector, sky colors, fog density, and campus streetlamp intensity
   * for the current in-game minute.
   * @param {string} [weatherMode='CLEAR'] - 'CLEAR' | 'MONSOON' | 'FOG'
   */
  getLightingState(weatherMode = 'CLEAR') {
    const hours = this.totalMinutes / 60;
    // Solar hour angle: noon (12.0) = +PI/2 peak elevation, midnight (0.0) = -PI/2
    const solarAngle = ((hours - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(solarAngle);
    const sunX = -Math.cos(solarAngle); // Rises in East (+X), sets in West (-X)
    const sunZ = 0.28; // Slight southern tilt due to 22.3°N latitude

    const len = Math.hypot(sunX, sunY, sunZ) || 1;
    const sunDir = { x: sunX / len, y: sunY / len, z: sunZ / len };

    // Smooth day/twilight/night factors
    const dayFactor = Math.max(0, Math.min(1, (sunY + 0.12) / 0.45));
    const twilightFactor = Math.max(0, 1 - Math.abs(sunY) * 4.5);
    const isNightLightsOn = hours >= 17.75 || hours < 5.75 || weatherMode === 'MONSOON';

    // Interpolate zenith and horizon RGB values
    const skyZenith = this._lerpColor(
      [0x08, 0x0d, 0x1a], // Night zenith
      [0x1e, 0x6b, 0xc8], // Day zenith
      dayFactor
    );

    let skyHorizon = this._lerpColor(
      [0x11, 0x18, 0x2b], // Night horizon
      [0x87, 0xce, 0xeb], // Day horizon
      dayFactor
    );

    if (twilightFactor > 0.01) {
      // Warm Kharagpur dusk/dawn glow over laterite fields
      skyHorizon = this._lerpColor(skyHorizon, [0xf9, 0x73, 0x16], twilightFactor * 0.78);
    }

    let fogDensity = 0.00095 + (1 - dayFactor) * 0.0006;
    let sunIntensity = Math.max(0, sunY) * 2.4;
    let hemiIntensity = 0.28 + dayFactor * 0.65;

    if (weatherMode === 'MONSOON') {
      skyZenith[0] = 0x33; skyZenith[1] = 0x41; skyZenith[2] = 0x55;
      skyHorizon[0] = 0x47; skyHorizon[1] = 0x55; skyHorizon[2] = 0x69;
      fogDensity = 0.0028;
      sunIntensity *= 0.35;
    } else if (weatherMode === 'FOG') {
      skyHorizon[0] = 0xcb; skyHorizon[1] = 0xd5; skyHorizon[2] = 0xe1;
      fogDensity = 0.0046;
      sunIntensity *= 0.55;
    }

    return {
      sunDirection: sunDir,
      sunIntensity,
      hemiIntensity,
      skyZenithHex: (skyZenith[0] << 16) | (skyZenith[1] << 8) | skyZenith[2],
      skyHorizonHex: (skyHorizon[0] << 16) | (skyHorizon[1] << 8) | skyHorizon[2],
      fogDensity,
      lampIntensity: isNightLightsOn ? 1.0 : 0.0
    };
  }

  _lerpColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }
}
