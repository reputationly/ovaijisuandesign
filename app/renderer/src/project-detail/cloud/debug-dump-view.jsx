// 云端资产的调试数据查看器。
import { h as useTranslation, a3 as dedupedToast, fM as Button, c9 as Copy } from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
export function DebugDumpView({ dump }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          project_id={dump.project_id}
          {" · fetched_at="}
          {dump.fetched_at}
          {" ·"}{" "}
          {t("cloudAssets.debugDumpCallCount", {
            count: dump.calls.length,
          })}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            void navigator.clipboard
              .writeText(JSON.stringify(dump, null, 2))
              .then(() => dedupedToast.success(t("common.copied")))
              .catch(() => dedupedToast.error(t("common.copyFailed")));
          }}
        >
          <Copy size={14} strokeWidth={1.5} data-icon="inline-start" />
          {t("common.copy")}
        </Button>
      </div>
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-auto">
        {dump.calls.map((call) => {
          const [path, query = ""] = call.url.split("?", 2);
          const isError =
            !!call.response && typeof call.response === "object" && "error" in call.response;
          return (
            <details
              key={call.seq}
              open={true}
              className="rounded-md border border-border bg-muted/40"
            >
              <summary className="flex cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2 font-mono text-[11px] leading-4 hover:bg-foreground/[0.03]">
                <span className="text-muted-foreground">#{call.seq}</span>
                <span className="rounded-sm bg-foreground/10 px-1 py-px font-medium text-foreground">
                  {call.method}
                </span>
                <span className="font-medium text-foreground">{path}</span>
                {call.context ? (
                  <span className="rounded-full bg-muted px-1.5 py-px text-muted-foreground">
                    {call.context}
                  </span>
                ) : null}
                {isError ? (
                  <span className="rounded-full bg-destructive/10 px-1.5 py-px font-medium text-destructive">
                    error
                  </span>
                ) : null}
              </summary>
              <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
                {query ? (
                  <div className="flex flex-wrap gap-1 font-mono text-[11px] leading-4">
                    {[...new URLSearchParams(query).entries()].map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-sm border border-border bg-background px-1.5 py-px text-muted-foreground"
                      >
                        {key}=<span className="text-foreground">{value || "(root)"}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <pre className="overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[11px] leading-4 text-foreground">
                  {JSON.stringify(call.response, null, 2)}
                </pre>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
