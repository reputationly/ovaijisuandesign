// typography-tokens.jsx
import { __jsx } from "../shared/jsx-runtime.js";

const TYPOGRAPHY_LEVELS = [
  {
    name: "display-hero",
    className: "text-[64px] leading-[72px] font-light",
    sample: "Hero",
  },
  {
    name: "display-section",
    className: "text-[28px] font-light",
    sample: "章节标题",
  },
  {
    name: "feature",
    className: "text-[22px]",
    sample: "特色内容",
  },
  {
    name: "card-title",
    className: "text-sm font-heading font-medium",
    sample: "卡片标题 Card Title",
  },
  {
    name: "body (text-xs)",
    className: "text-xs",
    sample: "正文 Body Text 12px",
  },
  {
    name: "label (text-[11px])",
    className: "text-[11px] font-medium",
    sample: "Label / Badge 11px",
  },
];

const FONT_FAMILIES = [
  {
    token: "--font-sans",
    className: "font-sans",
    display: "Inter Variable Aa Bb 中文",
  },
  {
    token: "--font-heading",
    className: "font-heading",
    display: "Outfit Aa Bb 中文",
  },
  {
    token: "--font-pixel",
    className: "font-pixel",
    display: "Pixelify Aa Bb",
  },
];

export function TypographyTokens() {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          字号层级
        </h3>
        <div className="flex flex-col gap-3">
          {TYPOGRAPHY_LEVELS.map((level) => (
            <div
              key={level.name}
              className="flex flex-col gap-1 overflow-hidden rounded-lg border border-border p-2"
            >
              <div className="text-[10px] font-mono text-muted-foreground">
                {level.name}
              </div>
              <div
                className={`${level.className} truncate text-foreground`}
                title={level.sample}
              >
                {level.sample}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground truncate">
                {level.className}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          字体族
        </h3>
        <div className="flex flex-col gap-2">
          {FONT_FAMILIES.map((ff) => (
            <div
              key={ff.token}
              className="flex flex-col gap-1 rounded-lg border border-border p-2"
            >
              <div className="text-[10px] font-mono text-muted-foreground">
                {ff.token}
              </div>
              <div
                className={`${ff.className} text-base text-foreground truncate`}
              >
                {ff.display}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
