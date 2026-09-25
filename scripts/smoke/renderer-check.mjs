// electron.sh 用：经远程调试端口进渲染页，打开工作区页，确认渲染层发往工作区 gateway 的请求带上了身份。
// 开发模式下页面由 vite 提供，动态 import 源码路径拿到的就是页面正在用的那份模块。
//
//   node scripts/smoke/renderer-check.mjs <调试端口> <工作区路径>
// 输出一行 JSON，各项为 true / false。
const [, , port, workspace] = process.argv;

async function page() {
  for (let i = 0; i < 60; i++) {
    try {
      const p = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === "page");
      if (p) return p;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("调试端口上没有页面");
}

let ws;
let seq = 0;
const pending = new Map();
async function connect() {
  ws = new WebSocket((await page()).webSocketDebuggerUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    pending.get(m.id)?.(m);
  };
}
function evaluate(expression) {
  return new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, (m) => resolve(m.result?.result?.value ?? { error: m.result?.exceptionDetails?.exception?.description ?? m.error }));
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}

await connect();
await evaluate(`location.assign('/workspace/?workspaceId=' + encodeURIComponent(${JSON.stringify(workspace)}))`);
ws.close();
// 整页跳转后原来的调试连接失效，重连
await new Promise((r) => setTimeout(r, 1000));
await connect();
let bound;
for (let i = 0; i < 60 && !bound?.identity; i++) {
  bound = await evaluate(`import('/src/workspace-binding.ts').then((m) => m.activeWorkspace())`);
  if (!bound?.identity) await new Promise((r) => setTimeout(r, 500));
}
const out = { bound: !!bound?.identity };
if (out.bound) {
  out.canvasWrite = await evaluate(`import('/src/api.ts').then(async (api) => { await api.putCanvas(await api.getCanvas()); return true }).catch(() => false)`);
  out.gatewayFetchWrite = await evaluate(`import('/src/api/gateway.ts').then(async (g) => (await g.gatewayFetch('/api/canvas/text-node', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'x', name: '渲染层冒烟' }) })).ok)`);
  out.noIdentityRejected = await evaluate(`fetch(${JSON.stringify(bound.gatewayUrl)} + '/api/canvas/text-node', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.status === 428)`);
  const probe = (url) => `new Promise((r) => { const w = new WebSocket(${JSON.stringify(url)}); w.onclose = (e) => r(e.code); setTimeout(() => { w.close(); r('open') }, 2000) })`;
  out.wsStaysOpen = (await evaluate(probe(bound.wsUrl))) === "open";
  out.wrongWsClosed = (await evaluate(probe(bound.wsUrl.replace(/instance=[^&]+/, "instance=stale")))) === 1008;
}
ws.close();
console.log(JSON.stringify(out));
