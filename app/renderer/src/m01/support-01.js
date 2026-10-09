// support-01.js
var __require$1 = ((x2) =>
  typeof require !== "undefined"
    ? require
    : typeof Proxy !== "undefined"
      ? new Proxy(x2, {
          get: (a2, b3) => (typeof require !== "undefined" ? require : a2)[b3],
        })
      : x2)(function (x2) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
export var writeAdtsFrameLength = (bitstream, frameLength) => {
  bitstream.pos = 30;
  bitstream.writeBits(13, frameLength);
};
export async function inlineWorker$1(scriptText2) {
  if (typeof Worker !== "undefined" && typeof Bun === "undefined") {
    const blob = new Blob([scriptText2], {
      type: "text/javascript",
    });
    const url2 = URL.createObjectURL(blob);
    const worker = new Worker(url2, {
      type: typeof Deno !== "undefined" ? "module" : void 0,
    });
    URL.revokeObjectURL(url2);
    return worker;
  } else {
    let Worker3;
    try {
      Worker3 = (
        await (async () => {
          const { Worker: Worker4 } = await import("../__vite-browser-external-2Ng8QIWW.js");
          return {
            Worker: Worker4,
          };
        })()
      ).Worker;
    } catch {
      Worker3 = __require$1("worker_threads").Worker;
    }
    const worker = new Worker3(scriptText2, {
      eval: true,
    });
    return worker;
  }
}
