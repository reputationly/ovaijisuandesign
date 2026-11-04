import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9399, root: "/tmp/ov-conn", reset: false });
await app.page.waitForTimeout(6000);
const used = await app.page.evaluate(() => [...document.querySelectorAll("script[src]")].map((s) => s.src.split("/").pop()).slice(0, 4));
console.log("loaded scripts:", JSON.stringify(used));
const css = await app.page.evaluate(() => {
  const el = document.querySelector(".node-handle-plus");
  if (!el) return "no handle";
  const cs = getComputedStyle(el);
  return { w: cs.width, h: cs.height, pe: cs.pointerEvents };
});
console.log("handle computed:", JSON.stringify(css));
await app.close?.();
