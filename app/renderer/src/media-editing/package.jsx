// package.jsx
import { AlignCenter$1 as AlignCenterIcon, AlignLeft$1 as AlignLeftIcon, AlignRight$1 as AlignRightIcon, Ban$1 as BanIcon, Blocks$1 as BlocksIcon, Bookmark$1 as BookmarkIcon, BookOpen$1 as BookOpenIcon, Brain$1 as BrainIcon, Brush$1 as BrushIcon, Building2$1 as Building2Icon, Cable$1 as CableIcon, CalendarDays$1 as CalendarDaysIcon, Camera$1 as CameraIcon, CaseSensitive$1 as CaseSensitiveIcon, Check$1 as Check, Chrome$1 as ChromeIcon, Circle$1 as CircleIcon, CircleHelp$1 as CircleHelpIcon, CircleUserRound$1 as CircleUserRoundIcon, Clapperboard$1 as ClapperboardIcon, ClipboardPaste$1 as ClipboardPasteIcon, Clock$1 as ClockIcon, Clock3$1 as Clock3Icon, CloudOff$1 as CloudOffIcon, CompositedSvg, CornerDownRight$1 as CornerDownRightIcon, create$2 as create, createLucideIcon, createStore$1 as createStore, Download$1 as DownloadIcon, Droplet$1 as DropletIcon, Expand$1 as ExpandIcon, FileArchive$1 as FileArchiveIcon, FileAudio$1 as FileAudioIcon, FileClock$1 as FileClockIcon, FileCode$1 as FileCodeIcon, FileDiff$1 as FileDiffIcon, FileInput$1 as FileInputIcon, FileJson2$1 as FileJson2Icon, Files$1 as FilesIcon, FileText$1 as FileTextIcon, FileVideo$1 as FileVideoIcon, FileWarning$1 as FileWarningIcon, Flag$1 as FlagIcon, Folder$1 as FolderIcon, FolderKey$1 as FolderKeyIcon, FolderOpen$1 as FolderOpenIcon, HardDrive$1 as HardDriveIcon, History$1 as HistoryIcon, List$1 as ListIcon, LogOut$1 as LogOutIcon, Maximize2$1 as Maximize2Icon, Megaphone$1 as MegaphoneIcon, MessageSquare$1 as MessageSquareIcon, MessageSquarePlus$1 as MessageSquarePlusIcon, MessageSquareQuote$1 as MessageSquareQuoteIcon, Mic$1 as MicIcon, Minimize2$1 as Minimize2Icon, Moon$1 as MoonIcon, MousePointer2$1 as MousePointer2Icon, Paperclip$1 as PaperclipIcon, PencilLine$1 as PencilLineIcon, PenLine$1 as PenLineIcon, Plug$1 as PlugIcon, Puzzle$1 as PuzzleIcon, reactExports, ReceiptText$1 as ReceiptTextIcon, Replace$1 as ReplaceIcon, ReplaceAll$1 as ReplaceAllIcon, Settings$1 as SettingsIcon, Settings2$1 as Settings2Icon, ShoppingBag$1 as ShoppingBagIcon, SlidersHorizontal$1 as SlidersHorizontalIcon, Sparkles$1 as SparklesIcon, Sprout$1 as SproutIcon, Stamp$1 as StampIcon, Trash2$1 as Trash2Icon, Type$2 as TypeIcon, Upload$1 as UploadIcon, Users$1 as UsersIcon, useStore$2 as useStore, VolumeX$1 as VolumeXIcon, withArtworkOpacity, withIconCompositing } from "../vendor.js";
import { useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
export function hasMessagePayload(
  content2,
  attachments,
  entityRefs,
  canvasNodeAttachments,
  pluginNodeAttachments,
) {
  return (
    !!content2.trim() ||
    !!attachments?.length ||
    !!entityRefs?.length ||
    !!canvasNodeAttachments?.length ||
    !!pluginNodeAttachments?.length
  );
}
export function useDelayedFalse(flag, delayMs) {
  const [value, setValue] = reactExports.useState(flag);
  if (flag && !value) {
    setValue(true);
  }
  reactExports.useEffect(() => {
    if (flag) return;
    const timer2 = window.setTimeout(() => setValue(false), delayMs);
    return () => window.clearTimeout(timer2);
  }, [flag, delayMs]);
  return flag || value;
}
export const INACTIVE_NODE_UNMOUNT_GRACE_MS = 2e3;
export const CanvasActiveContext = reactExports.createContext(null);
export const CanvasActiveDeferredContext = reactExports.createContext(null);
export function useCanvasActive() {
  const isCanvasActive = reactExports.useContext(CanvasActiveContext);
  return isCanvasActive ?? true;
}
export const CanvasBridgeContext = reactExports.createContext({});
export function useCanvasBridge() {
  return reactExports.useContext(CanvasBridgeContext);
}
export const IsDraggingContext = reactExports.createContext(false);
export const IsMultiSelectContext = reactExports.createContext(false);
export const IsBoxSelectingContext = reactExports.createContext(false);
export function useCanvasIsDragging() {
  return reactExports.useContext(IsDraggingContext);
}
export function useCanvasIsMultiSelect() {
  return reactExports.useContext(IsMultiSelectContext);
}
export function useCanvasIsBoxSelecting() {
  return reactExports.useContext(IsBoxSelectingContext);
}
export function isDraggingSelector(state) {
  for (const [, node2] of state.nodeLookup) {
    if (node2.dragging) return true;
  }
  return false;
}
export function isMultiSelectSelector(state) {
  let count2 = 0;
  for (const node of state.nodes) {
    if (node.selected && ++count2 > 1) return true;
  }
  return false;
}
export function isBoxSelectingSelector(state) {
  return state.userSelectionActive;
}
export function useAssetMeta(key2) {
  return useAssetMetadataStore((state) => state.assets.get(key2));
}
export function createGeneratingStateStore() {
  return createStore((set2) => ({
    byNode: new Map(),
    mark: (nodeId, info2) =>
      set2((state2) => {
        const next2 = new Map(state2.byNode);
        next2.set(nodeId, info2);
        return {
          byNode: next2,
        };
      }),
    clear: (nodeId) =>
      set2((state2) => {
        if (!state2.byNode.has(nodeId)) return state2;
        const next2 = new Map(state2.byNode);
        next2.delete(nodeId);
        return {
          byNode: next2,
        };
      }),
  }));
}
const defaultGeneratingStateStore = createGeneratingStateStore();
export const GeneratingStateStoreContext = reactExports.createContext(null);
export function useGeneratingStateApi() {
  return (
    reactExports.useContext(GeneratingStateStoreContext) ??
    defaultGeneratingStateStore
  );
}
export const useGeneratingStateStore = (selector2) =>
  useStore(useGeneratingStateApi(), selector2);
useGeneratingStateStore.getState = defaultGeneratingStateStore.getState;
useGeneratingStateStore.setState = defaultGeneratingStateStore.setState;
useGeneratingStateStore.subscribe = defaultGeneratingStateStore.subscribe;
export function useGenerating(nodeId) {
  return useGeneratingStateStore((state) => state.byNode.get(nodeId));
}
export const useMediaPlayback = create((set2) => ({
  playingId: null,
  play: (mediaId) =>
    set2({
      playingId: mediaId,
    }),
  stop: () =>
    set2({
      playingId: null,
    }),
}));
export function formatTime(seconds, roundUp = false) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = roundUp ? Math.ceil(seconds) : Math.floor(seconds);
  const minuteCount = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minuteCount}:${remainingSeconds.toString().padStart(2, "0")}`;
}
const File = createLucideIcon("File", [
  [
    "path",
    {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
      key: "1rqfz7",
    },
  ],
  [
    "path",
    {
      d: "M14 2v4a2 2 0 0 0 2 2h4",
      key: "tnqrlb",
    },
  ],
]);
const PackageIcon = createLucideIcon("Package", [
  [
    "path",
    {
      d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
      key: "1a0edw",
    },
  ],
  [
    "path",
    {
      d: "M12 22V12",
      key: "d0xqtd",
    },
  ],
  [
    "path",
    {
      d: "m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",
      key: "yx3hmr",
    },
  ],
  [
    "path",
    {
      d: "m7.5 4.27 9 5.15",
      key: "1c824w",
    },
  ],
]);
const SquareIcon = createLucideIcon("Square", [
  [
    "rect",
    {
      width: "18",
      height: "18",
      x: "3",
      y: "3",
      rx: "2",
      key: "afitv7",
    },
  ],
]);
const picture = [
  [
    "path",
    {
      d: "M4.293 18.291L8.882 13.702a2 2 0 0 1 2.728-.094L18.57 19.664",
      key: "mountain",
    },
  ],
  [
    "circle",
    {
      cx: "15.666",
      cy: "9.346",
      r: "1.556",
      fill: "currentColor",
      stroke: "none",
      key: "sun",
    },
  ],
];
const frame = [
  [
    "rect",
    {
      x: "4",
      y: "4",
      width: "16",
      height: "16",
      rx: "3",
      key: "frame",
    },
  ],
];
export const ImageOutlineIcon = withIconCompositing(
  createLucideIcon("ImageOutline", [...frame, ...picture]),
);
export const ImageOffOutlineIcon = withIconCompositing(
  createLucideIcon("ImageOffOutline", [
    ...frame,
    ...picture,
    [
      "path",
      {
        d: "M2 2L22 22",
        key: "unavailable",
      },
    ],
  ]),
);
export const ImagePlusOutlineIcon = withIconCompositing(
  createLucideIcon("ImagePlusOutline", [
    [
      "path",
      {
        d: "M12.5 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5.5",
        key: "frame",
      },
    ],
    ...picture,
    [
      "path",
      {
        d: "M16 5h6M19 2v6",
        key: "add",
      },
    ],
  ]),
);
export const AlignCenter = withIconCompositing(AlignCenterIcon);
export const AlignLeft = withIconCompositing(AlignLeftIcon);
export const AlignRight = withIconCompositing(AlignRightIcon);
export const Ban = withIconCompositing(BanIcon);
export const Blocks = withIconCompositing(BlocksIcon);
export const BookOpen = withIconCompositing(BookOpenIcon);
export const Bookmark = withIconCompositing(BookmarkIcon);
export const Brain = withIconCompositing(BrainIcon);
export const Brush = withIconCompositing(BrushIcon);
export const Building2 = withIconCompositing(Building2Icon);
export const Cable = withIconCompositing(CableIcon);
export const CalendarDays = withIconCompositing(CalendarDaysIcon);
export const Camera = withIconCompositing(CameraIcon);
export const CaseSensitive = withIconCompositing(CaseSensitiveIcon);
export const CheckIcon = withIconCompositing(Check);
export const Chrome = withIconCompositing(ChromeIcon);
export const Circle = withIconCompositing(CircleIcon);
export const CircleHelp = withIconCompositing(CircleHelpIcon);
export const CircleUserRound = withIconCompositing(CircleUserRoundIcon);
export const Clapperboard = withIconCompositing(ClapperboardIcon);
export const ClipboardPaste = withIconCompositing(ClipboardPasteIcon);
export const Clock = withIconCompositing(ClockIcon);
export const Clock3 = withIconCompositing(Clock3Icon);
export const CloudOff = withIconCompositing(CloudOffIcon);
export const CornerDownRight = withIconCompositing(CornerDownRightIcon);
export const Download = withIconCompositing(DownloadIcon);
export const Droplet = withIconCompositing(DropletIcon);
export const Expand = withIconCompositing(ExpandIcon);
export const File$1 = withIconCompositing(File);
export const FileArchive = withIconCompositing(FileArchiveIcon);
export const FileAudio = withIconCompositing(FileAudioIcon);
export const FileClock = withIconCompositing(FileClockIcon);
export const FileCode = withIconCompositing(FileCodeIcon);
export const FileDiff = withIconCompositing(FileDiffIcon);
export const FileInput = withIconCompositing(FileInputIcon);
export const FileJson2 = withIconCompositing(FileJson2Icon);
export const FileText = withIconCompositing(FileTextIcon);
export const FileVideo = withIconCompositing(FileVideoIcon);
export const FileWarning = withIconCompositing(FileWarningIcon);
export const Files = withIconCompositing(FilesIcon);
export const Flag = withIconCompositing(FlagIcon);
export const Folder = withIconCompositing(FolderIcon);
export const FolderKey = withIconCompositing(FolderKeyIcon);
export const FolderOpen = withIconCompositing(FolderOpenIcon);
export const HardDrive = withIconCompositing(HardDriveIcon);
export const History = withIconCompositing(HistoryIcon);
export const List = withIconCompositing(ListIcon);
export const LogOut = withIconCompositing(LogOutIcon);
export const Maximize2 = withIconCompositing(Maximize2Icon);
export const Megaphone = withIconCompositing(MegaphoneIcon);
export const MessageSquare = withIconCompositing(MessageSquareIcon);
export const MessageSquarePlus = withIconCompositing(MessageSquarePlusIcon);
export const MessageSquareQuote = withIconCompositing(MessageSquareQuoteIcon);
export const Mic = withIconCompositing(MicIcon);
export const Minimize2 = withIconCompositing(Minimize2Icon);
export const Moon = withIconCompositing(MoonIcon);
export const MousePointer2 = withIconCompositing(MousePointer2Icon);
export const Package = withIconCompositing(PackageIcon);
export const Paperclip = withIconCompositing(PaperclipIcon);
export const PenLine = withIconCompositing(PenLineIcon);
export const PencilLine = withIconCompositing(PencilLineIcon);
export const Plug = withIconCompositing(PlugIcon);
export const Puzzle = withIconCompositing(PuzzleIcon);
export const ReceiptText = withIconCompositing(ReceiptTextIcon);
export const Replace = withIconCompositing(ReplaceIcon);
export const ReplaceAll = withIconCompositing(ReplaceAllIcon);
export const Settings = withIconCompositing(SettingsIcon);
export const Settings2 = withIconCompositing(Settings2Icon);
export const ShoppingBag = withIconCompositing(ShoppingBagIcon);
export const SlidersHorizontal = withIconCompositing(SlidersHorizontalIcon);
export const Sparkles = withIconCompositing(SparklesIcon);
export const Sprout = withIconCompositing(SproutIcon);
export const Square = withIconCompositing(SquareIcon);
export const Stamp = withIconCompositing(StampIcon);
export const Trash2 = withIconCompositing(Trash2Icon);
export const Type = withIconCompositing(TypeIcon);
export const Upload = withIconCompositing(UploadIcon);
export const Users = withIconCompositing(UsersIcon);
export const VolumeX = withIconCompositing(VolumeXIcon);
export function RotateIcon({ size: size2 = 20, ...props }) {
  return (
    <CompositedSvg
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.60059 14.6699H7.39941V12.0029H8.60059V14.6699ZM6.84082 5.00977L5.62402 7.3877L4.55469 6.83984L4.84668 6.26758C4.35115 6.38 3.90104 6.51695 3.50879 6.67383C2.94768 6.89829 2.53339 7.15095 2.26953 7.40039C2.00692 7.64874 1.93359 7.85288 1.93359 8.00293C1.93359 8.15298 2.00692 8.35712 2.26953 8.60547C2.53339 8.85491 2.94768 9.10757 3.50879 9.33203C4.6282 9.77972 6.21604 10.0693 8 10.0693C9.78395 10.0693 11.3718 9.77971 12.4912 9.33203C13.0523 9.10757 13.4666 8.85491 13.7305 8.60547C13.9931 8.35712 14.0664 8.15298 14.0664 8.00293C14.0664 7.85288 13.9931 7.64874 13.7305 7.40039C13.4666 7.15095 13.0523 6.89829 12.4912 6.67383C11.6598 6.34133 10.5696 6.09645 9.33301 5.99219V4.78809C10.7076 4.89567 11.9529 5.16714 12.9365 5.56055C13.5816 5.81857 14.1448 6.14078 14.5557 6.5293C14.9675 6.91895 15.2666 7.41683 15.2666 8.00293C15.2666 8.58903 14.9675 9.08691 14.5557 9.47656C14.1448 9.86508 13.5816 10.1873 12.9365 10.4453C11.6431 10.9626 9.89764 11.2695 8 11.2695C6.10236 11.2695 4.35689 10.9626 3.06348 10.4453C2.41843 10.1873 1.85516 9.86508 1.44434 9.47656C1.03249 9.08691 0.733399 8.58903 0.733398 8.00293C0.733398 7.41683 1.03249 6.91895 1.44434 6.5293C1.85516 6.14078 2.41843 5.81857 3.06348 5.56055C3.56192 5.36119 4.12758 5.19377 4.74316 5.0625L4.1582 4.67578L4.81934 3.67383L6.84082 5.00977ZM8.60059 9.33594H7.39941V1.33594H8.60059V9.33594Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function Rotate90Icon(props) {
  return (
    <CompositedSvg
      {...props}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={withArtworkOpacity(props.style, 0.9)}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M10.057 8.385a2.75 2.75 0 0 1 3.888 0l4.243 4.242a2.75 2.75 0 0 1 0 3.888l-4.243 4.244a2.75 2.75 0 0 1-3.889 0l-4.243-4.244a2.75 2.75 0 0 1 0-3.888zm2.828 1.06a1.25 1.25 0 0 0-1.768 0l-4.243 4.242a1.25 1.25 0 0 0 0 1.768l4.243 4.243a1.25 1.25 0 0 0 1.768 0l4.243-4.243a1.25 1.25 0 0 0 0-1.768zM7.226 3.212a6.75 6.75 0 0 1 9.547 0l2.477 2.476V4.5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.19l-2.478-2.477a5.25 5.25 0 0 0-7.424 0L5.03 7.53a.75.75 0 1 1-1.06-1.06z"
      />
    </CompositedSvg>
  );
}
export function FlipHorizontalIcon(props) {
  return (
    <CompositedSvg
      {...props}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={withArtworkOpacity(props.style, 0.9)}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2.25a.75.75 0 0 1 .75.75v18a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75M2.25 8.414c0-1.559 1.885-2.34 2.987-1.237l3.586 3.586a1.75 1.75 0 0 1 0 2.474l-3.586 3.586c-1.102 1.102-2.987.322-2.987-1.237zm16.513-1.237c1.102-1.103 2.987-.322 2.987 1.237v7.172c0 1.559-1.885 2.34-2.987 1.237l-3.586-3.586a1.75 1.75 0 0 1 0-2.474zM4.177 8.237a.25.25 0 0 0-.427.177v7.172c0 .223.27.334.427.177l3.586-3.586a.25.25 0 0 0 0-.354zm16.073.177a.25.25 0 0 0-.427-.177l-3.586 3.586a.25.25 0 0 0 0 .354l3.586 3.586a.25.25 0 0 0 .427-.177z"
      />
    </CompositedSvg>
  );
}
export function FlipVerticalIcon(props) {
  return (
    <CompositedSvg
      {...props}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={withArtworkOpacity(props.style, 0.9)}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M21.75 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h18a.75.75 0 0 1 .75.75m-6.164-9.75c1.559 0 2.34 1.885 1.237 2.987l-3.586 3.586a1.75 1.75 0 0 1-2.474 0L7.177 5.237C6.074 4.135 6.855 2.25 8.414 2.25zm1.237 16.513c1.102 1.102.322 2.987-1.237 2.987H8.414c-1.559 0-2.34-1.885-1.237-2.987l3.586-3.586a1.75 1.75 0 0 1 2.474 0zm-1.06-14.586a.25.25 0 0 0-.177-.427H8.414a.25.25 0 0 0-.177.427l3.586 3.586a.25.25 0 0 0 .354 0zm-.177 16.073a.25.25 0 0 0 .177-.427l-3.586-3.586a.25.25 0 0 0-.354 0l-3.586 3.586a.25.25 0 0 0 .177.427z"
      />
    </CompositedSvg>
  );
}
export const MEDIA_NODE_RADIUS = 10;
