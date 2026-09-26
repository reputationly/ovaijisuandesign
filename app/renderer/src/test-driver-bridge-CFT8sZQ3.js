function findVisibleElement(selector) {
  const all = document.querySelectorAll(selector);
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (el instanceof HTMLElement && el.offsetParent !== null) return el;
  }
  return all[0] ?? null;
}
function readText(selector) {
  const start = performance.now();
  const el = findVisibleElement(selector);
  if (!el) {
    return {
      index: 0,
      action: `read ${selector}`,
      status: "fail",
      duration: performance.now() - start,
      error: `Element not found: ${selector}`
    };
  }
  const text = (el.textContent ?? "").trim();
  return {
    index: 0,
    action: `read ${selector}`,
    status: "ok",
    duration: performance.now() - start,
    detail: { text }
  };
}
function readAttr(selector, attr, index) {
  const start = performance.now();
  const action = `read-attr ${attr} from ${selector}${index !== void 0 ? `[${index}]` : ""}`;
  if (index === void 0) {
    const el = findVisibleElement(selector);
    if (!el) {
      return {
        index: 0,
        action,
        status: "fail",
        duration: performance.now() - start,
        error: `Element not found: ${selector}`
      };
    }
    const value2 = el.getAttribute(attr);
    return {
      index: 0,
      action,
      status: "ok",
      duration: performance.now() - start,
      detail: { value: value2, present: value2 !== null, matched: 1 }
    };
  }
  const all = document.querySelectorAll(selector);
  const resolvedIndex = index < 0 ? all.length + index : index;
  if (resolvedIndex < 0 || resolvedIndex >= all.length) {
    return {
      index: 0,
      action,
      status: "fail",
      duration: performance.now() - start,
      error: `Index ${index} out of range (matched ${all.length} elements)`,
      detail: { matched: all.length }
    };
  }
  const target = all[resolvedIndex];
  const value = target.getAttribute(attr);
  return {
    index: 0,
    action,
    status: "ok",
    duration: performance.now() - start,
    detail: { value, present: value !== null, matched: all.length, resolvedIndex }
  };
}
function countElements(selector) {
  const start = performance.now();
  const count = document.querySelectorAll(selector).length;
  return {
    index: 0,
    action: `count-elements ${selector}`,
    status: "ok",
    duration: performance.now() - start,
    detail: { count }
  };
}
function waitCount(selector, options) {
  const start = performance.now();
  const threshold = options.min ?? (options.baseline !== void 0 ? options.baseline + 1 : NaN);
  const action = `wait-count ${selector} >= ${threshold}`;
  if (Number.isNaN(threshold)) {
    return Promise.resolve({
      index: 0,
      action,
      status: "fail",
      duration: performance.now() - start,
      error: "wait-count requires either `min` or `baseline`"
    });
  }
  const currentCount = () => document.querySelectorAll(selector).length;
  const initial = currentCount();
  if (initial >= threshold) {
    return Promise.resolve({
      index: 0,
      action,
      status: "ok",
      duration: performance.now() - start,
      detail: { count: initial, threshold }
    });
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      const last = currentCount();
      resolve({
        index: 0,
        action,
        status: "fail",
        duration: performance.now() - start,
        error: `Timed out: count ${last} < ${threshold} after ${options.timeout}ms`,
        detail: { count: last, threshold }
      });
    }, options.timeout);
    const observer = new MutationObserver(() => {
      if (settled) return;
      const count = currentCount();
      if (count < threshold) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve({
        index: 0,
        action,
        status: "ok",
        duration: performance.now() - start,
        detail: { count, threshold }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
}
function waitAny(selectors, timeout) {
  const start = performance.now();
  const action = `wait-any [${selectors.join(", ")}]`;
  if (selectors.length === 0) {
    return Promise.resolve({
      index: 0,
      action,
      status: "fail",
      duration: performance.now() - start,
      error: "wait-any requires a non-empty `targets` array"
    });
  }
  const findMatch = () => {
    for (let i = 0; i < selectors.length; i++) {
      if (findVisibleElement(selectors[i])) return i;
    }
    return -1;
  };
  const initial = findMatch();
  if (initial >= 0) {
    return Promise.resolve({
      index: 0,
      action,
      status: "ok",
      duration: performance.now() - start,
      detail: { matched_index: initial, matched_selector: selectors[initial] }
    });
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      resolve({
        index: 0,
        action,
        status: "fail",
        duration: performance.now() - start,
        error: `Timed out: none of ${selectors.length} selectors matched after ${timeout}ms`
      });
    }, timeout);
    const observer = new MutationObserver(() => {
      if (settled) return;
      const idx = findMatch();
      if (idx < 0) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve({
        index: 0,
        action,
        status: "ok",
        duration: performance.now() - start,
        detail: { matched_index: idx, matched_selector: selectors[idx] }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
}
async function waitStage(options) {
  const start = performance.now();
  const expectedNew = options.expectedNew ?? 1;
  const autoAnswerDock = options.autoAnswerDock ?? true;
  const dockMaxRounds = options.dockMaxRounds ?? 20;
  const readAttrs = options.readAttrs ?? ["data-artifact-path", "data-artifact-mime"];
  const countNow = () => document.querySelectorAll(options.artifactSelector).length;
  const baseline = options.baseline ?? countNow();
  const threshold = baseline + expectedNew;
  const dockSelector = '[data-action-ui-id="chat-question-dock"]';
  const action = `wait-stage ${options.artifactSelector} >= ${threshold}`;
  const deadline = performance.now() + options.timeout;
  const readArtifactAttrs = () => {
    const all = document.querySelectorAll(options.artifactSelector);
    const target = all[all.length - 1];
    const attrs = {};
    for (const name of readAttrs) {
      attrs[name] = target?.getAttribute(name) ?? null;
    }
    return attrs;
  };
  const tryClick = (selector) => {
    const el = findVisibleElement(selector);
    if (!el) return false;
    if (el instanceof HTMLButtonElement && el.disabled) return false;
    if (el instanceof HTMLElement) {
      el.click();
    } else {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
    return true;
  };
  const sleep = (ms) => new Promise((r) => {
    setTimeout(r, ms);
  });
  const waitForChange = (timeoutMs, predicate) => new Promise((resolve) => {
    if (predicate()) {
      resolve(true);
      return;
    }
    let settled = false;
    const timer = setTimeout(
      () => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        resolve(false);
      },
      Math.max(0, timeoutMs)
    );
    const observer = new MutationObserver(() => {
      if (settled) return;
      if (!predicate()) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve(true);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  });
  let dockRounds = 0;
  while (true) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      const finalCount = countNow();
      const durationMs = performance.now() - start;
      return {
        index: 0,
        action,
        status: "fail",
        duration: durationMs,
        error: `Timed out: ${finalCount} < ${threshold} after ${options.timeout}ms (dockRounds=${dockRounds})`,
        detail: {
          baselineCount: baseline,
          finalCount,
          dockRounds,
          durationMs
        }
      };
    }
    const matched = await waitForChange(remaining, () => {
      if (countNow() >= threshold) return true;
      if (autoAnswerDock && findVisibleElement(dockSelector)) return true;
      return false;
    });
    if (!matched) continue;
    const count = countNow();
    if (count >= threshold) {
      const durationMs = performance.now() - start;
      return {
        index: 0,
        action,
        status: "ok",
        duration: durationMs,
        detail: {
          baselineCount: baseline,
          finalCount: count,
          attrs: readArtifactAttrs(),
          dockRounds,
          durationMs
        }
      };
    }
    dockRounds++;
    if (dockRounds > dockMaxRounds) {
      const durationMs = performance.now() - start;
      return {
        index: 0,
        action,
        status: "fail",
        duration: durationMs,
        error: `dock runaway: answered ${dockRounds} rounds, dock still appearing`,
        detail: {
          baselineCount: baseline,
          finalCount: count,
          dockRounds,
          durationMs
        }
      };
    }
    tryClick('[data-action-ui-id="chat-question-option-0"]');
    await sleep(300);
    tryClick('[data-action-ui-id="chat-question-next"]');
    tryClick('[data-action-ui-id="chat-question-submit"]');
    await sleep(150);
  }
}
let screenshotHandler = null;
function setScreenshotHandler(handler) {
  screenshotHandler = handler;
}
async function click(selector) {
  const start = performance.now();
  const el = findVisibleElement(selector);
  if (!el) {
    return {
      index: 0,
      action: `click ${selector}`,
      status: "fail",
      duration: performance.now() - start,
      error: `Element not found: ${selector}`
    };
  }
  const rect = el instanceof Element ? el.getBoundingClientRect() : null;
  const clientX = rect ? rect.left + rect.width / 2 : 0;
  const clientY = rect ? rect.top + rect.height / 2 : 0;
  const base = { bubbles: true, cancelable: true, clientX, clientY, view: window, button: 0 };
  el.dispatchEvent(new MouseEvent("mousemove", base));
  el.dispatchEvent(new MouseEvent("mouseover", base));
  el.dispatchEvent(new MouseEvent("mouseenter", { ...base, bubbles: false }));
  el.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerId: 1 }));
  el.dispatchEvent(new MouseEvent("mousedown", base));
  el.dispatchEvent(new PointerEvent("pointerup", { ...base, pointerId: 1 }));
  el.dispatchEvent(new MouseEvent("mouseup", base));
  if (el instanceof HTMLElement) {
    el.focus?.();
    el.click();
  } else {
    el.dispatchEvent(new MouseEvent("click", base));
  }
  return {
    index: 0,
    action: `click ${selector}`,
    status: "ok",
    duration: performance.now() - start
  };
}
async function dismissMenu() {
  const start = performance.now();
  document.body.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
  );
  return {
    index: 0,
    action: "dismiss-menu",
    status: "ok",
    duration: performance.now() - start
  };
}
async function dblclick(selector) {
  const start = performance.now();
  const el = findVisibleElement(selector);
  if (!el) {
    return {
      index: 0,
      action: `dblclick ${selector}`,
      status: "fail",
      duration: performance.now() - start,
      error: `Element not found: ${selector}`
    };
  }
  const dispatchClick = () => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  dispatchClick();
  dispatchClick();
  el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, detail: 2 }));
  return {
    index: 0,
    action: `dblclick ${selector}`,
    status: "ok",
    duration: performance.now() - start
  };
}
async function hover(selector) {
  const start = performance.now();
  const el = findVisibleElement(selector);
  if (!el) {
    return {
      index: 0,
      action: `hover ${selector}`,
      status: "fail",
      duration: performance.now() - start,
      error: `Element not found: ${selector}`
    };
  }
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
  const chain = [];
  let node = el;
  while (node) {
    chain.push(node);
    node = node.parentElement;
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    chain[i].dispatchEvent(new MouseEvent("mouseenter", { ...opts, bubbles: false }));
  }
  el.dispatchEvent(new MouseEvent("mouseover", opts));
  el.dispatchEvent(new MouseEvent("mousemove", opts));
  return {
    index: 0,
    action: `hover ${selector}`,
    status: "ok",
    duration: performance.now() - start
  };
}
async function contextmenu(selector) {
  const start = performance.now();
  const el = findVisibleElement(selector);
  if (!el) {
    return {
      index: 0,
      action: `contextmenu ${selector}`,
      status: "fail",
      duration: performance.now() - start,
      error: `Element not found: ${selector}`
    };
  }
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  el.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 2,
      clientX: x,
      clientY: y
    })
  );
  return {
    index: 0,
    action: `contextmenu ${selector}`,
    status: "ok",
    duration: performance.now() - start
  };
}
async function typeText(selector, value) {
  const start = performance.now();
  const el = findVisibleElement(selector);
  const action = `type "${value}" into ${selector}`;
  if (!el) {
    return {
      index: 0,
      action,
      status: "fail",
      duration: performance.now() - start,
      error: `Element not found: ${selector}`
    };
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    const tracker = el._valueTracker;
    tracker?.setValue("");
    if (nativeSetter) {
      nativeSetter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        data: value,
        inputType: "insertText"
      })
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { index: 0, action, status: "ok", duration: performance.now() - start };
  }
  if (el instanceof HTMLElement && (el.isContentEditable || el.getAttribute("contenteditable") !== null)) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    try {
      document.execCommand("delete", false);
    } catch {
    }
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, value);
    } catch {
      inserted = false;
    }
    if (!inserted) {
      try {
        const dt = new DataTransfer();
        dt.setData("text/plain", value);
        const pasteEvent = new ClipboardEvent("paste", {
          clipboardData: dt,
          bubbles: true,
          cancelable: true
        });
        el.dispatchEvent(pasteEvent);
        inserted = true;
      } catch (err) {
        return {
          index: 0,
          action,
          status: "fail",
          duration: performance.now() - start,
          error: `Both execCommand and paste-event failed on contentEditable: ${selector} (${err instanceof Error ? err.message : String(err)})`
        };
      }
    }
    return { index: 0, action, status: "ok", duration: performance.now() - start };
  }
  return {
    index: 0,
    action,
    status: "fail",
    duration: performance.now() - start,
    error: `Element is not an input, textarea, or contentEditable: ${selector}`
  };
}
async function tryAnswerDockIfPresent() {
  if (!findVisibleElement('[data-action-ui-id="chat-question-dock"]')) return false;
  const opt = findVisibleElement('[data-action-ui-id="chat-question-option-0"]');
  if (opt instanceof HTMLElement) opt.click();
  await new Promise((r) => setTimeout(r, 200));
  const next = findVisibleElement('[data-action-ui-id="chat-question-next"]');
  if (next instanceof HTMLElement) next.click();
  const submit = findVisibleElement('[data-action-ui-id="chat-question-submit"]');
  if (submit instanceof HTMLElement) submit.click();
  return true;
}
async function waitForElement(selector, timeout) {
  const start = performance.now();
  if (findVisibleElement(selector)) {
    return {
      index: 0,
      action: `wait for ${selector}`,
      status: "ok",
      duration: performance.now() - start
    };
  }
  return new Promise((resolve) => {
    let settled = false;
    const dockPoller = setInterval(() => {
      if (settled) return;
      void tryAnswerDockIfPresent();
    }, 500);
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      clearInterval(dockPoller);
      observer.disconnect();
      resolve({
        index: 0,
        action: `wait for ${selector}`,
        status: "fail",
        duration: performance.now() - start,
        error: `Timed out waiting for ${selector} after ${timeout}ms`
      });
    }, timeout);
    const observer = new MutationObserver(() => {
      if (!findVisibleElement(selector)) return;
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(dockPoller);
      observer.disconnect();
      resolve({
        index: 0,
        action: `wait for ${selector}`,
        status: "ok",
        duration: performance.now() - start
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  });
}
function checkCondition(step) {
  const el = findVisibleElement(step.target);
  switch (step.condition) {
    case "exists":
      return el ? { passed: true } : { passed: false, error: `Element not found: ${step.target}` };
    case "not-exists":
      return !el ? { passed: true } : { passed: false, error: `Element should not exist: ${step.target}` };
    case "contains":
      if (!step.value) {
        return {
          passed: false,
          error: `"contains" assertion requires a non-empty "value" to match against`
        };
      }
      if (!el) return { passed: false, error: `Element not found: ${step.target}` };
      {
        const text = el.textContent ?? "";
        return text.includes(step.value) ? { passed: true } : { passed: false, error: `Element text "${text}" does not contain "${step.value}"` };
      }
    case "not-empty":
      if (!el) return { passed: false, error: `Element not found: ${step.target}` };
      {
        const content = el.textContent ?? "";
        return content.trim().length > 0 ? { passed: true } : { passed: false, error: `Element is empty: ${step.target}` };
      }
    case "visible":
      if (!el) return { passed: false, error: `Element not found: ${step.target}` };
      {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
        return isVisible ? { passed: true } : { passed: false, error: `Element is not visible: ${step.target}` };
      }
    case "count": {
      const expected = Number(step.value);
      if (!Number.isSafeInteger(expected) || expected < 0) {
        return {
          passed: false,
          error: `"count" assertion requires a non-negative integer "value"`
        };
      }
      const actual = document.querySelectorAll(step.target).length;
      return actual === expected ? { passed: true } : {
        passed: false,
        error: `Element count ${actual} does not equal ${expected}: ${step.target}`
      };
    }
  }
}
async function assertElement(step) {
  const start = performance.now();
  const actionLabel = `assert ${step.condition} on ${step.target}`;
  const first = checkCondition(step);
  if (first.passed) {
    return { index: 0, action: actionLabel, status: "ok", duration: performance.now() - start };
  }
  if (!step.timeout) {
    return {
      index: 0,
      action: actionLabel,
      status: "fail",
      duration: performance.now() - start,
      error: first.error
    };
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      const last = checkCondition(step);
      resolve({
        index: 0,
        action: actionLabel,
        status: "fail",
        duration: performance.now() - start,
        error: last.passed ? void 0 : last.error
      });
    }, step.timeout);
    const observer = new MutationObserver(() => {
      if (settled) return;
      const result = checkCondition(step);
      if (!result.passed) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve({ index: 0, action: actionLabel, status: "ok", duration: performance.now() - start });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  });
}
async function navigateTo(route) {
  const start = performance.now();
  try {
    window.history.pushState({}, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return {
      index: 0,
      action: `navigate to ${route}`,
      status: "ok",
      duration: performance.now() - start
    };
  } catch (err) {
    return {
      index: 0,
      action: `navigate to ${route}`,
      status: "fail",
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
async function takeScreenshot(path) {
  const start = performance.now();
  if (!screenshotHandler) {
    return {
      index: 0,
      action: "take screenshot",
      status: "fail",
      duration: performance.now() - start,
      error: "Screenshot handler not initialised"
    };
  }
  try {
    const savedPath = await screenshotHandler(path);
    return {
      index: 0,
      action: "take screenshot",
      status: "ok",
      duration: performance.now() - start,
      detail: { path: savedPath }
    };
  } catch (err) {
    return {
      index: 0,
      action: "take screenshot",
      status: "fail",
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
const WORKSPACE_BROWSER_HOST_PATTERN = /^wi-[a-f0-9]{32}-g[1-9][0-9]*\.hilo\.localhost$/;
const WORKSPACE_BROWSER_PROBE_MESSAGE = "hilo:test-driver:workspace-browser-origin";
const WORKSPACE_BROWSER_PROBE_TOKEN_QUERY = "hilo_test_probe";
const DEFAULT_PROBE_TIMEOUT_MS = 15e3;
const MAX_PROBE_TIMEOUT_MS = 6e4;
function failResult(start, error) {
  return {
    index: 0,
    action: "custom: probe-workspace-browser-origin",
    status: "fail",
    duration: performance.now() - start,
    error
  };
}
function readProbeParams(params) {
  const rawUrl = params?.url;
  if (typeof rawUrl !== "string") {
    return "probe-workspace-browser-origin requires params.url:string";
  }
  const rawTimeout = params?.timeout;
  if (rawTimeout !== void 0 && (typeof rawTimeout !== "number" || !Number.isSafeInteger(rawTimeout) || rawTimeout < 1 || rawTimeout > MAX_PROBE_TIMEOUT_MS)) {
    return `probe-workspace-browser-origin params.timeout must be an integer between 1 and ${MAX_PROBE_TIMEOUT_MS}`;
  }
  return {
    url: rawUrl,
    timeout: rawTimeout
  };
}
function parseWorkspaceBrowserUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" || !WORKSPACE_BROWSER_HOST_PATTERN.test(url.hostname)) {
      return void 0;
    }
    return url;
  } catch {
    return void 0;
  }
}
function createProbeToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
function readMessageRecord(data) {
  return data !== null && typeof data === "object" && !Array.isArray(data) ? data : void 0;
}
async function probeWorkspaceBrowserOrigin(params) {
  const start = performance.now();
  const parsedParams = readProbeParams(params);
  if (typeof parsedParams === "string") return failResult(start, parsedParams);
  const url = parseWorkspaceBrowserUrl(parsedParams.url);
  if (!url) {
    return failResult(
      start,
      "probe-workspace-browser-origin only accepts http://wi-<instance>-g<generation>.hilo.localhost URLs"
    );
  }
  const token = createProbeToken();
  url.searchParams.set(WORKSPACE_BROWSER_PROBE_TOKEN_QUERY, token);
  const timeout = parsedParams.timeout ?? DEFAULT_PROBE_TIMEOUT_MS;
  const iframe = document.createElement("iframe");
  iframe.dataset.hiloTestDriverProbe = "workspace-browser-origin";
  iframe.src = url.toString();
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:16px;height:16px;border:0;opacity:0.01;";
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      iframe.remove();
      resolve(result);
    };
    const handleMessage = (event) => {
      if (event.origin !== url.origin || event.source !== iframe.contentWindow) return;
      const record = readMessageRecord(event.data);
      if (record?.type !== WORKSPACE_BROWSER_PROBE_MESSAGE || record.token !== token) {
        return;
      }
      const detail = readMessageRecord(record.detail) ?? {};
      if (record.ok === true) {
        finish({
          index: 0,
          action: "custom: probe-workspace-browser-origin",
          status: "ok",
          duration: performance.now() - start,
          detail: { origin: url.origin, ...detail }
        });
        return;
      }
      const message = typeof record.error === "string" && record.error.length > 0 ? record.error : "workspace browser-origin fixture reported a failed check";
      finish(failResult(start, message));
    };
    const timer = setTimeout(() => {
      finish(failResult(start, `workspace browser-origin probe timed out after ${timeout}ms`));
    }, timeout);
    window.addEventListener("message", handleMessage);
    document.body.append(iframe);
  });
}
function resolveTemplateVars(step) {
  const now = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const vars = {
    date,
    time,
    datetime: `${date} ${time}`,
    timestamp: String(Math.floor(now.getTime() / 1e3))
  };
  const replace = (s) => s.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
  return JSON.parse(
    JSON.stringify(step),
    (_key, value) => typeof value === "string" ? replace(value) : value
  );
}
function describeAction(step) {
  if ("click" in step) return `click ${step.click}`;
  if ("dblclick" in step) return `dblclick ${step.dblclick}`;
  if ("contextmenu" in step) return `contextmenu ${step.contextmenu}`;
  if ("hover" in step) return `hover ${step.hover}`;
  if ("dismiss-menu" in step) return "dismiss-menu";
  if ("type" in step) return `type "${step.type.value}" into ${step.type.target}`;
  if ("wait" in step) return `wait for ${step.wait.target}`;
  if ("assert" in step) return `assert ${step.assert.condition} on ${step.assert.target}`;
  if ("navigate" in step) return `navigate to ${step.navigate}`;
  if ("screenshot" in step) return `screenshot ${step.screenshot.path}`;
  if ("sleep" in step) return `sleep ${step.sleep}ms`;
  if ("custom" in step) return `custom: ${step.custom.name}`;
  if ("read" in step) return `read ${step.read}`;
  if ("read-attr" in step) {
    const idx = step["read-attr"].index;
    const idxLabel = idx !== void 0 ? `[${idx}]` : "";
    return `read-attr ${step["read-attr"].attr} from ${step["read-attr"].target}${idxLabel}`;
  }
  if ("count-elements" in step) return `count-elements ${step["count-elements"].target}`;
  if ("wait-count" in step) {
    const wc = step["wait-count"];
    const threshold = wc.min ?? (wc.baseline !== void 0 ? wc.baseline + 1 : "?");
    return `wait-count ${wc.target} >= ${threshold}`;
  }
  if ("wait-any" in step) return `wait-any [${step["wait-any"].targets.join(", ")}]`;
  if ("wait-stage" in step) {
    const ws = step["wait-stage"];
    const expected = ws.expectedNew ?? 1;
    return `wait-stage ${ws.artifactSelector} +${expected}`;
  }
  if ("switch-window" in step) return `switch-window ${step["switch-window"]}`;
  if ("reset" in step) return "reset";
  return "unknown action";
}
const DEBUG_PANEL_OPEN_EVENT = "hub:debug-panel-open";
const DEBUG_FLAG_CHANGED_EVENT = "hilo:debug-flag-changed";
const DEBUG_FLAG_KEYS = {
  forceOfflineBanner: "hilo.debug.forceOfflineBanner"
};
const ALLOWED_DEBUG_FLAG_KEYS = new Set(Object.values(DEBUG_FLAG_KEYS));
const MAX_TEST_FILE_BYTES = 1024 * 1024;
const TOGGLE_STATE_TIMEOUT_MS = 1e3;
const TOGGLE_STATE_POLL_MS = 20;
function readRuntimeConfigProbe() {
  const candidate = window.__HILO_CONFIG__;
  if (typeof candidate !== "object" || candidate === null) return void 0;
  const record = candidate;
  return {
    env: typeof record.env === "string" ? record.env : void 0,
    channel: typeof record.channel === "string" ? record.channel : void 0
  };
}
function canUseDebugTooling() {
  const config = readRuntimeConfigProbe();
  if (!config) return true;
  return config.env === "development" || config.env === "test" || config.channel !== "prod";
}
function isAllowedDebugFlagKey(key) {
  return ALLOWED_DEBUG_FLAG_KEYS.has(key);
}
function readToggleChecked(element) {
  if (element instanceof HTMLInputElement && element.type === "checkbox") {
    return element.checked;
  }
  const ariaChecked = element.getAttribute("aria-checked");
  if (ariaChecked === "true" || ariaChecked === "false") return ariaChecked === "true";
  const dataState = element.dataset.state;
  if (dataState === "checked" || dataState === "unchecked") return dataState === "checked";
  return void 0;
}
async function waitForToggleState(element, checked) {
  const deadline = performance.now() + TOGGLE_STATE_TIMEOUT_MS;
  while (performance.now() < deadline) {
    if (readToggleChecked(element) === checked) return true;
    await new Promise((resolve) => setTimeout(resolve, TOGGLE_STATE_POLL_MS));
  }
  return readToggleChecked(element) === checked;
}
async function executeCustomAction(custom) {
  const start = performance.now();
  if (custom.name === "open-debug-panel") {
    window.dispatchEvent(new CustomEvent(DEBUG_PANEL_OPEN_EVENT));
    return {
      index: 0,
      action: `custom: ${custom.name}`,
      status: "ok",
      duration: performance.now() - start
    };
  }
  if (custom.name === "set-debug-flag") {
    const key = custom.params?.key;
    const enabled = custom.params?.enabled;
    if (typeof key !== "string" || typeof enabled !== "boolean") {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: "set-debug-flag requires params.key:string and params.enabled:boolean"
      };
    }
    if (!isAllowedDebugFlagKey(key)) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: `Unknown debug flag key: ${key}`
      };
    }
    if (!canUseDebugTooling()) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: "Debug tooling is disabled in this runtime"
      };
    }
    if (enabled) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(DEBUG_FLAG_CHANGED_EVENT, { detail: { key } }));
    return {
      index: 0,
      action: `custom: ${custom.name}`,
      status: "ok",
      duration: performance.now() - start,
      detail: { key, enabled }
    };
  }
  if (custom.name === "probe-workspace-browser-origin") {
    return probeWorkspaceBrowserOrigin(custom.params);
  }
  if (custom.name === "set-toggle-state") {
    if (!canUseDebugTooling()) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: "Debug tooling is disabled in this runtime"
      };
    }
    const target = custom.params?.target;
    const checked = custom.params?.checked;
    if (typeof target !== "string" || typeof checked !== "boolean") {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: "set-toggle-state requires params.target:string and params.checked:boolean"
      };
    }
    const element = document.querySelector(target);
    if (!element) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: `Toggle not found: ${target}`
      };
    }
    const initialChecked = readToggleChecked(element);
    if (initialChecked === void 0) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: `Element does not expose a supported toggle state: ${target}`
      };
    }
    if (initialChecked !== checked) element.click();
    if (!await waitForToggleState(element, checked)) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: `Toggle did not reach checked=${checked}: ${target}`
      };
    }
    return {
      index: 0,
      action: `custom: ${custom.name}`,
      status: "ok",
      duration: performance.now() - start,
      detail: { target, checked, changed: initialChecked !== checked }
    };
  }
  if (custom.name === "set-file-input") {
    if (!canUseDebugTooling()) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: "Debug tooling is disabled in this runtime"
      };
    }
    const target = custom.params?.target;
    const name = custom.params?.name;
    const mimeType = custom.params?.mimeType;
    const base64 = custom.params?.base64;
    if (typeof target !== "string" || typeof name !== "string" || typeof mimeType !== "string" || typeof base64 !== "string") {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: "set-file-input requires target, name, mimeType, and base64 string params"
      };
    }
    const input = document.querySelector(target);
    if (!input || input.type !== "file") {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: `File input not found: ${target}`
      };
    }
    try {
      const decoded = atob(base64);
      if (decoded.length > MAX_TEST_FILE_BYTES) {
        throw new Error(`test file exceeds ${MAX_TEST_FILE_BYTES} bytes`);
      }
      const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
      const file = new File([bytes], name, { type: mimeType });
      if (typeof DataTransfer === "undefined") {
        Object.defineProperty(input, "files", { configurable: true, value: [file] });
      } else {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
      }
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "ok",
        duration: performance.now() - start,
        detail: { count: input.files?.length ?? 0, name, size: bytes.byteLength }
      };
    } catch (error) {
      return {
        index: 0,
        action: `custom: ${custom.name}`,
        status: "fail",
        duration: performance.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    index: 0,
    action: `custom: ${custom.name}`,
    status: "fail",
    duration: performance.now() - start,
    error: `Unknown custom action: ${custom.name}`
  };
}
async function executeOneStep(step) {
  const resolved = resolveTemplateVars(step);
  if ("click" in resolved) return click(resolved.click);
  if ("dblclick" in resolved) return dblclick(resolved.dblclick);
  if ("contextmenu" in resolved) return contextmenu(resolved.contextmenu);
  if ("hover" in resolved) return hover(resolved.hover);
  if ("dismiss-menu" in resolved) return dismissMenu();
  if ("type" in resolved) return typeText(resolved.type.target, resolved.type.value);
  if ("wait" in resolved) return waitForElement(resolved.wait.target, resolved.wait.timeout);
  if ("assert" in resolved) return assertElement(resolved.assert);
  if ("navigate" in resolved) return navigateTo(resolved.navigate);
  if ("screenshot" in resolved) return takeScreenshot(resolved.screenshot.path);
  if ("read" in resolved) return readText(resolved.read);
  if ("read-attr" in resolved)
    return readAttr(
      resolved["read-attr"].target,
      resolved["read-attr"].attr,
      resolved["read-attr"].index
    );
  if ("count-elements" in resolved) return countElements(resolved["count-elements"].target);
  if ("wait-count" in resolved) {
    const wc = resolved["wait-count"];
    return waitCount(wc.target, { min: wc.min, baseline: wc.baseline, timeout: wc.timeout });
  }
  if ("wait-any" in resolved)
    return waitAny(resolved["wait-any"].targets, resolved["wait-any"].timeout);
  if ("wait-stage" in resolved) {
    const ws = resolved["wait-stage"];
    return waitStage({
      artifactSelector: ws.artifactSelector,
      timeout: ws.timeout,
      baseline: ws.baseline,
      expectedNew: ws.expectedNew,
      autoAnswerDock: ws.autoAnswerDock,
      dockMaxRounds: ws.dockMaxRounds,
      readAttrs: ws.readAttrs
    });
  }
  if ("switch-window" in resolved) {
    return {
      index: 0,
      action: `switch-window ${resolved["switch-window"]}`,
      status: "skip",
      duration: 0,
      error: "switch-window must be handled by main process"
    };
  }
  if ("reset" in resolved) {
    return {
      index: 0,
      action: "reset",
      status: "skip",
      duration: 0,
      error: "reset must be handled by main process"
    };
  }
  if ("sleep" in resolved) {
    const start = performance.now();
    await new Promise((resolve) => {
      setTimeout(resolve, resolved.sleep);
    });
    return {
      index: 0,
      action: `sleep ${resolved.sleep}ms`,
      status: "ok",
      duration: performance.now() - start
    };
  }
  if ("custom" in resolved) {
    return await executeCustomAction(resolved.custom);
  }
  return {
    index: 0,
    action: "unknown",
    status: "fail",
    duration: 0,
    error: "Unknown step action"
  };
}
async function executeSteps(steps, name = "unnamed") {
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const results = [];
  let failedStep;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const result = await executeOneStep(step);
    result.index = i;
    result.action = describeAction(resolveTemplateVars(step));
    results.push(result);
    if (result.status === "fail") {
      failedStep = i;
      break;
    }
  }
  return {
    name,
    startedAt,
    completedAt: (/* @__PURE__ */ new Date()).toISOString(),
    steps: results,
    status: failedStep !== void 0 ? "fail" : "pass",
    failedStep
  };
}
function getAppState() {
  const activeEl = document.querySelector('[data-action-ui-id="active-session"]');
  return {
    currentRoute: window.location.pathname + window.location.hash,
    windowTitle: document.title,
    sessionCount: document.querySelectorAll('[data-action-ui-id="session-item"]').length,
    focusedSessionId: activeEl?.getAttribute("data-session-id") ?? void 0
  };
}
function initTestDriverBridge(ipc) {
  setScreenshotHandler((path) => ipc.sendScreenshotRequest(path));
  ipc.onCommand(async (request) => {
    try {
      let data;
      switch (request.command) {
        case "executeStep":
          data = await executeOneStep(request.payload);
          break;
        case "getAppState":
          data = getAppState();
          break;
        case "runStory": {
          const payload = request.payload;
          data = await executeSteps(payload.steps, payload.name);
          break;
        }
        default:
          throw new Error(`Unknown command: ${String(request.command)}`);
      }
      return { id: request.id, success: true, data };
    } catch (err) {
      return {
        id: request.id,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  });
}
export {
  initTestDriverBridge
};
