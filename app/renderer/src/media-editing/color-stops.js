// color-stops.js

export const roundAngle = (deg) => Math.round(deg);

const COLOR_STOPS = [
  {
    k: 1e3,
    r: 255,
    g: 140,
    b: 20,
  },
  {
    k: 1800,
    r: 255,
    g: 179,
    b: 71,
  },
  {
    k: 3200,
    r: 255,
    g: 210,
    b: 161,
  },
  {
    k: 5600,
    r: 255,
    g: 255,
    b: 255,
  },
  {
    k: 7e3,
    r: 232,
    g: 241,
    b: 255,
  },
  {
    k: 1e4,
    r: 150,
    g: 157,
    b: 245,
  },
];

const lerp = (a2, b3, t2) => Math.round(a2 + (b3 - a2) * t2);

export function kelvinToHex(kelvin) {
  const clamped = Math.max(
    COLOR_STOPS[0].k,
    Math.min(COLOR_STOPS[COLOR_STOPS.length - 1].k, kelvin),
  );
  let lo = COLOR_STOPS[0];
  let hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i2 = 0; i2 < COLOR_STOPS.length - 1; i2++) {
    if (clamped >= COLOR_STOPS[i2].k && clamped <= COLOR_STOPS[i2 + 1].k) {
      lo = COLOR_STOPS[i2];
      hi = COLOR_STOPS[i2 + 1];
      break;
    }
  }
  const t2 = hi.k === lo.k ? 0 : (clamped - lo.k) / (hi.k - lo.k);
  const r2 = lerp(lo.r, hi.r, t2);
  const g2 = lerp(lo.g, hi.g, t2);
  const b3 = lerp(lo.b, hi.b, t2);
  const toHex = (v2) =>
    Math.max(0, Math.min(255, v2)).toString(16).padStart(2, "0");
  return `#${toHex(r2)}${toHex(g2)}${toHex(b3)}`;
}
