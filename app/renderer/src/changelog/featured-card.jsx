// 更新日志左侧的版本封面卡：窗口标题栏样式、背景图、按字符拼出的版本号。
import { __jsx } from "../shared/jsx-runtime.js";
import { VERSION_CHAR_MAP, updateBg } from "./version-assets.js";
export function FeaturedCard({ version, title, className }) {
  return (
    <div className={`shrink-0 pt-5 ${className ?? ""}`}>
      <div className="bg-muted border border-border rounded-lg shadow-md flex flex-col gap-1 items-center pt-1 pb-2 px-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div className="flex items-center gap-5 w-full">
          <div className="flex gap-1 items-center w-[26px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#ff5f57]" />
            <span className="w-[6px] h-[6px] rounded-full bg-[#febc2e]" />
            <span className="w-[6px] h-[6px] rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-[11px] font-heading font-medium text-foreground text-center">
            {title} {version}
          </span>
          <div className="w-[26px]" />
        </div>
        <div className="relative flex h-[320px] w-[320px] items-center justify-center overflow-hidden rounded-md border border-border bg-background">
          <img
            src={updateBg}
            alt={version}
            className="w-full h-full object-cover transition-opacity duration-200"
          />
          <div className="absolute bottom-[75px] right-[23px] flex items-end justify-center gap-1 w-[140px] h-[40px]">
            {version.split("").map((char, i) => {
              const src = VERSION_CHAR_MAP[char];
              if (!src) return null;
              return (
                <img
                  key={`${version}-${char}-${i}`}
                  src={src}
                  alt={char}
                  className={char === "." ? "h-2" : "h-10"}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
