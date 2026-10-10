// inline-rename-input.jsx
import {
  AvatarImage$1,
  AvatarRootContext,
  avatarStateAttributesMapping,
  reactExports,
  useAvatarRootContext,
  useRenderElement,
  useTimeout,
  useTranslation,
} from "../vendor.js";
import { services } from "../vendor-inline/vscode-base/graph.jsx";
import {
  IGatewayReadiness,
  LocalFolderIcon,
} from "../workspace/home-service.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PROJECT_NAME_MAX_CHARS,
  truncateProjectName,
} from "../generation/normalize-skill-detail-metadata.js";
import { AlertDialog, cn$2 as cn } from "./dialog-content.jsx";
import { Users } from "../media-editing/package.jsx";
import { useLoginGuard } from "./schedule.js";
import {
  ActionDropdownMenuContent,
  ActionDropdownMenuItem,
  ActionDropdownMenuSeparator,
} from "../workspace/context-menu-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./badge-variants.jsx";
const GATEWAY_READINESS_FALLBACK_MS = 3e3;
export function HubWordmark({ width = 158, height = 24, alt = "蒜狸小助手", className, style, ...rest }) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("suanli-wordmark inline-flex shrink-0 items-center whitespace-nowrap", className)}
      style={{
        height,
        maxWidth: width,
        fontSize: Math.round(height * 1.2),
        lineHeight: `${height}px`,
        ...style,
      }}
      {...rest}
    >
      蒜狸小助手
    </span>
  );
}
export const BULLET_KEYS = [
  "auth.loginGate.bullet0",
  "auth.loginGate.bullet1",
  "auth.loginGate.bullet2",
];
export function CreateProjectMenuContent({
  actionUiIdPrefix,
  onSelectKind,
  align = "end",
  side = "bottom",
  sideOffset = 4,
  sidebarHoverRegion = false,
}) {
  const { t: t2 } = useTranslation();
  const { guard: loginGuard } = useLoginGuard();
  return (
    <ActionDropdownMenuContent
      align={align}
      side={side}
      sideOffset={sideOffset}
      className="min-w-52"
      data-global-sidebar-hover-region={sidebarHoverRegion ? "true" : void 0}
    >
      <ActionDropdownMenuItem
        onClick={() => {
          if (!loginGuard()) return;
          onSelectKind("local");
        }}
        data-action-ui-id={`${actionUiIdPrefix}.create-local`}
      >
        <LocalFolderIcon className="size-4" aria-hidden="true" />
        {t2("project.create.localTitle")}
      </ActionDropdownMenuItem>
      <ActionDropdownMenuSeparator />
      <ActionDropdownMenuItem
        onClick={() => {
          if (!loginGuard()) return;
          onSelectKind("team");
        }}
        data-action-ui-id={`${actionUiIdPrefix}.create-team`}
      >
        <Users className="size-4" strokeWidth={1.5} />
        {t2("project.create.teamTitle")}
      </ActionDropdownMenuItem>
    </ActionDropdownMenuContent>
  );
}
export function DissolveProjectDialog({
  project: project2,
  onConfirm,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog
      open={Boolean(project2)}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent size="sm" data-action-ui-id="project.dissolve-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t2("project.dissolve.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t2("project.dissolve.description", {
              name: project2?.name ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t2("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t2("project.dissolve.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
const AvatarRoot = reactExports.forwardRef(
  function AvatarRoot2(componentProps, forwardedRef) {
    const { className, render: render2, ...elementProps } = componentProps;
    const [imageLoadingStatus, setImageLoadingStatus] =
      reactExports.useState("idle");
    const state2 = {
      imageLoadingStatus,
    };
    const contextValue = reactExports.useMemo(
      () => ({
        imageLoadingStatus,
        setImageLoadingStatus,
      }),
      [imageLoadingStatus, setImageLoadingStatus],
    );
    const element2 = useRenderElement("span", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: elementProps,
      stateAttributesMapping: avatarStateAttributesMapping,
    });
    return (
      <AvatarRootContext.Provider value={contextValue}>
        {element2}
      </AvatarRootContext.Provider>
    );
  },
);
const AvatarFallback$1 = reactExports.forwardRef(
  function AvatarFallback2(componentProps, forwardedRef) {
    const {
      className,
      render: render2,
      delay,
      ...elementProps
    } = componentProps;
    const { imageLoadingStatus } = useAvatarRootContext();
    const [delayPassed, setDelayPassed] = reactExports.useState(
      delay === void 0,
    );
    const timeout2 = useTimeout();
    reactExports.useEffect(() => {
      if (delay !== void 0) {
        timeout2.start(delay, () => setDelayPassed(true));
      }
      return timeout2.clear;
    }, [timeout2, delay]);
    const state2 = {
      imageLoadingStatus,
    };
    const element2 = useRenderElement("span", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: elementProps,
      stateAttributesMapping: avatarStateAttributesMapping,
      enabled: imageLoadingStatus !== "loaded" && delayPassed,
    });
    return element2;
  },
);
export function Avatar({ className, size: size2 = "default", ...props }) {
  return (
    <AvatarRoot
      data-slot="avatar"
      data-size={size2}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className,
      )}
      {...props}
    />
  );
}
export function AvatarImage({ className, ...props }) {
  return (
    <AvatarImage$1
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className,
      )}
      {...props}
    />
  );
}
export function AvatarFallback({ className, ...props }) {
  return (
    <AvatarFallback$1
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  );
}
export function AvatarGroup({ className, ...props }) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className,
      )}
      {...props}
    />
  );
}
export const ClickableArea = reactExports.forwardRef(
  ({ onClick, onKeyDown, children: children2, ...props }, ref) => {
    return (
      // biome-ignore lint/a11y/useSemanticElements: intentional div[role=button] for cases where nested interactive elements prevent using <button>
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e2) => {
          if (e2.key === "Enter" || e2.key === " ") {
            e2.preventDefault();
            onClick?.();
          }
          onKeyDown?.(e2);
        }}
        {...props}
      >
        {children2}
      </div>
    );
  },
);
ClickableArea.displayName = "ClickableArea";
export function InlineRenameInput({
  initialName,
  placeholder,
  maxLength = PROJECT_NAME_MAX_CHARS,
  className,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = reactExports.useState(initialName);
  const inputRef = reactExports.useRef(null);
  const composingRef = reactExports.useRef(false);
  const effectiveMaxLength = Math.min(maxLength, PROJECT_NAME_MAX_CHARS);
  reactExports.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    input.scrollLeft = 0;
    requestAnimationFrame(() => {
      input.scrollLeft = 0;
    });
  }, []);
  const submit = () => {
    const trimmed = truncateProjectName(value, effectiveMaxLength);
    if (trimmed === truncateProjectName(initialName, effectiveMaxLength)) {
      onCancel();
      return;
    }
    onConfirm(trimmed);
  };
  return (
    <input
      ref={inputRef}
      data-action-ui-id="workspace-inline-rename"
      value={value}
      placeholder={placeholder}
      maxLength={effectiveMaxLength}
      onChange={(e2) => setValue(e2.target.value)}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
      }}
      onKeyDown={(e2) => {
        e2.stopPropagation();
        if (composingRef.current || e2.nativeEvent.isComposing) return;
        if (e2.key === "Enter") submit();
        if (e2.key === "Escape") onCancel();
      }}
      onBlur={submit}
      onClick={(e2) => e2.stopPropagation()}
      onDoubleClick={(e2) => e2.stopPropagation()}
      onMouseDown={(e2) => e2.stopPropagation()}
      onPointerDown={(e2) => e2.stopPropagation()}
      className={cn(
        "w-full min-w-[100px] rounded-sm border border-primary bg-transparent px-1 text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground",
        className,
      )}
    />
  );
}
export function useGatewayReadiness() {
  const [snapshot2, setSnapshot] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    let service2;
    try {
      service2 = services.get(IGatewayReadiness);
    } catch {
      setSnapshot({
        state: "ready",
        url: "",
      });
      return;
    }
    let disposed = false;
    const failOpenTimer = setTimeout(() => {
      if (!disposed)
        setSnapshot(
          (prev) =>
            prev ?? {
              state: "ready",
              url: "",
            },
        );
    }, GATEWAY_READINESS_FALLBACK_MS);
    Promise.resolve(service2.getSnapshot())
      .then((s2) => {
        if (!disposed) setSnapshot((prev) => prev ?? s2);
      })
      .catch(() => {});
    const sub = service2.onDidChange((s2) => {
      if (!disposed) setSnapshot(s2);
    });
    return () => {
      disposed = true;
      clearTimeout(failOpenTimer);
      sub.dispose();
    };
  }, []);
  return snapshot2;
}
export function useGatewayReady() {
  return useGatewayReadiness()?.state === "ready";
}
