import { create as create$2 } from "d3-selection";
export const useMediaPlayback = create$2(set2 => ({
  playingId: null,
  play: id2 => set2({
    playingId: id2
  }),
  stop: () => set2({
    playingId: null
  })
}));
export function getFileExtension(name2) {
  if (!name2) return void 0;
  const idx = name2.lastIndexOf(".");
  if (idx <= 0 || idx === name2.length - 1) return void 0;
  return name2.slice(idx).toLowerCase();
}