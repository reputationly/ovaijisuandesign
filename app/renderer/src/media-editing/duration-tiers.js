// duration-tiers.js
import { TIMELINE_CONFIG } from "../generation/time-intervals.jsx";

const DURATION_TIERS = [
  {
    maxDuration: 15,
    sampleInterval: 0.5,
    widthMultiplier: 1,
  },
  {
    maxDuration: 60,
    sampleInterval: 1,
    widthMultiplier: 1,
  },
  {
    maxDuration: 180,
    sampleInterval: 2,
    widthMultiplier: 1,
  },
  {
    maxDuration: 600,
    sampleInterval: 5,
    widthMultiplier: 2,
  },
  {
    maxDuration: Infinity,
    sampleInterval: 10,
    widthMultiplier: 4,
  },
];

export function getDurationTier(totalDuration) {
  return (
    DURATION_TIERS.find((tier) => totalDuration <= tier.maxDuration) ??
    DURATION_TIERS[DURATION_TIERS.length - 1]
  );
}

export function calcInitialScale(totalDuration, containerWidth) {
  const tier = getDurationTier(totalDuration);
  const {
    TRACK_PADDING_H,
    MIN_SCALE: MIN_SCALE2,
    MAX_SCALE: MAX_SCALE2,
  } = TIMELINE_CONFIG;
  const availableWidth = containerWidth - TRACK_PADDING_H * 2;
  const scale2 = (availableWidth * tier.widthMultiplier) / totalDuration;
  return Math.max(MIN_SCALE2, Math.min(MAX_SCALE2, scale2));
}
