// comfy-ui-submenu.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useCanvasBridge,
  useReactFlow,
  reactExports,
  reactDomExports,
  CompositedSvg,
  CanvasNodeType,
  TEXT_CARD_DEFAULT_SIZE,
  TABLE_CARD_DEFAULT_SIZE,
  useStore$3,
  ChevronRight$1,
  Workflow,
  Position,
  getBezierPath,
  ImageOutlineIcon,
  PlusCircle,
} from "../vendor.js";
import {
  CLIP_STUDIO_PLUGIN_ID,
  PANORAMA_VIEWER_PLUGIN_ID,
  formatPluginAddNodeType,
  DIRECTOR_STAGE_PLUGIN_ID,
  COMFYUI_PLUGIN_ID$1,
} from "../m02/canvas-image.jsx";
import { emptyMediaNodeInit } from "../m03/base-backend.jsx";
import { newTablePath, createEmptyDocument } from "../m01/prune-persisted-node-data.js";
import { serializeTableDocument } from "../m01/table-document-to-llm-content.js";
import { useClampedMenuPosition } from "../m05/table-context-menu.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { QuickZoomPresence, useDismissMenu } from "./canvas-toggle-icon.jsx";
import { CONNECT_NODE_MENU_WIDTH_PX } from "./empty-viewport-toast.jsx";
export function useCanvasAddNode({
  saveTableContent,
  addNode: addNode2,
  getPosition,
  getLastUsedModelParams,
}) {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    async (type2, positionOverride, dataOverride) => {
      const position2 = positionOverride ?? getPosition();
      switch (type2) {
        case CanvasNodeType.Text: {
          const nodeId = crypto.randomUUID();
          addNode2({
            type: CanvasNodeType.Text,
            id: nodeId,
            data: dataOverride,
            position: position2,
            size: TEXT_CARD_DEFAULT_SIZE,
            isEmpty: true,
          });
          return nodeId;
        }
        case CanvasNodeType.Image:
        case CanvasNodeType.Video:
        case CanvasNodeType.Audio: {
          const nodeId = crypto.randomUUID();
          const { size: size2, aspectRatio } = emptyMediaNodeInit(
            type2,
            getLastUsedModelParams,
            dataOverride?.aspectRatio,
          );
          const data2 = aspectRatio
            ? {
                ...(dataOverride ?? {}),
                aspectRatio,
              }
            : dataOverride;
          addNode2({
            type: type2,
            id: nodeId,
            position: position2,
            data: data2,
            size: size2,
            isEmpty: true,
          });
          return nodeId;
        }
        case CanvasNodeType.Table: {
          if (!saveTableContent) {
            console.warn("[canvas] saveTableContent bridge not provided");
            return null;
          }
          const tablePath = newTablePath();
          const emptyDoc = createEmptyDocument(t2("canvas.table.defaultColumn", "Text"));
          const tableNodeId = crypto.randomUUID();
          try {
            await saveTableContent(tablePath, serializeTableDocument(emptyDoc));
            addNode2({
              type: CanvasNodeType.Table,
              id: tableNodeId,
              data: {
                tablePath,
              },
              position: position2,
              size: TABLE_CARD_DEFAULT_SIZE,
            });
            return tableNodeId;
          } catch (err) {
            console.error("[canvas] Failed to create table node:", err);
            return null;
          }
        }
        default:
          return null;
      }
    },
    [saveTableContent, addNode2, getPosition, getLastUsedModelParams, t2],
  );
}
function DirectorStageMenuIcon() {
  return (
    <CompositedSvg
      width={20}
      height={20}
      viewBox="-2 -2 28 28"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.3367 5.11697L20.3351 5.11422C20.009 4.63346 19.5414 4.23406 18.9789 3.95573L13.8627 1.42942C13.2962 1.15046 12.6541 1.00364 12.0004 1.00364C11.3467 1.00364 10.7046 1.15046 10.1381 1.42942L5.02195 3.95504C4.46499 4.22957 4.01075 4.62076 3.68974 5.07853L3.67931 5.09432L3.6761 5.09844C3.33833 5.58788 3.15988 6.1457 3.15926 6.71401V12.766C3.15926 13.9004 3.87352 14.9573 5.02115 15.5249L10.1381 18.3083C10.7042 18.5878 11.3463 18.7349 12 18.7349C12.6537 18.7349 13.2958 18.5878 13.8619 18.3083L18.9789 15.5249C19.5446 15.2448 20.0143 14.8425 20.3411 14.3583C20.6679 13.8741 20.8402 13.325 20.8407 12.766V6.71401C20.8407 6.14438 20.661 5.59464 20.3367 5.11697ZM11.0787 2.82263C11.359 2.68447 11.6769 2.61174 12.0004 2.61174C12.3239 2.61174 12.6418 2.68447 12.9221 2.82263L18.0102 5.33453L12.012 8.29253L6.01549 5.32218L11.0787 2.82263ZM5.96252 14.131C5.68229 13.9925 5.44957 13.7934 5.28773 13.5537C5.12588 13.314 5.04059 13.0421 5.04041 12.7653V6.71401L5.04121 6.69823L11.0602 9.67957V16.9054L5.96252 14.131ZM18.0383 14.131L12.9406 16.9054V9.69123L18.9596 6.72362V12.766C18.9596 13.3274 18.6065 13.8503 18.0383 14.131Z" />
      <path d="M1.23495 15.2031C1.68032 14.8347 2.37107 14.8697 2.77665 15.2813C3.18168 15.6927 3.14963 16.3252 2.7047 16.6935C2.36773 16.9723 2.29553 17.1813 2.28939 17.3056C2.28388 17.4229 2.32797 17.6165 2.58451 17.8951C2.84704 18.18 3.28618 18.4994 3.92542 18.8198C4.97798 19.3474 6.4454 19.8094 8.1932 20.1328L8.23433 19.3007C8.25061 18.9714 8.65505 18.8036 8.9203 19.0179L11.6534 21.2542C11.7274 21.3148 11.7866 21.3918 11.8247 21.4777C11.8628 21.5636 11.88 21.6571 11.8742 21.7501C11.8683 21.8429 11.8392 21.9334 11.7908 22.0138C11.7423 22.0942 11.675 22.1633 11.5942 22.2143L8.66138 24.061C8.5972 24.1012 8.52261 24.1237 8.44593 24.1257C8.36909 24.1277 8.29235 24.1096 8.22561 24.0728C8.15895 24.0358 8.10388 23.9811 8.06695 23.9163C8.03024 23.8516 8.01296 23.778 8.01662 23.7045L8.09338 22.1518C6.05823 21.7997 4.25524 21.2572 2.89154 20.5736C2.10759 20.1807 1.41986 19.717 0.923258 19.1779C0.421565 18.6331 0.0728828 17.9598 0.110236 17.1978C0.150646 16.3804 0.621559 15.7107 1.23495 15.2031Z" />
      <path d="M21.347 15.8035C21.7617 15.4011 22.453 15.3816 22.89 15.76C23.4918 16.2812 23.9477 16.9613 23.9698 17.7794C24.0054 19.1209 22.8905 20.1309 21.6695 20.8074C20.3843 21.5193 18.6268 22.0732 16.6339 22.43C16.0425 22.5359 15.4716 22.1825 15.3584 21.6409C15.2455 21.099 15.6335 20.5738 16.2251 20.4677C18.0675 20.1378 19.5558 19.6458 20.547 19.0968C21.6004 18.5132 21.7936 18.0461 21.7887 17.8382C21.7853 17.7138 21.7178 17.5033 21.3872 17.217C20.9507 16.8388 20.9329 16.2058 21.347 15.8035Z" />
    </CompositedSvg>
  );
}
function VideoEditingMenuIcon() {
  return (
    <CompositedSvg
      width={20}
      height={20}
      viewBox="-2 -2 28 28"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 2C0 1.46957 0.210714 0.960859 0.585786 0.585786C0.960859 0.210714 1.46957 0 2 0L20 0C20.5304 0 21.0391 0.210714 21.4142 0.585786C21.7893 0.960859 22 1.46957 22 2V7.942C22 8.20722 21.8946 8.46157 21.7071 8.64911C21.5196 8.83664 21.2652 8.942 21 8.942C20.7348 8.942 20.4804 8.83664 20.2929 8.64911C20.1054 8.46157 20 8.20722 20 7.942V5.27C20 5.21696 19.9789 5.16609 19.9414 5.12858C19.9039 5.09107 19.853 5.07 19.8 5.07H12.2C12.147 5.07 12.0961 5.09107 12.0586 5.12858C12.0211 5.16609 12 5.21696 12 5.27V15.147C12 15.4122 11.8946 15.6666 11.7071 15.8541C11.5196 16.0416 11.2652 16.147 11 16.147H9.814L9.8 16.146H7.2C7.14696 16.146 7.09609 16.1671 7.05858 16.2046C7.02107 16.2421 7 16.293 7 16.346V17.689C7 17.799 7.09 17.889 7.2 17.889H7.74C7.96769 17.889 8.18605 17.9795 8.34705 18.1404C8.50805 18.3014 8.5985 18.5198 8.5985 18.7475C8.5985 18.9752 8.50805 19.1936 8.34705 19.3546C8.18605 19.5156 7.96769 19.606 7.74 19.606H2C1.46957 19.606 0.960859 19.3953 0.585786 19.0202C0.210714 18.6451 0 18.1364 0 17.606V2ZM2.2 1.718C2.14696 1.718 2.09609 1.73907 2.05858 1.77658C2.02107 1.81409 2 1.86496 2 1.918V3.26C2 3.37 2.09 3.46 2.2 3.46H4.8C4.85304 3.46 4.90391 3.43893 4.94142 3.40142C4.97893 3.36391 5 3.31304 5 3.26V1.918C5 1.86496 4.97893 1.81409 4.94142 1.77658C4.90391 1.73907 4.85304 1.718 4.8 1.718H2.2ZM2.2 16.146C2.14696 16.146 2.09609 16.1671 2.05858 16.2046C2.02107 16.2421 2 16.293 2 16.346V17.689C2 17.799 2.09 17.889 2.2 17.889H4.8C4.85304 17.889 4.90391 17.8679 4.94142 17.8304C4.97893 17.7929 5 17.742 5 17.689V16.346C5 16.293 4.97893 16.2421 4.94142 16.2046C4.90391 16.1671 4.85304 16.146 4.8 16.146H2.2ZM2 5.27C2 5.16 2.09 5.07 2.2 5.07H9.8C9.85304 5.07 9.90391 5.09107 9.94142 5.12858C9.97893 5.16609 10 5.21696 10 5.27V14.337C10 14.39 9.97893 14.4409 9.94142 14.4784C9.90391 14.5159 9.85304 14.537 9.8 14.537H2.2C2.14696 14.537 2.09609 14.5159 2.05858 14.4784C2.02107 14.4409 2 14.39 2 14.337V5.27ZM12 1.918C12 1.808 12.09 1.718 12.2 1.718H14.8C14.91 1.718 15 1.808 15 1.918V3.26C15 3.31304 14.9789 3.36391 14.9414 3.40142C14.9039 3.43893 14.853 3.46 14.8 3.46H12.2C12.147 3.46 12.0961 3.43893 12.0586 3.40142C12.0211 3.36391 12 3.31304 12 3.26V1.918ZM17 1.918C17.0001 1.88107 17.0104 1.84489 17.0299 1.81347C17.0493 1.78205 17.077 1.75662 17.11 1.74C17.1379 1.72572 17.1687 1.71819 17.2 1.718H19.8C19.853 1.718 19.9039 1.73907 19.9414 1.77658C19.9789 1.81409 20 1.86496 20 1.918V3.26C20 3.31304 19.9789 3.36391 19.9414 3.40142C19.9039 3.43893 19.853 3.46 19.8 3.46H17.2C17.147 3.46 17.0961 3.43893 17.0586 3.40142C17.0211 3.36391 17 3.31304 17 3.26V1.918ZM7 1.918C7 1.808 7.09 1.718 7.2 1.718H9.8C9.85304 1.718 9.90391 1.73907 9.94142 1.77658C9.97893 1.81409 10 1.86496 10 1.918V3.26C10 3.31304 9.97893 3.36391 9.94142 3.40142C9.90391 3.43893 9.85304 3.46 9.8 3.46H7.2C7.14696 3.46 7.09609 3.43893 7.05858 3.40142C7.02107 3.36391 7 3.31304 7 3.26V1.918Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.57 11.397C19.1326 10.8346 19.8955 10.5186 20.691 10.5186C21.4865 10.5186 22.2494 10.8346 22.812 11.397L23.122 11.707C23.6844 12.2696 24.0003 13.0325 24.0003 13.828C24.0003 14.6235 23.6844 15.3864 23.122 15.949L15.993 23.077C15.6705 23.3994 15.2474 23.602 14.794 23.651L11.626 23.994C11.4774 24.01 11.3271 23.9924 11.1862 23.9427C11.0453 23.8929 10.9174 23.8122 10.8117 23.7065C10.7061 23.6008 10.6255 23.4728 10.5759 23.3318C10.5263 23.1908 10.5089 23.0406 10.525 22.892L10.867 19.724C10.9163 19.2705 11.1192 18.8474 11.442 18.525L18.57 11.397ZM21.398 12.812L21.708 13.121C21.8955 13.3085 22.0008 13.5628 22.0008 13.828C22.0008 14.0932 21.8955 14.3475 21.708 14.535L14.579 21.663L12.647 21.872L12.856 19.939L19.984 12.812C20.1715 12.6245 20.4258 12.5192 20.691 12.5192C20.9561 12.5192 21.2105 12.6245 21.398 12.812Z"
      />
    </CompositedSvg>
  );
}
const ALLOWED_TARGET_TYPES = {
  // Drag-release creates a connected target; prefill lives in useConnectToAddNode.
  [CanvasNodeType.Text]: [
    CanvasNodeType.Text,
    CanvasNodeType.Audio,
    CanvasNodeType.Video,
    CanvasNodeType.Image,
  ],
  [CanvasNodeType.Table]: [],
  [CanvasNodeType.Image]: [CanvasNodeType.Image, CanvasNodeType.Video, CanvasNodeType.Text],
  [CanvasNodeType.Video]: [CanvasNodeType.Video, CanvasNodeType.Text],
  [CanvasNodeType.Audio]: [CanvasNodeType.Text, CanvasNodeType.Video, CanvasNodeType.Audio],
};
function completeAddNodeMenuBadge(onComplete, target) {
  try {
    onComplete?.(target);
  } catch {}
}
const MENU_WIDTH_PX = CONNECT_NODE_MENU_WIDTH_PX;
const MENU_ITEM_HEIGHT_PX = 48;
const MENU_HEADER_HEIGHT_PX = 32;
const MENU_CHROME_HEIGHT_PX = 18;
const MENU_ROW_GAP_PX = 0;
const MENU_MAX_ROW_COUNT = 8;
const SUBMENU_WIDTH_PX = MENU_WIDTH_PX;
const MENU_ESTIMATED_HEIGHT_PX =
  MENU_CHROME_HEIGHT_PX +
  MENU_HEADER_HEIGHT_PX +
  MENU_MAX_ROW_COUNT * (MENU_ITEM_HEIGHT_PX + MENU_ROW_GAP_PX);
