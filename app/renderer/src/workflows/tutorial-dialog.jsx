// 工作流使用教程弹窗与常见问题。
import { useTranslation, ExternalLink, usePlatform } from "../vendor.js";
import { Button, Dialog, DialogContent, DialogHeader } from "../infra/dialog-content.jsx";
import { Icon, openExternalUrl, WORKFLOW_TUTORIAL_SOURCE_URL } from "../vendor-inline/vscode-base/graph.jsx";
import { DialogTitle, DialogDescription } from "../infra/badge-variants.jsx";
import { BookOpen } from "../media-editing/package.jsx";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../media-editing/message-list-props-equal.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const WORKFLOW_TUTORIAL_FAQ_ITEMS = [
  {
    id: "openSourceModel",
    links: [],
  },
  {
    id: "openSourceWorkflow",
    links: [],
  },
  {
    id: "deployment",
    answerLayout: "steps",
    links: [
      {
        id: "comfyRepository",
        href: "https://huggingface.co/Comfy-Org/MiniMax-H3",
      },
      {
        id: "comfyTutorial",
        href: "https://docs.comfy.org/tutorials/video/minimax/minimax-h3",
      },
      {
        id: "diffusers",
        href: "https://huggingface.co/MiniMaxAI/MiniMax-H3",
      },
      {
        id: "github",
        href: "https://github.com/MiniMax-AI/MiniMax-H3",
      },
    ],
  },
  {
    id: "hardware",
    links: [],
  },
  {
    id: "capabilities",
    links: [],
  },
  {
    id: "pricing",
    links: [
      {
        id: "pricing",
        href: "https://www.minimaxi.com/price",
      },
      {
        id: "hailuo",
        href: "https://hailuoai.com/",
      },
    ],
  },
  {
    id: "openSourceVsOnline",
    links: [
      {
        id: "contextIr",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-h3-context-ir",
      },
      {
        id: "regenerate2k",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-regeneration",
      },
    ],
  },
  {
    id: "prompting",
    links: [
      {
        id: "baseGuide",
        href: "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md",
      },
      {
        id: "referenceGuide",
        href: "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md",
      },
      {
        id: "github",
        href: "https://github.com/MiniMax-AI/MiniMax-H3",
      },
    ],
  },
  {
    id: "commercialUse",
    links: [],
  },
  {
    id: "regionalAvailability",
    links: [
      {
        id: "authorization",
        href: "https://platform.minimaxi.com/h3-license",
      },
    ],
  },
  {
    id: "api",
    answerLayout: "steps",
    links: [
      {
        id: "platform",
        href: "https://platform.minimaxi.com/",
      },
      {
        id: "contextIr",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-h3-context-ir",
      },
      {
        id: "regenerate2k",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-regeneration",
      },
      {
        id: "videoEndpoint",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-create",
      },
      {
        id: "pricing",
        href: "https://www.minimaxi.com/price",
      },
    ],
  },
  {
    id: "fineTuning",
    links: [],
  },
  {
    id: "productionServing",
    links: [
      {
        id: "vllmRecipe",
        href: "https://recipes.vllm.ai/MiniMaxAI/MiniMax-H3",
      },
    ],
  },
  {
    id: "acceptableUse",
    links: [],
  },
  {
    id: "support",
    links: [
      {
        id: "discord",
        href: "https://discord.com/invite/dbMxutw7tP",
      },
      {
        id: "github",
        href: "https://github.com/MiniMax-AI/MiniMax-H3",
      },
      {
        id: "huggingFace",
        href: "https://huggingface.co/MiniMaxAI/MiniMax-H3",
      },
      {
        id: "modelScope",
        href: "https://modelscope.cn/organization/minimax",
      },
      {
        id: "minimaxX",
        href: "https://x.com/MiniMax_AI",
      },
      {
        id: "hailuoX",
        href: "https://x.com/Hailuo_AI",
      },
      {
        id: "platform",
        href: "https://platform.minimaxi.com/",
      },
    ],
  },
];
export function WorkflowTutorialDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="flex max-h-[min(760px,86dvh)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="workflows-tutorial-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border-soft px-6 py-5 pr-16">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent">
              <Icon icon={BookOpen} size="md" aria-hidden={true} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg">{t("workflows.tutorialFaq.title")}</DialogTitle>
              <DialogDescription className="mt-1 text-[15px] leading-6">
                {t("workflows.tutorialFaq.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--scrollbar-thumb)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-thumb)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--scrollbar-thumb-hover)] [&::-webkit-scrollbar-track]:bg-transparent"
          data-action-ui-id="workflows-tutorial-scroll"
        >
          <Accordion defaultValue={[WORKFLOW_TUTORIAL_FAQ_ITEMS[0].id]} className="px-6 py-2">
            {WORKFLOW_TUTORIAL_FAQ_ITEMS.map((item, index) => {
              const answerParts = t(`workflows.tutorialFaq.items.${item.id}.answer`)
                .split(/\n{2,}/)
                .map((part) => part.trim())
                .filter(Boolean);
              return (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger
                    className="gap-3 py-4 text-[15px] leading-6 hover:no-underline"
                    data-action-ui-id={`workflows-tutorial-faq-${item.id}`}
                  >
                    <span className="flex min-w-0 items-start gap-3 pr-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-normal text-muted-foreground transition-colors duration-150 group-aria-expanded/accordion-trigger:bg-brand-accent/10 group-aria-expanded/accordion-trigger:text-brand-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{t(`workflows.tutorialFaq.items.${item.id}.question`)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pr-9 pb-4 pl-9 text-sm leading-7 text-muted-foreground">
                    {"answerLayout" in item && item.answerLayout === "steps" ? (
                      <ol
                        className="space-y-2.5"
                        data-action-ui-id={`workflows-tutorial-answer-${item.id}`}
                      >
                        {answerParts.map((part, stepIndex) => (
                          <li
                            key={`${item.id}-${part}`}
                            className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-2.5"
                            data-action-ui-id={`workflows-tutorial-answer-step-${item.id}`}
                          >
                            <span className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-foreground">
                              {stepIndex + 1}
                            </span>
                            <p>{part}</p>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div
                        className="space-y-2.5"
                        data-action-ui-id={`workflows-tutorial-answer-${item.id}`}
                      >
                        {answerParts.map((part) => (
                          <p key={`${item.id}-${part}`}>{part}</p>
                        ))}
                      </div>
                    )}
                    {item.links.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.links.map((link) => (
                          <Button
                            key={`${item.id}-${link.id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 rounded-md pl-2.5 pr-3 text-xs font-normal"
                            onClick={() => {
                              void openExternalUrl(platform, link.href, {
                                source: `workflows.tutorial-faq.${item.id}.${link.id}`,
                              });
                            }}
                            data-action-ui-id={`workflows-tutorial-link-${item.id}-${link.id}`}
                          >
                            <Icon
                              icon={ExternalLink}
                              size="sm"
                              strokeWidth={1.5}
                              aria-hidden={true}
                            />
                            {t(`workflows.tutorialFaq.links.${link.id}`)}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
        <div className="flex shrink-0 items-center border-t border-border-soft px-6 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md pl-2.5 pr-3 text-[13px] font-normal text-muted-foreground"
            onClick={() => {
              void openExternalUrl(platform, WORKFLOW_TUTORIAL_SOURCE_URL, {
                source: "workflows.tutorial-faq.source",
              });
            }}
            data-action-ui-id="workflows-tutorial-source"
          >
            <Icon icon={ExternalLink} size="sm" strokeWidth={1.5} aria-hidden={true} />
            {t("workflows.tutorialFaq.source")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
