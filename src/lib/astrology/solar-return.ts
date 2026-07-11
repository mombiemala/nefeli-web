// Solar return — the moment each year when the Sun comes back to its exact
// natal ecliptic longitude (around your birthday). The chart for that instant
// describes the year's themes. Computed in-house via astronomy-engine.

import * as Astronomy from "astronomy-engine";

/** Natal Sun's apparent geocentric ecliptic longitude (degrees). */
function natalSunLongitude(natalUTC: Date): number {
  return Astronomy.SunPosition(Astronomy.MakeTime(natalUTC)).elon;
}

/** The UTC instant of the solar return in `targetYear`, or null if not found. */
export function solarReturnMoment(natalUTC: Date, targetYear: number): Date | null {
  const targetLon = natalSunLongitude(natalUTC);
  // The Sun hits a given longitude once a year, within ~a day of the birthday.
  const start = new Date(Date.UTC(targetYear, natalUTC.getUTCMonth(), natalUTC.getUTCDate() - 2, 0, 0, 0));
  const sr = Astronomy.SearchSunLongitude(targetLon, Astronomy.MakeTime(start), 6);
  return sr ? sr.date : null;
}

/** The solar-return year currently in effect for a birthday (the year whose
 *  return has most recently occurred on/before `when`). */
export function currentSolarYear(natalUTC: Date, when: Date): number {
  const y = when.getUTCFullYear();
  const sr = solarReturnMoment(natalUTC, y);
  return sr && when >= sr ? y : y - 1;
}
