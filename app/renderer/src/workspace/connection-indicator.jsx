// connection-indicator.jsx
// 侧栏左下角的平台连接状态，替代用户头像和用户名（没有账户体系）。
// 每 3 秒取一次主进程缓存的探测结果；颜色用内联样式，不依赖 CSS 里是否生成了对应的颜色类。
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { platformService } from "../infra/platform-service.js";
const POLL_INTERVAL_MS = 3e3;
const STATE_COLORS = {
  connected: "#22c55e",
  disconnected: "#ef4444",
  checking: "#a3a3a3",
};
function useConnectionState() {
  const { t: t2 } = useTranslation();
  const [status, setStatus] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let alive = true;
    const poll = () => {
      platformService
        .status()
        .then((s) => {
          if (alive) setStatus(s);
        })
        .catch(() => {});
    };
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  const state = status?.state === "connected" || status?.state === "disconnected" ? status.state : "checking";
  const label = t2(`ov.connection.${state}`);
  return { color: STATE_COLORS[state], label, reason: status?.reason || label };
}
export function ConnectionPill() {
  const { color, label, reason } = useConnectionState();
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-body-14" style={{ paddingLeft: 8 }} title={reason}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}
export function ConnectionDot() {
  const { color, label, reason } = useConnectionState();
  return (
    <span
      role="img"
      aria-label={label}
      title={reason}
      style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color }}
    />
  );
}
