// shortcut-categories.jsx
import { resolveShortcutDisplay } from "./other-modifiers.js";
import {
  isMacPlatform,
  KbdGroup,
  SHORTCUT_DEFS,
  ShortcutKeycap,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./shortcut-hint.jsx";
import {
  reactDomExports,
  reactExports,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
function fromDef(def) {
  return {
    labelKey: def.labelKey,
    mac: resolveShortcutDisplay(def.mac, "darwin").tokens.map(
      (token2) => token2.label,
    ),
    win: resolveShortcutDisplay(def.other, "win32").tokens.map(
      (token2) => token2.label,
    ),
  };
}
const SHORTCUT_CATEGORIES = [
  {
    id: "global",
    labelKey: "shortcuts.category.global",
    items: [
      fromDef(SHORTCUT_DEFS.newChat),
      // 新建对话 ⌘N
      fromDef(SHORTCUT_DEFS.newWorkspace),
      // 新建窗口 ⌘⇧N
      fromDef(SHORTCUT_DEFS.closeTab),
      // 关闭标签页 ⌘W
      fromDef(SHORTCUT_DEFS.openSettings),
      // 打开设置 ⌘,
      fromDef(SHORTCUT_DEFS.screenshot),
      // 截图 ⌃⇧S（mac 也是 ⌃ 而非 ⌘）
      {
        labelKey: "shortcuts.action.globalSearch",
        mac: ["⌘", "K"],
        win: ["Ctrl", "K"],
      },
    ],
  },
  {
    id: "canvas",
    labelKey: "shortcuts.category.canvas",
    items: [
      // 历史
      {
        labelKey: "shortcuts.action.undo",
        mac: ["⌘", "Z"],
        win: ["Ctrl", "Z"],
      },
      {
        labelKey: "shortcuts.action.redo",
        mac: ["⌘", "⇧", "Z"],
        win: ["Ctrl", "Shift", "Z"],
      },
      // 剪贴板
      {
        labelKey: "shortcuts.action.cut",
        mac: ["⌘", "X"],
        win: ["Ctrl", "X"],
      },
      {
        labelKey: "shortcuts.action.copy",
        mac: ["⌘", "C"],
        win: ["Ctrl", "C"],
      },
      {
        labelKey: "shortcuts.action.paste",
        mac: ["⌘", "V"],
        win: ["Ctrl", "V"],
      },
      // 分组
      {
        labelKey: "shortcuts.action.group",
        mac: ["⌘", "G"],
        win: ["Ctrl", "G"],
      },
      {
        labelKey: "shortcuts.action.ungroup",
        mac: ["⌘", "⇧", "G"],
        win: ["Ctrl", "Shift", "G"],
      },
      // 选择 / 删除
      {
        labelKey: "shortcuts.action.deleteNode",
        mac: ["Delete"],
        win: ["Delete"],
      },
      {
        labelKey: "shortcuts.action.multiSelect",
        mac: ["⇧"],
        win: ["Shift"],
      },
      // 视图
      {
        labelKey: "shortcuts.action.panCanvas",
        mac: ["Space"],
        win: ["Space"],
      },
      {
        labelKey: "shortcuts.action.zoomIn",
        mac: ["⌘", "+"],
        win: ["Ctrl", "+"],
      },
      {
        labelKey: "shortcuts.action.zoomOut",
        mac: ["⌘", "-"],
        win: ["Ctrl", "-"],
      },
      {
        labelKey: "shortcuts.action.fitView",
        mac: ["⇧", "1"],
        win: ["Shift", "1"],
      },
      {
        labelKey: "shortcuts.action.focusSelection",
        mac: ["⇧", "2"],
        win: ["Shift", "2"],
      },
      // 生成
      {
        labelKey: "shortcuts.action.submitGenerate",
        mac: ["⌘", "Enter"],
        win: ["Ctrl", "Enter"],
      },
    ],
  },
  {
    id: "file",
    labelKey: "shortcuts.category.file",
    items: [
      {
        labelKey: "shortcuts.action.treeView",
        mac: ["⌘", "1"],
        win: ["Ctrl", "1"],
      },
      {
        labelKey: "shortcuts.action.gridView",
        mac: ["⌘", "2"],
        win: ["Ctrl", "2"],
      },
      {
        labelKey: "shortcuts.action.focusSearch",
        mac: ["⌘", "F"],
        win: ["Ctrl", "F"],
      },
      {
        labelKey: "shortcuts.action.duplicate",
        mac: ["⌘", "D"],
        win: ["Ctrl", "D"],
      },
      {
        labelKey: "shortcuts.action.rename",
        mac: ["Enter"],
        win: ["Enter"],
      },
      {
        labelKey: "shortcuts.action.addToCanvas",
        mac: ["⌘", "⇧", "A"],
        win: ["Ctrl", "Shift", "A"],
      },
    ],
  },
];
const ITEMS_PER_COLUMN = 5;
function chunkIntoColumns(items, perColumn) {
  const columns = [];
  for (let i2 = 0; i2 < items.length; i2 += perColumn) {
    columns.push(items.slice(i2, i2 + perColumn));
  }
  return columns;
}
function ShortcutRow({ item, isMac: isMac2 }) {
  const { t: t2 } = useTranslation();
  const keys2 = isMac2 ? item.mac : item.win;
  return (
    <div className="group flex cursor-default items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <span className="truncate text-xs">{t2(item.labelKey)}</span>
      <KbdGroup>
        {keys2.map((key2) => (
          // 同一条快捷键内键位互不重复，label+key 组合即唯一
          <ShortcutKeycap key={`${item.labelKey}-${key2}`} token={key2} />
        ))}
      </KbdGroup>
    </div>
  );
}
export function ShortcutsPanel({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const isMac2 = isMacPlatform();
  const [activeTab, setActiveTab] = reactExports.useState(
    SHORTCUT_CATEGORIES[0]?.id ?? "global",
  );
  const [mounted, setMounted] = reactExports.useState(false);
  reactExports.useEffect(() => setMounted(true), []);
  reactExports.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e2) => {
      if (e2.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);
  if (!mounted) return null;
  return reactDomExports.createPortal(
    // 外层常驻挂载以保留滑动动画；关闭时 pointer-events-none + 下移隐藏，
    // 完全不拦截底层画布的鼠标 / 键盘事件（非模态）。面板固定在画布底部
    // 工具栏上方，宽度和高度都受视口约束，不再覆盖整条底边。
    <div
      className={cn(
        "elevated-surface-border fixed bottom-16 left-1/2 z-30 flex h-[min(320px,calc(100vh-96px))] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg transition-transform duration-200 ease-out",
        open
          ? "translate-y-0"
          : "pointer-events-none translate-y-[calc(100%+80px)]",
      )}
      data-action-ui-id="shortcuts.panel"
      data-open={open ? "" : void 0}
      aria-hidden={!open}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v2) => setActiveTab(v2)}
        className="h-full gap-0"
      >
        <div className="relative flex h-8 shrink-0 justify-center border-b border-border [border-bottom-width:var(--divider-width)]">
          <TabsList className="h-full gap-6! rounded-lg! bg-transparent! p-0!">
            {SHORTCUT_CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="h-full rounded-none! border-b border-transparent bg-transparent! px-1 py-0 text-xs text-muted-foreground shadow-none! transition-colors hover:text-foreground data-active:border-foreground data-active:font-medium data-active:text-foreground [border-bottom-width:var(--divider-width)]"
                data-action-ui-id={`shortcuts.panel.tab.${cat.id}`}
              >
                {t2(cat.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label={t2("common.close")}
            data-action-ui-id="shortcuts.panel.close"
            className="absolute inset-y-0 right-3 my-auto"
          >
            <X />
          </Button>
        </div>
        {SHORTCUT_CATEGORIES.map((cat) => (
          <TabsContent
            key={cat.id}
            value={cat.id}
            className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 py-3"
          >
            <div className="flex h-full justify-center divide-x-[var(--divider-width)] divide-border">
              {chunkIntoColumns(cat.items, ITEMS_PER_COLUMN).map((column) => (
                <div
                  key={column.map((i2) => i2.labelKey).join("|")}
                  className="w-52 shrink-0 px-3"
                >
                  {column.map((item) => (
                    <ShortcutRow
                      key={item.labelKey}
                      item={item}
                      isMac={isMac2}
                    />
                  ))}
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>,
    document.body,
  );
}
