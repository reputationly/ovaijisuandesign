import { chromium } from "playwright-core";
const b = await chromium.connectOverCDP("http://127.0.0.1:9417");
const pages = b.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes("app://")) ?? pages[0];
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
await page.reload();
await page.waitForTimeout(11000);
const c = await page.evaluate(() => ({
  video: document.querySelectorAll('[data-action-ui-id="canvas.video-node"]').length,
  audio: document.querySelectorAll('[data-action-ui-id="canvas.audio-node"]').length,
}));
console.log("nodes:", JSON.stringify(c));
for (const kind of ["video", "audio"]) {
  if (!c[kind]) continue;
  const node = page.locator(`[data-action-ui-id="canvas.${kind}-node"]`).first();
  const bb = await node.boundingBox();
  if (!bb) { console.log(kind, "no box"); continue; }
  await page.mouse.dblclick(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({
    lb: document.querySelectorAll('[data-action-ui-id="canvas.media-lightbox"]').length,
    vid: document.querySelectorAll('[data-action-ui-id="canvas.media-lightbox"] video').length,
    aud: document.querySelectorAll('[data-action-ui-id="canvas.media-lightbox"] audio').length,
    text: (document.querySelector('[data-action-ui-id="canvas.media-lightbox"]')?.textContent || "").slice(0, 40),
  }));
  console.log(kind, "dblclick →", JSON.stringify(st));
  await page.screenshot({ path: `/tmp/preview-${kind}.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
}
console.log("pageerrors:", JSON.stringify(errs.slice(0, 3)));
await b.close();