function oppositeHandlePosition(p3) {
  switch (p3) {
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    case Position.Top:
      return Position.Bottom;
    case Position.Bottom:
      return Position.Top;
    default: {
      const _exhaustive = p3;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}
function TextIcon() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 6V4H17V6M10 4V16M7 16H13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
function ImageIcon() {
  return <ImageOutlineIcon size={20} strokeWidth={1.8} aria-hidden="true" />;
}
function VideoIcon$1() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="4"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M14 8.5L18 6V14L14 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </CompositedSvg>
  );
}
function AudioIcon() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 3V17M7 6V14M4 8V12M13 5V15M16 7V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </CompositedSvg>
  );
}
function TableIcon() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M3 9H21M3 15H21M9 9V21M15 9V21" />
    </CompositedSvg>
  );
}
function MenuItem({
  icon,
  label,
  description,
  onClick,
  dataActionUiId,
  badge,
  badgeVariant = "default",
  onMouseEnter,
  trailingIcon,
}) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      className={`list-row-hit-area group flex ${description ? "h-[48px]" : "h-10"} shrink-0 w-full items-center gap-3 rounded-[8px] bg-transparent px-2 text-left transition-colors duration-200 cursor-pointer`}
      style={{
        color: "var(--canvas-controls-text)",
      }}
      onMouseEnter={(e2) => {
        e2.currentTarget.style.backgroundColor = "var(--canvas-controls-hover)";
        onMouseEnter?.(e2);
      }}
      onMouseLeave={(e2) => {
        e2.currentTarget.style.backgroundColor = "transparent";
      }}
      onClick={onClick}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--canvas-controls-hover) 50%, var(--canvas-controls-bg))",
          }}
        >
          {icon}
        </span>
      ) : null}
      <span
        className={`${description ? "h-9" : "h-5"} min-w-0 flex-1 overflow-hidden text-[14px] font-normal leading-5`}
      >
        <span
          className={`flex h-full flex-col justify-start ${description ? "translate-y-2 transition-transform duration-200 group-hover:translate-y-0" : ""}`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate">{label}</span>
            {badge && (
              <span
                className="inline-flex h-3.5 shrink-0 items-center rounded-[4px] px-1 text-[10px] font-normal leading-none"
                style={
                  badgeVariant === "accent"
                    ? {
                        color: "var(--brand-accent)",
                        background: "color-mix(in srgb, var(--brand-accent) 12%, transparent)",
                      }
                    : {
                        color: "var(--canvas-controls-text-muted)",
                        background: "var(--canvas-controls-hover)",
                      }
                }
              >
                {badge}
              </span>
            )}
          </span>
          {description && (
            <span className="w-full truncate text-[12px] leading-4 text-[var(--canvas-controls-text-muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {description}
            </span>
          )}
        </span>
      </span>
      {trailingIcon ? (
        <span className="flex size-4 shrink-0 items-center justify-center text-[var(--canvas-controls-text-muted)]">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}
function ComfyUiSubmenu({ open, onOpen, onCloseSubmenu, onCreateNode, onClose, flowPosition }) {
  const { t: t2 } = useTranslation();
  const {
    addNodeMenuBadges,
    fetchComfyUiWorkflows,
    onAddNodeMenuBadgeComplete,
    onPaneContextMenuAction,
    openComfyUiWorkflow,
    openComfyUiWorkflowLibrary,
  } = useCanvasBridge();
  const reportMenuAction = reactExports.useCallback(
    (menuItem) => {
      try {
        onPaneContextMenuAction?.({
          menuItem,
        });
      } catch {}
    },
    [onPaneContextMenuAction],
  );
  const [workflows, setWorkflows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [loaded, setLoaded] = reactExports.useState(false);
  const [openToLeft, setOpenToLeft] = reactExports.useState(false);
  const requestRef = reactExports.useRef(null);
  const hoverDismissRef = reactExports.useRef(null);
  const handleCancelHoverDismiss = reactExports.useCallback(() => {
    if (hoverDismissRef.current !== null) {
      clearTimeout(hoverDismissRef.current);
      hoverDismissRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (!open) handleCancelHoverDismiss();
    return handleCancelHoverDismiss;
  }, [open, handleCancelHoverDismiss]);
  const loadWorkflows = reactExports.useCallback(() => {
    if (loaded || loading || !fetchComfyUiWorkflows || requestRef.current) return;
    setLoading(true);
    const request = fetchComfyUiWorkflows()
      .then((items) => {
        setWorkflows(items.filter((item) => item.source === "user"));
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
        setWorkflows([]);
      })
      .finally(() => {
        requestRef.current = null;
        setLoading(false);
      });
    requestRef.current = request;
  }, [fetchComfyUiWorkflows, loaded, loading]);
  const handleMouseEnter = reactExports.useCallback(
    (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const menu = event.currentTarget.closest('[data-action-ui-id="canvas.add-node-menu"]');
      const rightEdge = menu ? menu.offsetLeft + menu.offsetWidth : rect.right;
      setOpenToLeft(rightEdge + SUBMENU_WIDTH_PX + 8 > window.innerWidth);
      onOpen();
      loadWorkflows();
    },
    [loadWorkflows, onOpen],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tracks the shared hover boundary; menu buttons and Escape own all actions.
    <div
      className="relative"
      onMouseEnter={handleCancelHoverDismiss}
      onMouseLeave={() => {
        handleCancelHoverDismiss();
        if (!open) return;
        hoverDismissRef.current = setTimeout(() => {
          hoverDismissRef.current = null;
          onCloseSubmenu();
        }, 150);
      }}
    >
      <MenuItem
        icon={<Workflow size={20} strokeWidth={1.8} />}
        label={t2("canvas.comfyui")}
        description={t2("canvas.comfyuiDesc")}
        badge={addNodeMenuBadges?.comfyUi}
        trailingIcon={<ChevronRight$1 size={16} strokeWidth={1.5} aria-hidden="true" />}
        dataActionUiId="canvas.menu-add-comfyui"
        onMouseEnter={handleMouseEnter}
        onClick={(event) => {
          completeAddNodeMenuBadge(onAddNodeMenuBadgeComplete, "comfyUi");
          reportMenuAction("canvas.menu-add-comfyui");
          handleMouseEnter(event);
        }}
      />
      <QuickZoomPresence value={open ? true : null}>
        {(_2, motionProps) => (
          <div
            {...motionProps}
            role="menu"
            aria-label={t2("canvas.comfyui")}
            className={`dp-motion-quick-zoom absolute right-auto bottom-0 z-10 flex max-h-[min(70vh,640px)] w-[240px] flex-col overflow-y-auto rounded-[16px] border p-2 ${openToLeft ? "right-[calc(100%+8px)]" : "left-[calc(100%+8px)]"}`}
            style={{
              transformOrigin: openToLeft ? "bottom right" : "bottom left",
              backgroundColor: "var(--canvas-controls-bg)",
              borderColor: "var(--canvas-border-subtle, var(--canvas-controls-border))",
              boxShadow: "var(--canvas-prompt-panel-shadow)",
            }}
            onMouseEnter={loadWorkflows}
          >
            <div className="flex h-7 items-center justify-between px-2">
              <button
                type="button"
                className="ml-auto cursor-pointer text-xs opacity-60 transition-opacity hover:opacity-100"
                style={{
                  color: "var(--canvas-controls-text)",
                }}
                data-action-ui-id="canvas.menu-comfyui-explore-more"
                onClick={() => {
                  completeAddNodeMenuBadge(onAddNodeMenuBadgeComplete, "comfyUi");
                  openComfyUiWorkflowLibrary?.();
                  onClose();
                  reportMenuAction("canvas.menu-comfyui-explore-more");
                }}
              >
                {t2("skills.popover.exploreMore")}
              </button>
            </div>
            <MenuItem
              icon={<PlusCircle size={20} strokeWidth={1.8} />}
              label={t2("canvas.comfyui.newNode")}
              description={t2("canvas.comfyui.newNodeDesc")}
              dataActionUiId="canvas.menu-comfyui-new-node"
              onClick={() => {
                completeAddNodeMenuBadge(onAddNodeMenuBadgeComplete, "comfyUi");
                onCreateNode();
                reportMenuAction("canvas.menu-comfyui-new-node");
              }}
            />
            {loading && (
              <div
                className="flex h-10 items-center px-2 text-xs opacity-60"
                style={{
                  color: "var(--canvas-controls-text)",
                }}
              >
                {t2("common.loading")}
              </div>
            )}
            {!loading &&
              workflows.map((workflow) => (
                <MenuItem
                  key={workflow.id}
                  icon={<Workflow size={20} strokeWidth={1.8} />}
                  label={workflow.title}
                  description={workflow.short_desc || t2("canvas.comfyui.userWorkflow")}
                  dataActionUiId={`canvas.menu-add-comfyui-workflow-${workflow.id}`}
                  onClick={() => {
                    completeAddNodeMenuBadge(onAddNodeMenuBadgeComplete, "comfyUi");
                    void openComfyUiWorkflow?.(workflow.id, flowPosition);
                    onClose();
                    reportMenuAction("canvas.menu-comfyui-saved-workflow");
                  }}
                />
              ))}
          </div>
        )}
      </QuickZoomPresence>
    </div>
  );
}
function ConnectionLineOverlay({ source }) {
  const { flowToScreenPosition } = useReactFlow();
  useStore$3((s2) => s2.transform);
  const paths = source.points.map((p3) => {
    const screenSource = flowToScreenPosition({
      x: p3.sourceFlowX,
      y: p3.sourceFlowY,
    });
    const [d2] = getBezierPath({
      sourceX: screenSource.x,
      sourceY: screenSource.y,
      sourcePosition: p3.handlePosition,
      targetX: source.endX,
      targetY: source.endY,
      targetPosition: oppositeHandlePosition(p3.handlePosition),
    });
    return d2;
  });
  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 49,
        }}
      >
        {paths.map((d2, i2) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: paths are positionally tied to source.points order
          <path key={i2} d={d2} fill="none" stroke="var(--canvas-edge)" strokeWidth={1.5} />
        ))}
      </svg>
      {source.showEndCap && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: source.endX,
            top: source.endY,
            transform: "translate(-50%, -50%)",
            width: 24,
            height: 24,
            color: "var(--canvas-handle, #919191)",
            background: "var(--canvas-handle-bg, transparent)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 50,
            lineHeight: 0,
          }}
        >
          <CompositedSvg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path
              d="M10 6v8M6 10h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </CompositedSvg>
        </div>
      )}
    </>
  );
}
const VIDEO_MODEL_BADGE = "MiniMax H3";
export function CanvasContextMenu({
  motionProps,
  position: position2,
  flowPosition,
  onClose,
  onAddNode,
  connectionSource,
  sourceNodeType,
  sourceNodePluginId,
}) {
  const { t: t2 } = useTranslation();
  const { addNodeMenuBadges, onAddNodeMenuBadgeComplete } = useCanvasBridge();
  const [comfyUiOpen, setComfyUiOpen] = reactExports.useState(false);
  const handleOpenComfyUi = reactExports.useCallback(() => setComfyUiOpen(true), []);
  const handleCloseComfyUi = reactExports.useCallback(() => setComfyUiOpen(false), []);
  const handleClose = reactExports.useCallback(() => {
    setComfyUiOpen(false);
    onClose();
  }, [onClose]);
  const handleEscape = reactExports.useCallback(() => {
    if (!comfyUiOpen) return false;
    setComfyUiOpen(false);
    return true;
  }, [comfyUiOpen]);
  const getAnchorPosition = reactExports.useCallback(
    (menuHeight) => {
      if (!position2.dockAnchor) return position2;
      return {
        x: position2.dockAnchor.button.getBoundingClientRect().left,
        y: position2.dockAnchor.toolbar.getBoundingClientRect().top - 8 - menuHeight,
      };
    },
    [position2],
  );
  const { menuRef, clampedPosition } = useClampedMenuPosition({
    position: position2,
    getAnchorPosition: position2.dockAnchor ? getAnchorPosition : void 0,
    estimatedWidth: MENU_WIDTH_PX,
    estimatedHeight: MENU_ESTIMATED_HEIGHT_PX,
  });
  useDismissMenu(
    menuRef,
    handleClose,
    handleEscape,
    position2.dockAnchor?.button,
    !motionProps?.inert,
  );
  const handleClick2 = reactExports.useCallback(
    (action) => {
      setComfyUiOpen(false);
      action();
      onClose();
    },
    [onClose],
  );
  const allowed =
    sourceNodePluginId === PANORAMA_VIEWER_PLUGIN_ID
      ? [CanvasNodeType.Image]
      : sourceNodeType
        ? ALLOWED_TARGET_TYPES[sourceNodeType]
        : void 0;
  const show = reactExports.useMemo(() => {
    if (!allowed)
      return {
        text: true,
        table: true,
        image: true,
        video: true,
        audio: true,
      };
    const s2 = new Set(allowed);
    return {
      text: s2.has(CanvasNodeType.Text),
      table: s2.has(CanvasNodeType.Table),
      image: s2.has(CanvasNodeType.Image),
      video: s2.has(CanvasNodeType.Video),
      audio: s2.has(CanvasNodeType.Audio),
    };
  }, [allowed]);
  const menu = (
    <>
      {connectionSource && <ConnectionLineOverlay source={connectionSource} />}
      <div
        {...motionProps}
        ref={(element2) => {
          menuRef.current = element2;
          if (motionProps) motionProps.ref.current = element2;
        }}
        data-action-ui-id="canvas.add-node-menu"
        className="dp-motion-quick-zoom fixed flex w-[240px] flex-col rounded-[16px] p-2 select-none"
        onMouseOverCapture={(event) => {
          const button = event.target instanceof Element ? event.target.closest("button") : null;
          if (
            button &&
            !button.closest('[role="menu"]') &&
            button.dataset.actionUiId !== "canvas.menu-add-comfyui"
          ) {
            handleCloseComfyUi();
          }
        }}
        style={{
          left: clampedPosition.x,
          top: clampedPosition.y,
          backgroundColor: "var(--canvas-controls-bg)",
          border: "1px solid var(--canvas-border-subtle, var(--canvas-controls-border))",
          boxShadow: "var(--canvas-prompt-panel-shadow)",
          zIndex: 50,
          transformOrigin: position2.dockAnchor
            ? "bottom left"
            : `${position2.x - clampedPosition.x}px ${position2.y - clampedPosition.y}px`,
        }}
      >
        <h4
          className="px-2 py-1.5 text-[12px] font-normal leading-5"
          style={{
            color: "var(--canvas-controls-text-muted)",
          }}
        >
          {t2("canvas.addNode")}
        </h4>
        {show.text && (
          <MenuItem
            icon={<TextIcon />}
            label={t2("canvas.text")}
            description={t2("canvas.textDesc")}
            dataActionUiId="canvas.menu-add-text"
            onClick={() => handleClick2(() => onAddNode("text"))}
          />
        )}
        {show.table && (
          <MenuItem
            icon={<TableIcon />}
            label={t2("canvas.table", "Table")}
            description={t2("canvas.tableDesc", "Structured data with rows and columns")}
            dataActionUiId="canvas.menu-add-table"
            onClick={() => handleClick2(() => onAddNode("table"))}
          />
        )}
        {show.image && (
          <MenuItem
            icon={<ImageIcon />}
            label={t2("canvas.image")}
            description={t2("canvas.imageDesc")}
            dataActionUiId="canvas.menu-add-image"
            onClick={() => handleClick2(() => onAddNode("image"))}
          />
        )}
        {show.video && (
          <MenuItem
            icon={<VideoIcon$1 />}
            label={t2("canvas.video")}
            description={t2("canvas.videoDesc")}
            badge={VIDEO_MODEL_BADGE}
            badgeVariant="accent"
            dataActionUiId="canvas.menu-add-video"
            onClick={() => handleClick2(() => onAddNode("video"))}
          />
        )}
        {show.audio && (
          <MenuItem
            icon={<AudioIcon />}
            label={t2("canvas.audio")}
            description={t2("canvas.audioDesc")}
            dataActionUiId="canvas.menu-add-audio"
            onClick={() => handleClick2(() => onAddNode("audio"))}
          />
        )}
        <MenuItem
          icon={<DirectorStageMenuIcon />}
          label={t2("canvas.directorStage")}
          description={t2("canvas.directorStageDesc")}
          badge={addNodeMenuBadges?.directorStage}
          dataActionUiId="canvas.menu-add-director-stage"
          onClick={() =>
            handleClick2(() => {
              completeAddNodeMenuBadge(onAddNodeMenuBadgeComplete, "directorStage");
              onAddNode(formatPluginAddNodeType(DIRECTOR_STAGE_PLUGIN_ID));
            })
          }
        />
        <MenuItem
          icon={<VideoEditingMenuIcon />}
          label={t2("canvas.videoEditing")}
          description={t2("canvas.videoEditingDesc")}
          badge={addNodeMenuBadges?.videoEditing}
          dataActionUiId="canvas.menu-add-video-editing"
          onClick={() =>
            handleClick2(() => {
              completeAddNodeMenuBadge(onAddNodeMenuBadgeComplete, "videoEditing");
              onAddNode(formatPluginAddNodeType(CLIP_STUDIO_PLUGIN_ID));
            })
          }
        />
        <ComfyUiSubmenu
          open={comfyUiOpen}
          onOpen={handleOpenComfyUi}
          onCloseSubmenu={handleCloseComfyUi}
          onClose={handleClose}
          flowPosition={flowPosition}
          onCreateNode={() =>
            handleClick2(() => onAddNode(formatPluginAddNodeType(COMFYUI_PLUGIN_ID$1)))
          }
        />
      </div>
    </>
  );
  return typeof document === "undefined" ? menu : reactDomExports.createPortal(menu, document.body);
}
