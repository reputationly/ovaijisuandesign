// color-stops.js

export const roundAngle = (degrees) => Math.round(degrees);

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

const lerp = (fromValue, toValue, progress) => Math.round(fromValue + (toValue - fromValue) * progress);

export function kelvinToHex(kelvin) {
  const clamped = Math.max(
    COLOR_STOPS[0].k,
    Math.min(COLOR_STOPS[COLOR_STOPS.length - 1].k, kelvin),
  );
  let lowerStop = COLOR_STOPS[0];
  let upperStop = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let stopIndex = 0; stopIndex < COLOR_STOPS.length - 1; stopIndex++) {
    if (clamped >= COLOR_STOPS[stopIndex].k && clamped <= COLOR_STOPS[stopIndex + 1].k) {
      lowerStop = COLOR_STOPS[stopIndex];
      upperStop = COLOR_STOPS[stopIndex + 1];
      break;
    }
  }
  const stopProgress = upperStop.k === lowerStop.k ? 0 : (clamped - lowerStop.k) / (upperStop.k - lowerStop.k);
  const redChannel = lerp(lowerStop.r, upperStop.r, stopProgress);
  const greenChannel = lerp(lowerStop.g, upperStop.g, stopProgress);
  const blueChannel = lerp(lowerStop.b, upperStop.b, stopProgress);
  const toHex = (channelValue) =>
    Math.max(0, Math.min(255, channelValue)).toString(16).padStart(2, "0");
  return `#${toHex(redChannel)}${toHex(greenChannel)}${toHex(blueChannel)}`;
}
