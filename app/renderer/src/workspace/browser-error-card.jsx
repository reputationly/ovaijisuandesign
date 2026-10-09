// browser-error-card.jsx
import { AlertCircle, ExternalLink, useTranslation } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { BROWSER_ERROR_ILLUSTRATION_URL } from "./shortcut-hint.jsx";
import { PageStateView } from "../assets/page-state-view.jsx";

function classifyBrowserLoadError(code2) {
  if (code2 === -105 || code2 === -137 || code2 === -803) return "dns";
  if (code2 === -106) return "offline";
  if (code2 === -7 || code2 === -118) return "timeout";
  if ([-111, -130, -131, -136, -115].includes(code2)) return "proxy";
  if (code2 <= -200 && code2 > -300) return "certificate";
  if ([-107, -113, -117].includes(code2)) return "secureConnection";
  if ([-100, -101, -102, -103, -104, -109].includes(code2)) return "connection";
  if ([-20, -21, -22, -27, -138].includes(code2)) return "blocked";
  if ([-300, -301, -302].includes(code2)) return "address";
  if (code2 === -310) return "redirect";
  return "unknown";
}

function browserErrorAllowsExternalOpen(code2, url2) {
  const category = classifyBrowserLoadError(code2);
  if (
    ["certificate", "secureConnection", "blocked", "address"].includes(category)
  )
    return false;
  try {
    return ["https:", "http:"].includes(new URL(url2).protocol);
  } catch {
    return false;
  }
}

function browserErrorSteps(code2, url2) {
  const category = classifyBrowserLoadError(code2);
  const steps = [];
  if (
    ["dns", "timeout", "connection", "redirect", "unknown"].includes(
      category,
    ) &&
    browserErrorAllowsExternalOpen(code2, url2)
  ) {
    steps.push({
      key: "workspace.browser.error.visitExternal",
      action: "external",
    });
  }
  steps.push({
    key: `workspace.browser.error.${category}.advice`,
  });
  return steps;
}

export function BrowserErrorCard({ error, onOpenExternal }) {
  const { t: t2 } = useTranslation();
  const category = classifyBrowserLoadError(error.code);
  const steps = browserErrorSteps(error.code, error.url);
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background px-5 py-8">
      <div className="flex min-h-full items-center justify-center">
        <div
          className="w-full max-w-xl p-6 sm:p-8"
          data-browser-error={category}
        >
          <PageStateView
            state={{
              type: "error",
              actions: [],
              reason: category === "offline" ? "network" : "generic",
              icon: <span />,
              title: (
                <div className="flex items-center gap-5 text-left">
                  <span
                    className="relative flex size-20 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    <Icon
                      icon={AlertCircle}
                      size="lg"
                      className="text-muted-foreground"
                    />
                    <img
                      src={BROWSER_ERROR_ILLUSTRATION_URL}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 size-full object-contain"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-xl font-semibold leading-snug tracking-tight">
                      {t2(`workspace.browser.error.${category}.title`)}
                    </h2>
                    <p className="text-sm font-normal leading-6 text-muted-foreground">
                      {t2(`workspace.browser.error.${category}.description`)}
                    </p>
                  </div>
                </div>
              ),
              description: (
                <div className="mt-5 text-left text-sm leading-6">
                  <div className="border-t border-border/60 pt-5">
                    <h3 className="mb-4 font-semibold text-foreground">
                      {t2("workspace.browser.error.nextStep")}
                    </h3>
                    <ol className="space-y-5">
                      {steps.map((step, index2) => (
                        <li key={step.key} className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-6 w-4 shrink-0 items-center justify-center text-sm font-semibold tabular-nums text-foreground/80"
                          >
                            {index2 + 1}
                          </span>
                          {step.action === "external" ? (
                            <button
                              type="button"
                              onClick={onOpenExternal}
                              className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm text-left font-medium text-foreground underline decoration-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {t2(step.key)}
                              <ExternalLink
                                className="size-4 shrink-0"
                                aria-hidden="true"
                              />
                            </button>
                          ) : (
                            <span className="min-w-0 text-foreground/70">
                              {t2(step.key)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ),
            }}
            className="px-0 py-0 [&_[data-slot=page-state-copy]]:mt-0 [&_[data-slot=page-state-copy]]:max-w-none [&_[data-slot=page-state-copy]>div]:w-full"
          />
          <details className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t2("workspace.browser.error.details")}
            </summary>
            <code className="mt-3 block break-all whitespace-pre-wrap rounded-md bg-muted/50 p-3 leading-5">
              {error.description || "UNKNOWN"}
              {" ("}
              {error.code})
            </code>
          </details>
        </div>
      </div>
    </div>
  );
}
