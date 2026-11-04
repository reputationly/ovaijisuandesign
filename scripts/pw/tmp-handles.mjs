import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9397, root: "/tmp/ov-conn", reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(6000);
const info = await page.evaluate(() => {
  const hs = [...document.querySelectorAll(".react-flow__handle")];
  return hs.map((h) => ({
    cls: h.className,
    type: h.getAttribute("data-handleid") ?? null,
    pe: getComputedStyle(h).pointerEvents,
    opacity: getComputedStyle(h).opacity,
    box: h.getBoundingClientRect().width,
  })).slice(0, 8);
});
console.log(JSON.stringify(info, null, 1).slice(0, 1400));
await app.close?.();
