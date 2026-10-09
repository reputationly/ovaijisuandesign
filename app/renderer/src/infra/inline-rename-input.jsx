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
export function HubWordmark({
  width = 158,
  height = 24,
  alt = "MiniMax Design",
  className,
  ...rest
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1621 225"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={alt}
      className={cn("shrink-0", className)}
      {...rest}
    >
      <g fill="var(--hub-wordmark-foreground)">
        <path d="M79.6897 110.49L18.47 9.71997H0V171.44H26.5598V67.86L70.47 140.01H88.9397L132.85 67.86V171.44H159.41V9.71997H140.92L79.6897 110.49Z" />
        <path d="M198.22 9.72998C193.92 9.72998 190.33 11.2 187.48 14.13C184.63 17.05 183.2 20.68 183.2 24.98C183.2 29.28 184.63 32.91 187.48 35.83C190.33 38.75 193.92 40.22 198.22 40.22C202.52 40.22 206.31 38.77 209.07 35.83C211.83 32.91 213.22 29.28 213.22 24.98C213.22 20.68 211.84 17.05 209.07 14.13C206.31 11.21 202.68 9.72998 198.22 9.72998Z" />
        <path d="M210.93 60.5499H185.51V171.44H210.93V60.5499Z" />
        <path d="M314.19 64.59C307.73 60.35 300.32 58.24 292.01 58.24C283.7 58.24 276.49 60.12 269.94 63.91C265.68 66.38 262.03 69.44 258.97 73.06V60.55H233.55V171.44H258.97V107.45C258.97 102.53 260.03 98.14 262.21 94.29C264.36 90.44 267.38 87.45 271.23 85.27C275.08 83.12 279.48 82.03 284.4 82.03C291.79 82.03 297.84 84.41 302.53 89.19C307.22 93.97 309.58 100.04 309.58 107.45V171.44H335V101.9C335 94.67 333.14 87.69 329.45 80.98C325.76 74.27 320.68 68.81 314.2 64.58L314.19 64.59Z" />
        <path d="M380.74 60.5499H355.32V171.44H380.74V60.5499Z" />
        <path d="M368.03 9.72998C363.73 9.72998 360.14 11.2 357.29 14.13C354.44 17.05 353.01 20.68 353.01 24.98C353.01 29.28 354.44 32.91 357.29 35.83C360.14 38.75 363.73 40.22 368.03 40.22C372.33 40.22 376.12 38.77 378.88 35.83C381.64 32.91 383.03 29.28 383.03 24.98C383.03 20.68 381.65 17.05 378.88 14.13C376.12 11.21 372.49 9.72998 368.03 9.72998Z" />
        <path d="M486.53 110.49L425.31 9.71997H406.84V171.44H433.4V67.86L477.31 140.01H495.78L539.67 67.86V171.44H566.25V9.71997H547.76L486.53 110.49Z" />
        <path d="M672.52 72.9C669.32 69.21 665.52 66.12 661.08 63.65C654.53 60.02 647.03 58.21 638.56 58.21C628.54 58.21 619.5 60.79 611.41 65.96C603.32 71.13 596.93 78.06 592.24 86.76C587.55 95.46 585.19 105.27 585.19 116.22C585.19 127.17 587.55 136.75 592.24 145.45C596.93 154.15 603.32 161.04 611.41 166.14C619.5 171.22 628.54 173.75 638.56 173.75C647.03 173.75 654.58 171.94 661.2 168.31C665.62 165.91 669.38 162.87 672.53 159.27V171.44H697.95V60.55H672.53V72.9H672.52ZM665.48 140.24C659.7 146.56 652.11 149.71 642.73 149.71C636.57 149.71 631.13 148.28 626.44 145.43C621.75 142.58 618.03 138.61 615.36 133.53C612.66 128.45 611.33 122.58 611.33 115.97C611.33 109.36 612.67 103.49 615.36 98.41C618.06 93.33 621.75 89.37 626.44 86.51C631.13 83.65 636.57 82.23 642.73 82.23C648.89 82.23 654.56 83.66 659.25 86.51C663.94 89.36 667.61 93.33 670.22 98.41C672.83 103.49 674.14 109.35 674.14 115.97C674.14 125.83 671.26 133.92 665.48 140.24Z" />
        <path d="M818.99 60.5499H789.65L766.12 95.6699L741.85 60.5499H711.12L749.99 114.66L709.04 171.44H738.61L764.68 133.33L790.58 171.44H821.09L780.86 114.41L819 60.5499H818.99Z" />
        <path d="M862.07 170.97V162.73C880.2 162.11 883.7 158.82 883.7 139.25V44.08C883.7 24.92 881.02 21.42 865.37 20.6V12.36H943.65C996.38 12.36 1034.7 46.97 1034.7 94.35C1034.7 141.73 999.06 170.98 947.98 170.98H862.08L862.07 170.97ZM917.48 24.92C915.21 24.92 913.98 26.36 913.98 28.42V134.92C913.98 150.78 923.66 158.4 944.26 158.4C980.1 158.4 1000.29 135.95 1000.29 94.75C1000.29 50.87 978.66 24.92 943.23 24.92H917.48Z" />
        <path d="M1151.28 151.81C1138.51 166.23 1123.26 173.03 1104.52 173.03C1070.74 173.03 1047.87 150.58 1047.87 117.82C1047.87 85.06 1072.38 59.73 1106.99 59.73C1136.03 59.73 1153.13 76.42 1153.13 104.43C1153.13 108.76 1152.72 109.17 1146.33 109.17H1080C1079.38 110.61 1079.18 112.67 1079.18 115.97C1079.18 142.75 1091.75 159.64 1111.73 159.64C1123.27 159.64 1134.8 154.28 1145.51 144.6L1151.28 151.81ZM1111.32 97.64C1122.44 97.64 1124.3 97.02 1124.3 92.28C1124.3 80.33 1116.68 71.68 1106.17 71.68C1094.43 71.68 1084.13 82.6 1081.45 97.64H1111.32Z" />
        <path d="M1178.07 170.97H1171.68V133.48H1180.33C1185.07 153.05 1193.51 161.91 1207.52 161.91C1217.61 161.91 1223.59 157.38 1223.59 149.96C1223.59 142.54 1217 135.33 1201.75 127.09C1180.94 115.76 1172.5 105.46 1172.5 91.45C1172.5 73.12 1186.92 59.52 1206.08 59.52C1214.53 59.52 1223.59 62.2 1229.77 66.52L1233.48 61.58H1238.84V92.6901H1230.81C1224.42 77.0301 1218.24 70.65 1208.77 70.65C1201.15 70.65 1196.2 75.18 1196.2 81.98C1196.2 89.6 1202.59 95.99 1218.04 104.23C1240.29 116.18 1249.15 126.68 1249.15 141.52C1249.15 160.47 1234.32 173.04 1211.66 173.04C1199.92 173.04 1189.21 169.74 1182.61 163.77L1178.08 170.98L1178.07 170.97Z" />
        <path d="M1309.49 137.19C1309.49 159.03 1311.55 162.12 1327.41 162.73V170.97H1262.52V162.73C1277.97 161.91 1280.85 157.99 1280.85 138.63V113.29C1280.85 97.43 1280.23 86.72 1279.41 83.01C1277.97 76.21 1274.26 74.56 1261.69 74.56V67.56L1309.48 59.73V137.18L1309.49 137.19ZM1295.07 0C1304.13 0 1311.14 7.00001 1311.14 16.07C1311.14 25.14 1304.14 31.93 1295.07 31.93C1286 31.93 1279.21 24.93 1279.21 16.07C1279.21 7.21001 1286.21 0 1295.07 0Z" />
        <path d="M1411.46 152.64C1432.68 155.73 1445.86 169.74 1445.86 188.89C1445.86 212.17 1426.08 224.53 1389.01 224.53C1355.02 224.53 1335.45 214.02 1335.45 195.69C1335.45 181.48 1343.9 174.06 1355.02 174.06C1362.23 174.06 1369.44 177.15 1373.97 182.51C1366.76 183.95 1361.82 189.51 1361.82 196.31C1361.82 207.23 1371.91 213.41 1390.66 213.41C1411.05 213.41 1421.56 206.82 1421.56 193.84C1421.56 184.57 1415.17 177.15 1403.64 175.71L1367.59 170.77C1352.35 168.71 1344.72 161.71 1344.72 150.38C1344.72 139.05 1352.34 131.84 1365.73 129.16V128.34C1353.37 123.4 1344.51 109.8 1344.51 95.79C1344.51 75.19 1362.64 59.74 1386.74 59.74C1398.48 59.74 1410.43 63.65 1418.46 69.83C1431.03 62 1436.79 59.74 1443.59 59.74C1454.1 59.74 1461.1 64.89 1461.1 72.51C1461.1 78.28 1457.19 82.4 1451.42 82.4C1443.18 82.4 1442.56 73.54 1434.32 73.54C1431.64 73.54 1428.55 75.6 1426.08 79.1C1428.76 83.84 1429.79 88.99 1429.79 95.99C1429.79 116.59 1417.22 131.83 1386.12 135.33C1373.14 136.77 1368.61 138.63 1368.61 142.95C1368.61 146.25 1371.7 148.1 1377.88 148.72C1392.51 149.96 1399.72 150.78 1411.46 152.63V152.64ZM1401.78 97.02C1401.78 80.13 1396.63 70.45 1387.57 70.45C1378.51 70.45 1372.33 80.54 1372.33 96.61C1372.33 112.68 1378.51 123.6 1387.78 123.6C1397.05 123.6 1401.79 113.71 1401.79 97.03L1401.78 97.02Z" />
        <path d="M1525.99 137.39C1525.99 159.64 1527.43 161.7 1543.91 162.73V170.97H1479.02V162.73C1495.09 161.7 1497.35 159.43 1497.35 138.83V113.08C1497.35 97.01 1496.73 86.71 1495.91 83.21C1494.26 76 1490.76 74.56 1478.19 74.56V67.56L1517.95 59.73L1520.63 77.86H1521.45C1530.51 66.53 1543.29 59.73 1557.91 59.73C1575.42 59.73 1585.31 64.26 1593.75 75.39C1598.49 81.78 1602.61 90.84 1602.61 108.35V137.39C1602.61 159.64 1604.26 161.7 1620.12 162.73V170.97H1555.64V162.73C1571.91 161.91 1573.97 159.23 1573.97 138.83V110.81C1573.97 82.8 1568 73.11 1550.07 73.11C1541.21 73.11 1535.03 78.26 1530.5 87.12C1528.03 92.06 1525.97 100.51 1525.97 108.96V137.39H1525.99Z" />
      </g>
    </svg>
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
