// make-async-image-task.jsx
import {
  jsxRuntimeExports,
  localizedI18nText,
  reactExports,
  ShieldCheck,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorDialogFrame } from "./connector-dialog-frame.jsx";
import { useIsScrolling } from "../assets/credit-query-keys.jsx";
import {
  Button,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { ConnectorRelationshipGraphic } from "./connector-relationship-graphic.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
const TASK_TRACE_ID = "6a2579bb000000006cca619fd3c07aff";
function makeAsyncImageTask(
  taskId,
  status,
  extra,
  base2 = {
    code: 0,
    message: "",
  },
) {
  return {
    task_id: taskId,
    status,
    base: base2,
    type: "image",
    provider: "midjourney",
    model: "midjourney",
    created_at: 1717837304567,
    updated_at: 1717837337600,
    extra,
  };
}
makeAsyncImageTask("520029720819908618", "TASK_STATUS_COMPLETED", {
  trace_id: TASK_TRACE_ID,
  prompt: "a cute cat in cyberpunk style --ar 1:1",
  n: "4",
  width: "1024",
  height: "1024",
  image_urls: JSON.stringify([
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-0.png",
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-1.png",
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-2.png",
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-3.png",
  ]),
});
makeAsyncImageTask("520029720819908617", "TASK_STATUS_COMPLETED", {
  trace_id: TASK_TRACE_ID,
  prompt: "a cute cat in cyberpunk style --ar 1:1",
  n: "4",
  width: "1024",
  height: "1024",
  image_urls: JSON.stringify([
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840945316795200-520029720819908617-0.png",
    "",
    "",
    "",
  ]),
});
export function connectorTitle(t2, language2, connectorId, displayName2) {
  return t2(
    `connectors.catalog.${connectorId}.title`,
    localizedI18nText(displayName2, language2),
  );
}
export function useConnectorCopy(connectorId, displayName2, namespace2) {
  const { t: t2, i18n } = useTranslation();
  const language2 = i18n?.language ?? "en";
  const name2 = localizedI18nText(displayName2, language2);
  const copy2 = reactExports.useCallback(
    (key2, options) =>
      t2(`connectors.${connectorId}.${key2}`, {
        name: name2,
        ...options,
        defaultValue: t2(`connectors.${namespace2}.${key2}`, {
          name: name2,
          ...options,
        }),
      }),
    [t2, connectorId, namespace2, name2],
  );
  return {
    name: name2,
    copy: copy2,
  };
}
export function ConnectorDialogShell({
  connectorId,
  embedded,
  dismissible,
  onRequestClose,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  if (embedded) return <>{children2}</>;
  return (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => {
        if (!open) onRequestClose();
      }}
      actionUiId={`connectors-${connectorId}-dialog`}
      closeLabel={t2("common.close")}
      size="md"
      className="sm:max-w-[600px]"
      showCloseButton={dismissible}
    >
      {children2}
    </ConnectorDialogFrame>
  );
}
export function ConnectorDialogIntro({
  iconUrl,
  title,
  description,
  children: children2,
}) {
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  return (
    <div
      ref={scrollRef}
      data-scrolling={isScrolling || void 0}
      className="scrollbar-fade scrollbar-fade-compact min-h-0 overflow-y-auto px-6 pt-7 pb-3"
      data-layout-slot="connector-credential-dialog-body"
    >
      <ConnectorRelationshipGraphic
        targetIconUrl={iconUrl}
        className="mb-4 justify-center"
      />
      <DialogHeader className="mb-4 items-center gap-1 text-center">
        <DialogTitle className="text-base leading-5 font-medium text-foreground">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-5 text-muted-foreground">
          {description}
        </DialogDescription>
      </DialogHeader>
      {children2}
    </div>
  );
}
export function ConnectorConsentNote({ text: text2, className }) {
  return (
    <div
      className={`flex gap-2.5 rounded-lg bg-secondary px-3 py-2.5 ${className ?? ""}`}
    >
      <Icon
        icon={ShieldCheck}
        size="sm"
        aria-hidden={true}
        className="mt-0.5 shrink-0 text-muted-foreground"
      />
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {text2}
      </p>
    </div>
  );
}
export function ConnectorDialogError({ message: message2 }) {
  return (
    <p role="alert" className="mt-3 text-xs text-destructive">
      {message2}
    </p>
  );
}
export function ConnectorDialogActions({
  connectorId,
  cancelLabel,
  cancelDisabled = false,
  cancelActionUiId,
  onCancel,
  children: children2,
}) {
  return (
    <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2 px-6 pb-5">
      <Button
        type="button"
        variant="secondary"
        className="h-9 min-w-22 rounded-lg px-4"
        disabled={cancelDisabled}
        onClick={onCancel}
        data-action-ui-id={
          cancelActionUiId ?? `connectors-${connectorId}-cancel`
        }
      >
        {cancelLabel}
      </Button>
      {children2}
    </DialogFooter>
  );
}
export function ConnectorDialogStep({
  ordinal,
  first: first2 = false,
  last: last2 = false,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const lineClassName =
    "absolute left-1/2 w-[1px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--muted-foreground)_0,var(--muted-foreground)_1px,transparent_1px,transparent_3px)]";
  return (
    <section
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2"
      data-layout-slot="connector-credential-step"
    >
      <div className="relative flex justify-center pt-4">
        {first2 ? null : (
          <span aria-hidden={true} className={`${lineClassName} top-0 h-4`} />
        )}
        <span
          aria-hidden={true}
          className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground"
          data-layout-slot="connector-credential-step-node"
        >
          {t2(`connectors.stepOrdinal.${ordinal}`)}
        </span>
        {last2 ? null : (
          <span
            aria-hidden={true}
            className={`${lineClassName} top-10 bottom-0`}
          />
        )}
      </div>
      <div className="min-w-0 py-4">{children2}</div>
    </section>
  );
}
