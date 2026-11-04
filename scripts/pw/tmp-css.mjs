import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9402, root: "/tmp/ov-conn", reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(7000);
const info = await page.evaluate(() => {
  const plus = document.querySelector(".node-handle-plus");
  const motion = document.querySelector(".node-handle-motion");
  if (!plus) return "no plus";
  const cp = getComputedStyle(plus);
  const cm = motion ? getComputedStyle(motion) : null;
  return {
    plus: { w: cp.width, h: cp.height, pe: cp.pointerEvents, opacity: cp.opacity, pos: cp.position },
    motion: cm ? { opacity: cm.opacity, pe: cm.pointerEvents, display: cm.display, transform: cm.transform } : null,
  };
});
console.log(JSON.stringify(info));
await app.close?.();
