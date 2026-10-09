// text-editor-skill-categories.jsx
import { Info$1 as Info } from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { TooltipContent } from "../infra/dialog-content.jsx";
function adaptPluginToMarketSkill(p3) {
  const displayNameZh = p3.name?.["zh-CN"] || p3.id;
  const summaryEn = p3.description?.["en-US"] || "";
  const summaryZh = p3.description?.["zh-CN"] || "";
  return {
    name: p3.id,
    displayNameZh,
    summary: summaryEn,
    summaryZh,
    description: summaryEn,
    tools: [],
    tags: p3.tags?.["en-US"] ?? [],
    tagsCn: p3.tags?.["zh-CN"] ?? [],
    creator: "",
    triggerWords: [],
    guidePrompt: "",
    guidePromptEn: "",
    skillType: "plugin",
    version: p3.version,
    hash: p3.hash ?? "",
    installed: p3.installed,
    installedVersion: p3.installedVersion,
    downloads: p3.downloads,
  };
}
export function CapabilityPopoverHeader({ title, description, trailing }) {
  return (
    <div className="flex h-8 min-w-0 items-center justify-between px-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs font-sans font-normal leading-4 text-muted-foreground select-none">
          {title}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={description}
                  data-action-ui-id="capability-popover-description"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                />
              }
            >
              <Icon icon={Info} size="xs" strokeWidth={2} aria-hidden={true} />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72">
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
export const MY_SKILLS_TAG = "__my_skills__";
export const DIRECTOR_STAGE_SKILL_CATEGORIES = [
  {
    value: "director-scene-character",
    label: "3D 场景与人物",
    labelEn: "3D Scene & Character",
    names: ["cinematic-scenes"],
    keywords: [],
  },
  {
    value: "director-camera-movement",
    label: "运镜设计",
    labelEn: "Camera Movement",
    names: ["coordinate-camera-control-designer", "cinematic-motion-language"],
    keywords: [],
  },
];
export const TEXT_EDITOR_SKILL_CATEGORIES = [
  {
    value: "text-writing",
    label: "写作创作",
    labelEn: "Writing",
    names: [
      "writing-fragments",
      "ad-creative",
      "social-caption",
      "short-drama-screenwriter",
      "short-drama-series-writer",
      "content-strategy",
      "translator",
      "translation",
    ],
    keywords: [
      "写作",
      "文案",
      "文章",
      "剧本",
      "小说",
      "诗歌",
      "内容创作",
      "writing",
      "copywriting",
      "article",
      "script",
      "creative",
    ],
  },
  {
    value: "text-processing",
    label: "文本Agent",
    labelEn: "Text Agent",
    names: [
      "podcast-to-content-suite",
      "video-transcript",
      "subtitle-correction",
      "translator",
      "translation",
      "text-summarizer",
      "text-rewriter",
      "proofreading",
    ],
    keywords: [
      "总结",
      "改写",
      "润色",
      "翻译",
      "校对",
      "提取",
      "分析",
      "整理",
      "文档",
      "总结",
      "summar",
      "rewrite",
      "translate",
      "proofread",
      "document",
      "analysis",
    ],
  },
];
