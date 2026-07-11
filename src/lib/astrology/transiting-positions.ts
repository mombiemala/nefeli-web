// Current sky — geocentric, of-date ecliptic longitudes of the transiting
// planets, computed in-house via astronomy-engine. (Geocentric of-date is the
// frame tropical astrology uses; astronomy-engine's EclipticLongitude is
// heliocentric, which is why we rotate a geocentric vector into ECT here.)

import * as Astronomy from "astronomy-engine";

const BODIES: [string, Astronomy.Body][] = [
  ["Moon", Astronomy.Body.Moon], ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus], ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter], ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus], ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
];

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

function geoEclipticLon(body: Astronomy.Body, t: Astronomy.AstroTime): number {
  const v = Astronomy.GeoVector(body, t, true);
  const rot = Astronomy.Rotation_EQJ_ECT(t);
  const s = Astronomy.SphereFromVector(Astronomy.RotateVector(rot, v));
  return wrap(s.lon);
}

export interface TransitingBody { name: string; absoluteDegree: number }

/** Transiting planet longitudes (Sun–Pluto) at a given instant. */
export function transitingPositions(when: Date): TransitingBody[] {
  const t = Astronomy.MakeTime(when);
  const out: TransitingBody[] = [{ name: "Sun", absoluteDegree: wrap(Astronomy.SunPosition(t).elon) }];
  for (const [name, body] of BODIES) out.push({ name, absoluteDegree: geoEclipticLon(body, t) });
  return out;
}
