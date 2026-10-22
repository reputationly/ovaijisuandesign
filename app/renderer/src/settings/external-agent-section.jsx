/**
 * 外部 Agent 设置分区（4.0.3 新增功能的界面部分）。
 *
 * 对应的后端能力已经在前面几轮做完：
 *   · 协议常量 app/packages/protocol/src/external-agent.ts
 *   · HTTP 入口 app/mcp-tools/src/external-main.ts（监听 127.0.0.1:<port>/mcp）
 *   · 进程管理 app/desktop/src/main/external-agent/external-agent-service.ts
 *   · 主进程接线 + 设置变更自动重启（第 98/99 轮）
 *
 * **这里只负责读写 store 里的 externalAgent 三个字段**，不管进程生命周期 ——
 * 主进程订阅了该键的变更，会自己重启服务（第 99 轮的做法）。
 *
 * 与参照的差别（按项目范围）：**没有积分提醒开关**（那是云端能力），
 * 也没有登录要求（本机直连）。
 */
import reactExports from "react";
import { useTranslation } from "react-i18next";

import { __jsx } from "../shared/jsx-runtime.js";
import { useStorage } from "../infra/use-storage.js";

const DEFAULTS = { enabled: false, port: 18810, allowedProjectPaths: [] };

export function ExternalAgentSection() {
  const { t } = useTranslation();
  const [value, , persist] = useStorage("externalAgent");
  const current = { ...DEFAULTS, ...(value ?? {}) };
  const [portText, setPortText] = reactExports.useState(String(current.port));

  const setField = (patch) => persist({ ...current, ...patch });

  reactExports.useEffect(() => {
    setPortText(String(current.port));
  }, [current.port]);

  const commitPort = () => {
    const n = Number.parseInt(portText, 10);
    // 端口只允许 1024-65535：低于 1024 需要特权，浏览器也不允许
    if (!Number.isFinite(n) || n < 1024 || n > 65535) {
      setPortText(String(current.port));
      return;
    }
    if (n !== current.port) setField({ port: n });
  };

  return __jsx(
    "div",
    { className: "flex flex-col gap-3", "data-action-ui-id": "settings-external-agent" },
    __jsx(
      "label",
      { className: "flex items-center justify-between gap-3 text-sm" },
      __jsx("span", null, t("settings.externalAgent.enable", "允许外部 Agent 接入")),
      __jsx("input", {
        type: "checkbox",
        checked: current.enabled === true,
        "data-action-ui-id": "settings-external-agent-enabled",
        onChange: (e) => setField({ enabled: e.target.checked }),
      }),
    ),
    __jsx(
      "label",
      { className: "flex items-center justify-between gap-3 text-sm" },
      __jsx("span", null, t("settings.externalAgent.port", "端口")),
      __jsx("input", {
        type: "number",
        min: 1024,
        max: 65535,
        value: portText,
        "data-action-ui-id": "settings-external-agent-port",
        onChange: (e) => setPortText(e.target.value),
        onBlur: commitPort,
      }),
    ),
    __jsx(
      "p",
      { className: "text-muted-foreground text-xs" },
      t(
        "settings.externalAgent.hint",
        "开启后，外部 Agent 可通过 http://127.0.0.1:{{port}}/mcp 调用与内置助手相同的工具。只监听本机回环地址。",
        { port: current.port },
      ),
    ),
  );
}
