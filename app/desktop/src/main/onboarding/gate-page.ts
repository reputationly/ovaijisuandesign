/**
 * 令牌页的界面。内联在主进程里（不走构建、不依赖外部文件），所以开发版和安装包行为一致。
 *
 * 没有「跳过」：只有「保存并继续」和「退出」。通信只走 preload 暴露的 `window.ovGate`，
 * 页面本身不发任何网络请求。文案里的模型名一律用 textContent 写入，不拼 HTML。
 *
 * 布局注意：窗口不可缩放，内容必须放得下。按钮文字不换行、不被压缩；底部提示单独一行；
 * 页面本身可以滚动兜底（不能用居中布局，否则内容一超出就会把顶部裁掉）。
 */
export function gatePageHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>蒜狸小助手</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: #fafafa; color: #1d1d1f;
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
    font-size: 14px; line-height: 1.6;
    display: flex; justify-content: center; align-items: flex-start;
    overflow-y: auto;
    -webkit-font-smoothing: antialiased;
  }
  main { width: 460px; padding: 26px 32px 24px; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
  p.lead { margin: 0 0 18px; color: #5b5b5f; }
  label { display: block; font-weight: 500; margin-bottom: 6px; }
  .field { display: flex; gap: 8px; align-items: center; }
  input[type="password"], input[type="text"] {
    flex: 1; min-width: 0; height: 36px; padding: 0 12px;
    border: 1px solid #d2d2d7; border-radius: 8px; background: #fff; color: inherit;
    font: inherit; outline: none;
  }
  input:focus { border-color: #1d1d1f; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
  button {
    font: inherit; height: 36px; padding: 0 16px; border-radius: 8px; cursor: pointer;
    border: 1px solid #d2d2d7; background: #fff; color: inherit;
    white-space: nowrap; flex: none;
  }
  button:disabled { opacity: 0.45; cursor: default; }
  button.primary { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
  button.plain { border-color: transparent; background: transparent; color: #5b5b5f; padding: 0 8px; }
  #error { min-height: 20px; margin: 8px 0 0; color: #c0342b; font-size: 13px; }
  section { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e5e5ea; }
  h2 { font-size: 13px; font-weight: 600; margin: 0 0 4px; }
  .hint { margin: 0 0 10px; font-size: 12px; color: #86868b; }
  dl { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 3px 12px; margin: 0; font-size: 13px; }
  dt { color: #5b5b5f; line-height: 1.5; }
  dd { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; }
  dd.off { color: #aeaeb2; font-family: inherit; }
  footer { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
  footer .note { margin: 0; font-size: 12px; color: #86868b; }
  footer .actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
</head>
<body>
<main>
  <h1>填写平台令牌</h1>
  <p class="lead">对话和生成都走平台，需要先填写平台令牌（API Key）才能开始用。令牌只保存在这台电脑上，填写一次之后不会再出现这个页面；以后可以在「设置 → 平台接入」里修改。</p>

  <label for="token">平台令牌（API Key）</label>
  <div class="field">
    <input id="token" type="password" autocomplete="off" spellcheck="false" placeholder="粘贴令牌">
    <button type="button" id="toggle" class="plain">显示</button>
  </div>
  <p id="error" role="alert"></p>

  <section>
    <h2>将使用的模型</h2>
    <p class="hint">模型由平台统一配置，不需要手动选择。</p>
    <dl id="rows"></dl>
  </section>

  <footer>
    <p class="note">不填令牌就无法使用，关闭窗口会退出应用。</p>
    <div class="actions">
      <button type="button" id="quit">退出</button>
      <button type="button" id="save" class="primary" disabled>保存并继续</button>
    </div>
  </footer>
</main>
<script>
(function () {
  var api = window.ovGate;
  var tokenInput = document.getElementById("token");
  var toggle = document.getElementById("toggle");
  var saveBtn = document.getElementById("save");
  var quitBtn = document.getElementById("quit");
  var errorEl = document.getElementById("error");
  var rowsEl = document.getElementById("rows");
  var busy = false;

  function setError(msg) { errorEl.textContent = msg || ""; }
  function refresh() { saveBtn.disabled = busy || tokenInput.value.trim() === ""; }

  if (!api) {
    setError("页面没有连上应用，请退出后重新打开。");
    saveBtn.disabled = true;
    return;
  }

  function submit() {
    if (saveBtn.disabled) return;
    busy = true; refresh(); setError("");
    api.save(tokenInput.value).then(function (r) {
      // 保存成功时主进程会关掉这个窗口，这里不用再处理。
      if (r && !r.ok) setError(r.error);
    }, function () {
      setError("保存失败，请重试。");
    }).then(function () {
      busy = false; refresh();
    });
  }

  tokenInput.addEventListener("input", function () { setError(""); refresh(); });
  tokenInput.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  saveBtn.addEventListener("click", submit);
  quitBtn.addEventListener("click", function () { api.quit(); });
  toggle.addEventListener("click", function () {
    var show = tokenInput.type === "password";
    tokenInput.type = show ? "text" : "password";
    toggle.textContent = show ? "隐藏" : "显示";
  });

  api.info().then(function (info) {
    rowsEl.textContent = "";
    (info.rows || []).forEach(function (row) {
      var dt = document.createElement("dt");
      dt.textContent = row.label;
      var dd = document.createElement("dd");
      if (row.model) {
        dd.textContent = row.model;
        dd.title = row.model;
      } else {
        dd.textContent = "未启用";
        dd.className = "off";
      }
      rowsEl.appendChild(dt);
      rowsEl.appendChild(dd);
    });
  }, function () {
    setError("读取模型信息失败，但不影响填写令牌。");
  });

  refresh();
  tokenInput.focus();
})();
</script>
</body>
</html>`;
}
