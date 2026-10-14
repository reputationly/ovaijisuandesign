// 决策版本计数。


export let decisionVersion = 0;
export const listeners$8 = /* @__PURE__ */new Set();
export function emit$5() {
  decisionVersion += 1;
  for (const listener of listeners$8) listener();
}
