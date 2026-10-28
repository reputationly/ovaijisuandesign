import reactExports from "react";

/**
 * 全局"当前正在播放的媒体"注册表 + `useMediaPlayback` 钩子。
 *
 * **注意签名**：`useMediaPlayback(active, src) -> { playing, play, stop }`。
 * 之前这里被还原成了一个 zustand store（`create(set => ({playingId, play, stop}))`），
 * 而画布里的调用是 `useMediaPlayback(active, src)` —— 第二个参数 src 会被 zustand
 * 当成 selector，直接抛 `TypeError: selector is not a function`，把整个视频节点
 * （`VideoBinding`）连同画布一起炸掉。交付成功也看不到片子，根因之一就是这个。
 */
let playingId = null;
const listeners = new Set();

function subscribePlayback(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setPlaying(id) {
  playingId = id;
  for (const listener of listeners) listener();
}

export function useMediaPlayback(active, src) {
  const id = reactExports.useId();
  const playing = reactExports.useSyncExternalStore(
    subscribePlayback,
    () => playingId === id,
    () => false,
  );
  const stop = reactExports.useCallback(() => {
    if (playingId === id) setPlaying(null);
  }, [id]);
  const play = reactExports.useCallback(() => {
    if (active) setPlaying(id);
  }, [active, id]);
  reactExports.useEffect(() => {
    if (!active || !src) stop();
    return stop;
  }, [active, src, stop]);
  return { playing, play, stop };
}

/** 停掉当前正在播放的媒体（单例语义，供播放器互斥用）。 */
export function stopMediaPlayback() {
  setPlaying(null);
}

export function getFileExtension(name) {
  if (!name) return undefined;
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return undefined;
  return name.slice(idx).toLowerCase();
}
