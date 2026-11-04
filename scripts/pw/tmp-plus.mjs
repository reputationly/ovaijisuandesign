import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9403, root: "/tmp/ov-conn", reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(7000);
const node = page.locator(".react-flow__node").first();
const nb = await node.boundingBox();
if (nb) { await page.mouse.move(nb.x + nb.width / 2, nb.y + 40); await page.waitForTimeout(500); }
const plus = page.locator(".node-handle-plus").first();
const pb = await plus.boundingBox();
console.log("plus", JSON.stringify(pb));
if (pb) {
  await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.waitForTimeout(1200);
  const menu = await page.evaluate(() => ({
    text: [...document.querySelectorAll('[role="menu"], [data-radix-menu-content], .menu')].map((e) => (e.textContent || "").trim().slice(0, 60)).slice(0, 3),
    any: document.body.innerText.includes("图片") || document.body.innerText.includes("视频"),
  }));
  console.log("after plus click:", JSON.stringify(menu));
  await page.screenshot({ path: "/tmp/plus-menu.png" });
}
await app.close?.();
