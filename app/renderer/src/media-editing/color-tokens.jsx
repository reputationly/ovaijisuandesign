// color-tokens.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const COLOR_GROUPS = {
  Surface: [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
  ],
  Interactive: [
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
  ],
  Emphasis: [
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "warning",
  ],
  Utility: ["border", "input", "ring", "brand-accent"],
  Chart: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  Sidebar: [
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ],
};

function useTokenValues(names) {
  const [values, setValues] = reactExports.useState({});
  reactExports.useEffect(() => {
    const read = () => {
      const next = {};
      const styles = getComputedStyle(document.documentElement);
      for (const n2 of names) {
        next[n2] = styles.getPropertyValue(`--${n2}`).trim();
      }
      setValues(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [names]);
  return values;
}

export function ColorTokens() {
  const allNames = Object.values(COLOR_GROUPS).flat();
  const values = useTokenValues(allNames);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-muted-foreground">
        实时读取 CSS 变量值。切换 Light/Dark 自动刷新。悬停查看完整 oklch 值。
      </p>
      {Object.entries(COLOR_GROUPS).map(([group, names]) => (
        <section key={group} className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {group}
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {names.map((tokenName) => (
              <div
                key={tokenName}
                className="flex flex-col gap-1 rounded-lg border border-border p-1.5"
                title={values[tokenName] || ""}
              >
                <div
                  className="h-8 w-full rounded-sm border border-border/60"
                  style={{
                    backgroundColor: `var(--${tokenName})`,
                  }}
                />
                <div
                  className="text-[10px] font-mono text-foreground truncate"
                  title={tokenName}
                >
                  {tokenName}
                </div>
                <div
                  className="text-[9px] font-mono text-muted-foreground truncate"
                  title={values[tokenName] || ""}
                >
                  {values[tokenName] || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
