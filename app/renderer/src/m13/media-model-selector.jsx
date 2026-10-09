// media-model-selector.jsx
import { jsxRuntimeExports, reactExports, useTranslation, dedupedToast, Check, useQuery, API_PATHS, usePlatform, reactDomExports, getRuntimeConfig, Video, ArrowUpRight, Plus, BROWSER_IMAGE_EDIT_EVENT, Bot, useQueryClient, useGatewayScope, Music, Box } from "../vendor.js";
import { recordAction } from "../m15/agent-ws-client.jsx";
import { TOOL_LABEL_DEFINITIONS$1 } from "../m15/deferred-thumbnail-image-generation.jsx";
import { Tooltip, TooltipTrigger, openExternalUrl, Icon, TooltipProvider } from "../m15/graph.jsx";
import { ImageOutlineIcon, PencilLine, Paperclip } from "../m15/parse-item.jsx";
import { registrySelectionRowIds, IMAGE_MODELS, VIDEO_MODELS, AUDIO_MODELS } from "../m15/push-inline.js";
import { MEDIA_CATEGORIES, isVisibleMediaModelSelected, isAllVisibleMediaModelsSelected, countVisibleSelectedMediaModels } from "../m15/qo.jsx";
import { getToolLabelId, getBuiltInToolLabelId } from "../m15/save-chat-rating.js";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { useGatewayFetch, useModelCatalogScopeKey, ACTIVE_CUSTOM_MODEL_QUERY_KEY, useMediaModels } from "../m15/use-resizable-width.js";
import { useComposerActionsCompact } from "../m12/mention-popover.jsx";
import {
  TooltipContent,
  Button$1,
  Checkbox,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SkillIcon } from "../m08/browser-inspiration-urls.jsx";
import { QuickZoomPresence } from "../m06/canvas-toggle-icon.jsx";
import { SegmentedSwitch } from "../m09/use-credit-details.jsx";
import { getHailuoCreditsRulesUrl } from "../m08/shortcut-categories.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { getConfiguredToolDisplayLabel } from "../m15/interest-selection-provider.jsx";
import { isCustomModelProvider } from "../m01/myers-line-hunks.js";
import { useAgentModelMembershipAccess } from "../m12/file-chip.jsx";
import { CapabilityPopoverHeader } from "../m12/use-market-skills.jsx";
import {
  normalizeAgentModelDisplay,
  resolveAgentModelAccess,
  agentModelMatchesSelection,
} from "../m01/normalize-tag-registry.js";
import {
  useActiveCustomModel,
  readActiveCustomModel,
} from "../m10/delete-account-confirm-dialog.jsx";
import {
  GeneralImageIcon,
  GptImageDomesticIcon,
  GptImageOverseasIcon,
  VeoDomesticIcon,
  VeoOverseasIcon,
  NanoBananaIcon,
  MidjourneyIcon,
  SeedreamIcon,
  KlingIcon,
  MinimaxIcon,
  HailuoIcon,
  WanIcon,
  formatResolutionRange,
  ClockIcon$1,
  SpeakerIcon,
} from "../m01/model-chip.jsx";
import { useSettingsDialog } from "../m10/custom-provider-form.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { isPromotionActive } from "../m01/resolve-reference-texts.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useAttachmentFaceNoticeGate } from "./mode-selector.jsx";
import { RECONNECTING_STUCK_THRESHOLD_MS } from "./session-tab-strip.jsx";
export function dispatchBrowserImageEditToChat(request) {
  const event = new CustomEvent(BROWSER_IMAGE_EDIT_EVENT, {
    detail: request,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
export function useChatConnectionPhase(workspaceId2, connected) {
  const [history2, setHistory] = reactExports.useState(() => ({
    workspaceId: workspaceId2,
    hasConnected: connected,
  }));
  reactExports.useEffect(() => {
    setHistory((current2) => {
      if (current2.workspaceId !== workspaceId2) {
        return {
          workspaceId: workspaceId2,
          hasConnected: connected,
        };
      }
      if (connected && !current2.hasConnected) {
        return {
          ...current2,
          hasConnected: true,
        };
      }
      return current2;
    });
  }, [workspaceId2, connected]);
  if (connected) return "connected";
  const hasConnected = history2.workspaceId === workspaceId2 && history2.hasConnected;
  return hasConnected ? "reconnecting" : "connecting";
}
const GLYPHS$1 = {
  "alpha/alpha": {
    name: "alpha-domestic",
    viewBox: "0 0 584 584",
    path: "M311.564 303.565C311.564 303.565 341.839 304.993 391.092 292.571L521.482 367.853C516.386 383.286 509.664 398.445 501.224 413.065C492.784 427.683 483.017 441.082 472.21 453.195C352.327 382.65 311.564 303.565 311.564 303.565ZM292.596 314.51C292.596 314.51 306.481 341.469 341.872 377.917L341.856 528.412C326.756 531.576 311.336 533.298 295.823 533.527C278.18 533.495 260.666 532.097 243.363 528.483C243.954 456.851 255.349 377.305 292.596 314.51ZM472.24 132.01C484.031 145.199 494.055 159.658 502.867 174.964C510.41 188.506 516.614 202.729 521.433 217.375C400.42 285.907 311.579 281.677 311.579 281.677C311.579 281.677 327.974 256.178 341.839 207.309L472.24 132.01ZM63.7876 367.869C183.483 300.081 271.696 303.493 273.609 303.576C272.868 304.745 256.933 330.192 243.394 377.915L113.005 453.193C102.67 441.642 93.5869 429.204 85.7732 416.096C76.8535 400.758 69.328 384.754 63.7876 367.869ZM243.344 56.8204C260.752 53.1731 278.389 51.685 296.147 51.7177C311.381 51.9375 326.703 53.5949 341.858 56.761C340.72 195.862 292.605 270.722 292.605 270.722C292.605 270.722 278.719 243.764 243.328 207.315L243.344 56.8204ZM83.9767 172.167C92.4172 157.548 102.182 144.151 112.99 132.037C232.877 202.583 273.636 281.667 273.636 281.667C273.276 281.651 243.075 280.294 194.121 292.64L63.7297 217.359C68.8252 201.93 75.5387 186.783 83.9767 172.167Z",
  },
  "alpha/claude-opus-5-5": {
    name: "alpha-overseas",
    viewBox: "0 0 538 538",
    path: "M105.472 357.771L211.272 298.409L213.051 293.253L211.272 290.385H206.116L188.434 289.296L127.983 287.662L75.5553 285.484L24.7615 282.76L11.9814 280.037L0 264.244L1.23446 256.365L11.9814 249.14L27.3756 250.483L61.3955 252.807L112.443 256.329L149.477 258.507L204.337 264.207H213.051L214.285 260.686L211.308 258.507L208.984 256.329L156.157 220.53L98.9734 182.698L69.02 160.914L52.827 149.876L44.6579 139.529L41.1361 116.946L55.8405 100.752L75.5916 102.096L80.6383 103.439L100.644 118.834L143.377 151.909L199.181 193.009L207.35 199.799L210.618 197.475L211.017 195.841L207.35 189.705L176.998 134.845L144.612 79.0408L130.198 55.9131L126.385 42.0437C125.042 36.3435 124.062 31.551 124.062 25.7055L140.799 2.97722L150.058 0L172.387 2.97722L181.79 11.1463L195.66 42.8788L218.134 92.8375L252.989 160.768L263.191 180.919L268.637 199.581L270.67 205.281H274.192V202.013L277.06 163.745L282.361 116.764L287.517 56.3124L289.296 39.2844L297.719 18.8797L314.457 7.84237L327.527 14.0872L338.274 29.4814L336.786 39.4296L330.396 80.9651L317.869 146.028L309.7 189.596H314.457L319.903 184.15L341.941 154.887L378.975 108.595L395.313 90.2234L414.374 69.9276L426.61 60.27H449.737L466.765 85.5761L459.141 111.717L435.323 141.925L415.572 167.521L387.253 205.644L369.571 236.142L371.205 238.575L375.416 238.175L439.39 224.56L473.954 218.315L515.199 211.235L533.861 219.949L535.894 228.808L528.56 246.925L484.447 257.817L432.709 268.165L355.665 286.391L354.721 287.081L355.811 288.424L390.52 291.692L405.37 292.491H441.713L509.39 297.538L527.072 309.228L537.673 323.534L535.894 334.426L508.664 348.295L471.921 339.581L386.163 319.177L356.755 311.843H352.688V314.275L377.195 338.238L422.107 378.793L478.347 431.075L481.216 444.001L473.99 454.203L466.366 453.114L416.952 415.935L397.891 399.198L354.721 362.854H351.853V366.666L361.801 381.226L414.338 460.194L417.061 484.411L413.249 492.289L399.633 497.046L384.675 494.322L353.923 451.153L322.19 402.538L296.593 358.969L293.471 360.748L278.367 523.441L271.287 531.755L254.949 538L241.334 527.652L234.109 510.915L241.334 477.839L250.048 434.67L257.128 400.359L263.518 357.735L267.33 343.575L267.076 342.631L263.953 343.03L231.821 387.144L182.952 453.186L144.285 494.577L135.026 498.244L118.979 489.929L120.467 475.08L129.435 461.864L182.952 393.788L215.229 351.599L236.069 327.237L235.924 323.715H234.69L92.547 416.008L67.2409 419.276L56.3488 409.073L57.6921 392.336L62.8477 386.89L105.581 357.481L105.436 357.626L105.472 357.771Z",
  },
  "gamma/gamma_high": {
    name: "gamma",
    viewBox: "0 0 507 492",
    path: "M185.845 311.927C193.754 318.52 206.886 327.444 215.518 333.723L273.065 375.571L314.037 405.331C322.051 411.153 330.353 417.716 338.935 422.509C354.682 431.303 375.114 419.838 379.294 403.158C380.642 397.777 380.393 394.728 379.741 389.218C385.352 386.033 394.702 378.85 400.288 374.793L436.785 348.275C443.943 379.394 452.404 396.869 439.859 430.063C437.252 437.042 433.744 443.65 429.436 449.727C414.335 471.13 391.334 485.643 365.515 490.066C318.92 497.818 289.171 468.574 254.43 443.311L164.14 377.836C165.189 373.738 166.502 369.432 167.88 365.431C173.978 347.716 178.982 329.179 185.527 311.66L185.845 311.927ZM183.947 212.464C180.318 226.439 173.435 245.7 168.853 259.767L140.947 345.494C136.089 360.437 129.485 378.294 126.327 393.339C123.167 408.398 138.74 424.58 153.366 425.212C160.041 425.5 164.06 424.458 170.148 421.334L225.786 461.761C221.767 464.375 215.979 469.162 212.018 472.268C208.35 474.984 204.505 477.451 200.51 479.656C178.644 491.709 152.839 494.425 128.942 487.191C104.143 479.797 83.3146 462.816 71.0691 440.02C63.0289 424.784 59.3791 407.612 60.5262 390.424C61.9219 370.313 72.3769 344.479 78.5945 324.638C90.3172 287.23 103.423 249.913 114.9 212.41L183.947 212.464ZM394.178 114.92C404.505 114.719 415.599 114.328 425.793 115.85C450.468 119.432 472.695 132.739 487.503 152.805C502.841 173.718 509.238 199.868 505.295 225.501C502.719 242.071 495.651 257.62 484.87 270.462C472.913 284.653 443.764 303.979 427.525 315.786L341.728 378.1L336.194 382.313C318.824 369.519 297.836 353.477 280 341.67C314.101 315.876 351.359 289.813 386.132 264.573L413.944 244.367C430.79 232.119 449.605 220.769 436.887 195.709C432.209 186.481 423.965 182.806 414.373 180.052C411.842 173.093 393.526 117.311 394.178 114.92ZM91.3094 114.891C109.564 114.259 131.189 114.77 149.749 114.77L257.439 114.83C259.107 121.913 262.584 131.629 264.923 138.823L278.466 180.44C217.755 181.19 156.774 179.934 96.0457 180.469C86.0428 180.558 79.3825 183.572 72.6639 190.839C61.539 205.91 64.5558 218.589 75.2859 232.315C67.7685 252.812 61.4685 278.879 53.4353 298.464C46.3992 292.853 37.6487 286.19 31.0574 280.289C12.4927 263.734 1.34657 240.422 0.116981 215.579C-1.1387 189.875 7.75431 164.706 24.8797 145.498C42.5138 126.031 65.4957 116.261 91.3094 114.891ZM243.418 0.444897C261.325 -1.25569 279.36 1.93887 295.593 9.68708C311.339 17.3529 324.581 29.3532 333.746 44.2789C343.779 60.4918 352.043 91.9769 358.446 110.9C370.633 146.894 381.645 183.824 394.05 219.76C391.148 221.554 387.748 224.079 385.012 226.148C369.732 237.711 353.103 248.483 338.18 260.45C334.704 252.169 329.643 234.787 326.69 225.638C312.17 183.104 299.184 139.864 284.887 97.2398C281.334 86.6497 279.066 76.2376 268.796 69.9976C260.238 64.8007 249.808 64.2816 240.733 68.4957C233.704 71.7914 230.174 76.3366 226.26 82.7349L156.47 82.6783C162.169 66.1613 167.774 49.4885 178.692 35.7144C195.267 14.8058 217.368 3.56104 243.418 0.444897Z",
  },
  "gamma/gamma-6-astra": {
    name: "gamma-astra",
    viewBox: "0 0 546 536",
    path: "M268.771 0.0284664C273.036 -0.0460568 277.057 -0.00143729 281.296 0.49624C315.522 4.5124 355.012 38.0917 375.421 64.4347C414.384 64.2492 472.242 75.4933 494.308 110.906C513.042 140.977 511.261 191.905 503.587 225.26C513.84 236.828 522.639 252.782 529.523 266.497C541.579 290.51 550.533 320.677 541.295 347.048C529.397 381.004 488.837 410.43 457.733 425.593C453.97 443.851 446.679 461.722 438.33 478.294C427.023 500.732 409.495 523.64 384.714 531.575C359.339 539.699 331.006 534.708 305.97 527.547C293.973 524.116 285.944 521.467 274.947 515.97L272.796 514.811C237.628 531.151 181.406 546.805 145.922 524.972C114.83 505.839 95.4245 459.811 87.1303 425.626C70.6576 418.517 49.0017 402.963 35.6771 391.102C17.3736 374.673 1.50509 354.29 0.135153 328.823C-1.3815 300.63 10.0835 275.122 23.6176 251.132C28.6708 242.174 34.3816 232.924 41.3588 225.255C37.0272 208.887 36.1254 189.481 36.1361 172.59C36.1324 146.891 41.2908 117.16 60.6322 98.4162C84.7247 75.0674 123.516 67.7411 155.811 64.5587C159.86 64.1595 165.259 64.4345 169.352 64.4611C171.5 61.7828 173.68 59.13 175.892 56.5041C181.41 50.0446 188.084 43.6545 194.454 38.0431C215.918 19.1378 239.399 2.32515 268.771 0.0284664ZM282.268 48.9396C279.773 46.538 274.559 44.9031 270.993 45.2648C253.68 49.0341 241.693 81.822 234.071 95.7912C247.963 97.77 261.683 100.464 275.737 101.407C278.559 101.597 281.405 101.788 284.227 102.01C286.159 105.163 287.753 109.304 289.503 112.616C294.145 121.416 298.527 132.485 303.245 141.03C281.216 149.649 262.758 152.495 238.796 151.069C224.155 150.197 210.792 146.809 196.527 143.56L156.335 134.4C140.661 130.837 125.269 126.359 109.079 126.545C100.726 126.641 93.1587 126.743 89.1156 135.872C85.422 144.213 91.3857 157.842 93.9945 166.116C97.0712 174.845 103.464 185.21 106.79 193.665C118.133 183.482 129.506 173.172 139.781 161.894C140.784 160.792 141.785 159.687 142.626 158.455C156.336 161.487 171.77 165.449 185.348 168.069C179.188 189.286 168.069 208.744 152.902 224.846C143.334 235.107 133.385 242.771 122.443 251.504L90.5785 276.84C76.0332 288.38 57.0682 301.668 47.4564 318.254C45.0842 322.347 45.7968 327.796 47.9242 331.862C51.9558 339.563 71.0385 346.011 79.1215 348.102C85.3641 349.718 97.9346 352.719 104.237 353.659C103.56 341.367 102.655 328.834 101.116 316.618C100.714 313.432 99.8202 306.886 98.9809 303.931L133.017 276.82C146.057 293.806 154.445 317.387 157.497 338.448C159.478 352.112 159.342 364.252 159.341 377.959L159.324 413.74C159.315 433.677 157.575 459.141 164.931 477.97C166.477 481.927 172.632 485.935 176.721 486.189C187.875 486.888 206.425 473.178 214.554 466.736L228.361 455.764C224.657 453.571 220.184 450.279 216.545 447.779C209.609 442.931 202.507 438.328 195.25 433.971C193.057 432.678 188.051 429.729 185.761 428.806C185.658 414.842 185.415 399.272 185.761 385.397C205.857 386.633 221.871 390.785 240.026 399.72C265.599 412.757 284.336 430.91 306.857 448.04C319.112 457.364 355.155 490.608 370.755 485.648C374.835 484.378 378.216 481.502 380.119 477.687C386.494 464.742 385.485 437.219 385.458 422.869C369.875 427.276 352.525 432.401 337.743 439.01C326.503 429.914 315.204 420.893 303.846 411.945C318.629 394.334 340.555 380.917 362.028 373.144C373.283 369.067 385.803 366.423 397.492 363.777L438.59 354.444C454.084 350.935 480.315 346.117 492.801 336.618C496.947 333.465 499.425 328.317 498.906 323.103C497.503 309.056 468.212 288.558 457.767 279.251C451.348 295.497 445.267 309.943 440.628 326.908C431.791 328.818 422.97 330.807 414.166 332.871C409.174 334.016 403.09 335.573 398.114 336.295C394.09 315.425 396.741 289.983 403.169 269.759C407.143 257.264 413.472 244.395 419.212 232.584L435.206 199.558C438.866 192.006 442.69 184.246 446.273 176.668C465.985 135.004 460.1 118.882 411.212 129.282C404.281 130.767 397.393 132.442 390.554 134.306C397.754 147.442 407.785 165.125 416.864 176.76C410.379 189.784 404.029 202.875 397.823 216.031C359.357 193.083 346.788 170.788 328.058 131.619L310.98 96.2931C303.238 80.2534 295.525 61.6899 282.268 48.9396Z",
  },
};
function LocalAgentModelIcon({ model, size: size2 }) {
  const modelId = model === "gamma/gpt-6-astra" ? "gamma/gamma-6-astra" : model;
  const glyph = Object.hasOwn(GLYPHS$1, modelId) ? GLYPHS$1[modelId] : void 0;
  if (!glyph) return <Bot size={size2} strokeWidth={1.5} aria-hidden="true" />;
  return (
    <svg
      width={size2}
      height={size2}
      viewBox={glyph.viewBox}
      fill="none"
      role="presentation"
      aria-hidden="true"
      data-agent-model-icon={glyph.name}
    >
      <path d={glyph.path} fill="currentColor" />
    </svg>
  );
}
function AgentModelIcon({ icon, model, size: size2 }) {
  const url2 = normalizeAgentModelDisplay({
    icon,
  })?.icon;
  return url2 ? (
    <RemoteAgentModelIcon key={url2} url={url2} model={model} size={size2} />
  ) : (
    <LocalAgentModelIcon model={model} size={size2} />
  );
}
function RemoteAgentModelIcon({ url: url2, model, size: size2 }) {
  const [failed, setFailed] = reactExports.useState(false);
  if (failed) return <LocalAgentModelIcon model={model} size={size2} />;
  return (
    <img
      src={url2}
      alt=""
      aria-hidden="true"
      width={size2}
      height={size2}
      className={size2 === 20 ? "size-5 shrink-0 object-contain" : "size-4 shrink-0 object-contain"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
const AGENT_MODEL_TOOLTIP_SIDE_OFFSET = -8;
const AgentModelRow = reactExports.memo(function AgentModelRow2({
  model,
  displayName: displayName2,
  display,
  membershipRequired = false,
  selected: selected2,
  onSelect,
}) {
  const { t: t2 } = useTranslation();
  const description = display?.description;
  const listDescription = display?.listDescription ?? description;
  const metrics = display?.metrics;
  const visibleMetrics = ["speed", "intelligence", "cost"].flatMap((key2) =>
    typeof metrics?.[key2] === "number"
      ? [
          {
            key: key2,
            value: metrics[key2],
          },
        ]
      : [],
  );
  const renderIcon = (size2) => <AgentModelIcon icon={display?.icon} model={model} size={size2} />;
  const row = (
    <button
      type="button"
      onClick={() => onSelect(model)}
      aria-pressed={selected2}
      data-action-ui-id={`chat-agent-model-${model}`}
      className="list-row-hit-area mt-0.5 flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-foreground transition-colors first:mt-0 hover:bg-popup-item-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <span
        data-model-icon-tile={true}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--model-selector-icon-border)] bg-transparent [border-width:var(--divider-width)]"
      >
        <span className="flex items-center justify-center text-foreground opacity-60">
          {renderIcon(20)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] leading-5">{displayName2}</span>
          {membershipRequired ? (
            <span
              data-action-ui-id={`chat-agent-model-membership-${model}`}
              className="inline-flex h-5 shrink-0 items-center rounded-full bg-brand-accent px-2 text-[11px] font-medium leading-none text-brand-accent-foreground"
            >
              {t2("chat.mediaModels.agent.membership")}
            </span>
          ) : null}
        </span>
        {listDescription && (
          <span className="truncate text-[12px] leading-4 text-muted-foreground">
            {listDescription}
          </span>
        )}
      </span>
      {selected2 ? (
        <span className="flex size-4 shrink-0 items-center justify-center text-foreground">
          <Icon icon={Check} size="sm" strokeWidth={2} />
        </span>
      ) : null}
    </button>
  );
  if (!description && !visibleMetrics.length) return row;
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={row} />
        <TooltipContent
          side="right"
          sideOffset={AGENT_MODEL_TOOLTIP_SIDE_OFFSET}
          align="start"
          className="!bg-popover !text-popover-foreground w-[208px] max-w-[208px] flex-col items-stretch gap-0 rounded-lg border border-border p-3 text-left shadow-md"
          data-action-ui-id={`chat-agent-model-info-${model}`}
        >
          <div className="mb-0.5 flex items-center gap-2 text-sm font-medium text-foreground">
            {renderIcon(16)}
            <span>{displayName2}</span>
          </div>
          {description && (
            <div className="mb-2 text-xs leading-4 text-muted-foreground">{description}</div>
          )}
          {visibleMetrics.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-2">
              {visibleMetrics.map(({ key: metric, value }) => (
                <div key={metric} className="flex items-center gap-2.5">
                  <span className="w-9 shrink-0 text-xs text-muted-foreground">
                    {t2(`chat.mediaModels.agent.metrics.${metric}`)}
                  </span>
                  <span
                    role="img"
                    className="flex w-32 shrink-0 gap-1.5"
                    aria-label={t2("chat.mediaModels.agent.metricValue", {
                      value,
                      max: 5,
                    })}
                  >
                    {[1, 2, 3, 4, 5].map((tick) => (
                      <span
                        key={`${metric}-${tick}`}
                        aria-hidden="true"
                        className={`h-1 flex-1 rounded-full ${tick <= value ? "bg-foreground" : "bg-foreground/15"}`}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
function AgentReasoningSelector({ model, selectedId, onSelect }) {
  const { t: t2 } = useTranslation();
  const choices = [
    {
      level: t2("chat.mediaModels.agent.reasoningDefault"),
      modelId: model.id,
    },
    ...(model.reasoningLevels ?? []),
  ];
  return (
    <fieldset className="mb-2 ml-14 space-y-1.5 px-2.5">
      <legend className="text-xs text-muted-foreground">
        {t2("chat.mediaModels.agent.reasoning")}
      </legend>
      <div className="flex flex-wrap gap-1">
        {choices.map((choice) => (
          <Button$1
            key={choice.modelId}
            type="button"
            size="sm"
            variant={selectedId === choice.modelId ? "secondary" : "ghost"}
            aria-pressed={selectedId === choice.modelId}
            data-action-ui-id={`chat-agent-reasoning-${choice.modelId}`}
            onClick={() => onSelect(choice.modelId)}
          >
            {choice.level}
          </Button$1>
        ))}
      </div>
    </fieldset>
  );
}
const SELECTABLE_AGENT_MODEL_ORDER = new Map([
  ["gamma/gamma_high", 0],
  ["alpha/alpha", 1],
  ["alpha/claude-opus-5-5", 1],
  ["gamma/gamma-6-astra", 2],
  ["gamma/gpt-6-astra", 2],
]);
function normalizeAgentModels(value, custom) {
  if (!value || typeof value !== "object" || !("models" in value) || !Array.isArray(value.models)) {
    throw new Error("Invalid OpenCode model catalog");
  }
  const normalizedModels = value.models.map((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      !("id" in row) ||
      typeof row.id !== "string" ||
      !("name" in row) ||
      typeof row.name !== "string" ||
      !("provider" in row) ||
      typeof row.provider !== "string"
    ) {
      throw new Error("Invalid OpenCode model");
    }
    const display = normalizeAgentModelDisplay("display" in row ? row.display : void 0);
    const access = resolveAgentModelAccess(row.id, "access" in row ? row.access : void 0);
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      ...(display
        ? {
            display,
          }
        : {}),
      ...(access
        ? {
            access,
          }
        : {}),
    };
  });
  const models = [
    ...normalizedModels
      .filter((model) => SELECTABLE_AGENT_MODEL_ORDER.has(model.id))
      .sort(
        (a2, b3) =>
          (SELECTABLE_AGENT_MODEL_ORDER.get(a2.id) ?? 0) -
          (SELECTABLE_AGENT_MODEL_ORDER.get(b3.id) ?? 0),
      ),
    ...(custom?.models ?? []),
  ];
  const defaultId =
    "default" in value && typeof value.default === "string" ? value.default : void 0;
  const platformModels = models.filter((model) => !isCustomModelProvider(model.provider));
  const defaultModel = platformModels.find((model) => model.id === defaultId) ?? platformModels[0];
  return {
    models,
    ...(defaultModel
      ? {
          default: defaultModel.id,
        }
      : {}),
  };
}
function useAgentModels(enabled = true) {
  const activeCustomModel = useActiveCustomModel();
  const queryClient2 = useQueryClient();
  const gatewayFetch2 = useGatewayFetch();
  const { gatewayReady, scopeKey, gatewayBinding } = useGatewayScope();
  const catalogScopeKey = useModelCatalogScopeKey();
  const { i18n } = useTranslation();
  const { region, channel } = getRuntimeConfig();
  return useQuery({
    queryKey: [
      "agent-models",
      activeCustomModel.data,
      gatewayReady,
      catalogScopeKey,
      region,
      channel,
      i18n.language,
      scopeKey,
      gatewayBinding?.instanceId,
      gatewayBinding?.generation,
    ],
    queryFn: async ({ signal }) => {
      let active2 = activeCustomModel.data;
      if (activeCustomModel.isError) {
        try {
          active2 = await readActiveCustomModel();
        } catch {
          throw new Error("Custom model configuration is unavailable");
        }
        queryClient2.setQueryData(ACTIVE_CUSTOM_MODEL_QUERY_KEY, active2);
      }
      if (!gatewayReady && active2) return active2;
      try {
        const response = await gatewayFetch2(API_PATHS.agentModels, {
          signal,
          timeoutMs: 1e4,
        });
        if (!response.ok) throw new Error(`OpenCode models unavailable (HTTP ${response.status})`);
        return normalizeAgentModels(await response.json(), active2);
      } catch (error) {
        if (active2?.models.length && !signal.aborted) return active2;
        throw error;
      }
    },
    enabled:
      enabled &&
      (activeCustomModel.isError ||
        (activeCustomModel.isSuccess && (Boolean(activeCustomModel.data) || gatewayReady))),
    staleTime: 3e4,
    retry: activeCustomModel.isError ? false : 2,
    retryDelay: 300,
  });
}
const MEDIA_MODEL_POPOVER_WIDTH = 408;
const MEDIA_MODEL_POPOVER_VIEWPORT_GAP = 8;
function getMediaModelPopoverHorizontalLayout(anchor, viewportWidth, align = "center", bounds) {
  const availableWidth = Math.max(0, viewportWidth - MEDIA_MODEL_POPOVER_VIEWPORT_GAP * 2);
  const width = Math.min(MEDIA_MODEL_POPOVER_WIDTH, availableWidth);
  const requestedLeft =
    align === "start" ? anchor.left : anchor.left + anchor.width / 2 - width / 2;
  const viewportLeft = MEDIA_MODEL_POPOVER_VIEWPORT_GAP;
  const viewportRight = Math.max(
    MEDIA_MODEL_POPOVER_VIEWPORT_GAP,
    viewportWidth - width - MEDIA_MODEL_POPOVER_VIEWPORT_GAP,
  );
  if (!bounds) {
    return {
      left: Math.min(Math.max(requestedLeft, viewportLeft), viewportRight),
      width,
    };
  }
  const boundsWidth = Math.max(0, bounds.right - bounds.left);
  if (boundsWidth < width) {
    const chatIsOnLeft = bounds.left <= viewportWidth / 2;
    return {
      left: chatIsOnLeft ? bounds.left : bounds.right - width,
      width,
    };
  }
  const boundedLeft = bounds.left;
  const boundedRight = bounds.right - width;
  return {
    left: Math.min(Math.max(requestedLeft, boundedLeft), boundedRight),
    width,
  };
}
function areSelectedMediaModelsEqual(left, right) {
  return MEDIA_CATEGORIES.every((category) => {
    const leftIds = left?.[category];
    const rightIds = right?.[category];
    if (leftIds === void 0 || rightIds === void 0) return leftIds === rightIds;
    if (leftIds.length !== rightIds.length) return false;
    const rightIdSet = new Set(rightIds);
    return leftIds.every((id2) => rightIdSet.has(id2));
  });
}
function isMiniMaxH3Model(model) {
  const values3 = [
    model.id,
    model.display_name,
    model.series_id,
    model.model_name,
    model.backend,
  ].map((value) => (typeof value === "string" ? value.toLowerCase() : ""));
  return values3.some(
    (value) =>
      value.includes("minimax-h3") ||
      value.includes("minimax h3") ||
      value.includes("hailuo03") ||
      value === "minimax_v3",
  );
}
function isMiniMaxH3MaxModel(model) {
  const values3 = [model.id, model.display_name, model.series_id].map((value) =>
    typeof value === "string" ? value.toLowerCase() : "",
  );
  return values3.some(
    (value) => value.includes("minimax-h3-max") || value.includes("minimax h3 max"),
  );
}
function isStandardMiniMaxH3Model(model) {
  return isMiniMaxH3Model(model) && !isMiniMaxH3MaxModel(model);
}
function orderVideoModelsWithMiniMaxH3First(models) {
  const h3Index = models.findIndex((model) => isStandardMiniMaxH3Model(model));
  const h3MaxIndexes = models
    .map((model, index2) => (isMiniMaxH3MaxModel(model) ? index2 : -1))
    .filter((index2) => index2 >= 0);
  const priorityIndexes = [h3Index, ...h3MaxIndexes].filter((index2) => index2 >= 0);
  if (priorityIndexes.length === 0) return [...models];
  const priorityIndexSet = new Set(priorityIndexes);
  return [
    ...priorityIndexes.map((index2) => models[index2]),
    ...models.filter((_2, index2) => !priorityIndexSet.has(index2)),
  ];
}
function buildMinimumVisibleMediaModelSelection(models) {
  const selection2 = {};
  for (const category of MEDIA_CATEGORIES) {
    const visibleModels = models.filter(
      (model) => model.type === category && model.visibility !== "hidden",
    );
    const preferred =
      category === "video"
        ? (visibleModels.find((model) => isStandardMiniMaxH3Model(model)) ??
          visibleModels.find((model) => isMiniMaxH3Model(model)) ??
          visibleModels[0])
        : visibleModels[0];
    if (preferred) selection2[category] = [preferred.id];
  }
  return selection2;
}
function selectMinimumVisibleMediaModelForCategory(selected2, category, models) {
  const minimum = buildMinimumVisibleMediaModelSelection(models)[category];
  if (!minimum) return selected2;
  return {
    ...selected2,
    [category]: minimum,
  };
}
function countVisibleSelectedMediaModelsForCategory(selected2, category, models) {
  return models.filter(
    (model) =>
      model.type === category &&
      model.visibility !== "hidden" &&
      isVisibleMediaModelSelected(selected2, model),
  ).length;
}
function selectAllVisibleModelsForCategory(selected2, category) {
  return {
    ...selected2,
    [category]: void 0,
  };
}
function isAllVisibleMediaModelsSelectedForCategory(selected2, category, models) {
  const visibleModels = models.filter(
    (model) => model.type === category && model.visibility !== "hidden",
  );
  return (
    visibleModels.length > 0 &&
    visibleModels.every((model) => isVisibleMediaModelSelected(selected2, model))
  );
}
const MEDIA_MODEL_TABS = ["agent", "video", "image", "audio"];
const DEFAULT_MEDIA_MODEL_TAB = "agent";
function pickBrandIcon(model, region = "overseas") {
  const id2 = model.id.toLowerCase();
  const series = model.series_id.toLowerCase();
  const name2 = model.display_name.toLowerCase();
  if (series === "g-image-2" || id2.startsWith("g-image"))
    return region === "domestic" ? GeneralImageIcon : GptImageDomesticIcon;
  if (series === "openai-image" || id2.startsWith("gpt-image"))
    return region === "domestic" ? GeneralImageIcon : GptImageOverseasIcon;
  if (series === "beta" || id2.startsWith("beta")) return VeoDomesticIcon;
  if (series === "veo3" || id2.startsWith("veo")) return VeoOverseasIcon;
  if (
    series === "banana" ||
    series === "nano-banana" ||
    id2.startsWith("banana") ||
    id2.startsWith("nano_banana")
  )
    return region === "domestic" ? GeneralImageIcon : NanoBananaIcon;
  if (series === "midjourney" || id2.startsWith("midjourney")) return MidjourneyIcon;
  if (series === "seedream" || id2.startsWith("doubao-seedream")) return SeedreamIcon;
  if (
    series === "seedance" ||
    series === "seedaudio" ||
    id2.includes("seedance") ||
    id2.includes("seed-audio")
  )
    return VeoDomesticIcon;
  if (
    series === "kling" ||
    series === "kling-image" ||
    id2.startsWith("kling") ||
    name2.startsWith("kling")
  )
    return KlingIcon;
  if (
    series === "minimax_v3" ||
    series.includes("hailuo03") ||
    id2.startsWith("minimax-h3") ||
    id2.startsWith("minimax h3") ||
    id2.includes("hailuo03") ||
    name2.includes("minimax h3") ||
    name2.includes("minimax-h3") ||
    name2.includes("hailuo03")
  )
    return MinimaxIcon;
  if (id2.startsWith("hilo") || id2.startsWith("hailuo")) return HailuoIcon;
  if (series === "wan" || id2.startsWith("wan")) return WanIcon;
  if (
    series === "minimax" ||
    series === "official-speech" ||
    series === "official-music" ||
    id2.startsWith("speech") ||
    id2.startsWith("music")
  )
    return MinimaxIcon;
  return null;
}
function getModelResolutionOptions(model) {
  return model.params?.resolution?.options ?? [];
}
function buildRegistryIndex(entries2) {
  const map3 = new Map();
  for (const entry of entries2) {
    for (const key2 of registrySelectionRowIds(entry)) {
      if (!map3.has(key2)) map3.set(key2, entry);
    }
    if (entry.name && !map3.has(entry.name)) map3.set(entry.name, entry);
  }
  return map3;
}
const REGISTRY_BY_TYPE = {
  image: buildRegistryIndex(IMAGE_MODELS),
  video: buildRegistryIndex(VIDEO_MODELS),
  audio: buildRegistryIndex(AUDIO_MODELS),
};
const legacyMidjourney = REGISTRY_BY_TYPE.image.get("midjourney-8.2");
if (legacyMidjourney) REGISTRY_BY_TYPE.image.set("midjourney", legacyMidjourney);
function lookupRegistryEntry(model) {
  const type2 = model.type;
  if (type2 !== "image" && type2 !== "video" && type2 !== "audio") return void 0;
  const byType = REGISTRY_BY_TYPE[type2];
  return byType.get(model.id) ?? byType.get(model.series_id) ?? byType.get(model.display_name);
}
function isMiniMaxH3RegistryEntry(entry) {
  const values3 = [entry.id, entry.name, entry.model_name, entry.backend].map((value) =>
    typeof value === "string" ? value.toLowerCase() : "",
  );
  return values3.some(
    (value) =>
      value.includes("minimax-h3") ||
      value.includes("minimax h3") ||
      value.includes("hailuo03") ||
      value === "minimax_v3",
  );
}
function formatDurationRange(options) {
  if (!options || options.length === 0) return void 0;
  if (options.length === 1) return `${options[0]}s`;
  const numbers = options
    .map((option2) => Number.parseFloat(option2))
    .filter((option2) => Number.isFinite(option2));
  if (numbers.length === 0) return void 0;
  const min2 = Math.min(...numbers);
  const max2 = Math.max(...numbers);
  return min2 === max2 ? `${min2}s` : `${min2}-${max2}s`;
}
function buildModelSubtitle(model) {
  const resolutionOptions = getModelResolutionOptions(model);
  if (model.type === "audio")
    return {
      resolutionOptions,
      audio: true,
    };
  const entry = lookupRegistryEntry(model);
  const subtitle = {
    resolutionOptions,
  };
  if (model.type === "video" && entry) {
    const params = entry.params ?? {};
    subtitle.duration = formatDurationRange(params.duration?.options);
    subtitle.audio =
      "generate_audio" in params ||
      "sound" in params ||
      isMiniMaxH3RegistryEntry(entry) ||
      (entry.max_audio_refs ?? 0) > 0;
  }
  if (subtitle.resolutionOptions.length === 0 && !subtitle.duration && !subtitle.audio) return null;
  return subtitle;
}
const HOME_POPOVER_GAP = 4;
const POPOVER_HEIGHT = 400;
function getInitialDraft(current2) {
  const draft = {};
  if (current2?.image !== void 0) draft.image = [...current2.image];
  if (current2?.video !== void 0) draft.video = [...current2.video];
  if (current2?.audio !== void 0) draft.audio = [...current2.audio];
  return draft;
}
function localizedCategoryLabel(cat, t2) {
  if (cat === "agent") return t2("chat.mediaModels.tabs.agent");
  return t2(`chat.mediaModels.tabs.${cat}`);
}
export function MediaModelSelector({
  open,
  placement = "above",
  anchorRef,
  current: current2,
  currentModelId,
  onCommit,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { openSettings } = useSettingsDialog();
  const agentModelMembership = useAgentModelMembershipAccess();
  const agentModels = useAgentModels(open);
  const [draftModelId, setDraftModelId] = reactExports.useState(null);
  const selectedAgentModel = draftModelId ?? currentModelId ?? agentModels.data?.default;
  const handleAgentModelSelect = reactExports.useCallback(
    (modelId) => {
      const model = agentModels.data?.models.find((candidate) =>
        agentModelMatchesSelection(candidate, modelId),
      );
      const access = resolveAgentModelAccess(model?.id, model?.access);
      if (!agentModelMembership.guardAccess(access, "chat.agent-model-select")) return;
      setDraftModelId(modelId);
    },
    [agentModels.data?.models, agentModelMembership.guardAccess],
  );
  const [activeTab, setActiveTab] = reactExports.useState(DEFAULT_MEDIA_MODEL_TAB);
  const activeMediaCategory =
    activeTab === "image" || activeTab === "video" || activeTab === "audio" ? activeTab : null;
  const [draft, setDraft] = reactExports.useState(() => getInitialDraft(current2));
  const rememberCheckboxId = reactExports.useId();
  const [rememberForNewChats, setRememberForNewChats] = reactExports.useState(true);
  const rememberScopeChangedRef = reactExports.useRef(false);
  const committedRef = reactExports.useRef(true);
  const commitDraft = reactExports.useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const mediaSelectionChanged = !areSelectedMediaModelsEqual(draft, getInitialDraft(current2));
    if (!mediaSelectionChanged && draftModelId === null && !rememberScopeChangedRef.current) {
      return;
    }
    const commitAll = rememberForNewChats || rememberScopeChangedRef.current;
    const agentSelectionChanged =
      draftModelId !== null && draftModelId !== (currentModelId ?? null);
    const selection2 = {};
    if (mediaSelectionChanged || commitAll) {
      selection2.media = draft;
    }
    if (!agentModels.isError && selectedAgentModel && (agentSelectionChanged || commitAll)) {
      if (agentSelectionChanged) {
        trackEvent(TRACK_EVENTS.CHAT_MODEL_CHANGE, {
          model_id: selectedAgentModel,
          source: placement === "below" ? "home_selector" : "workspace_selector",
        });
      }
      selection2.modelId = selectedAgentModel;
    }
    if (selection2.media !== void 0 || selection2.modelId !== void 0) {
      onCommit(selection2, rememberForNewChats);
    }
  }, [
    draft,
    draftModelId,
    rememberForNewChats,
    onCommit,
    selectedAgentModel,
    current2,
    currentModelId,
    agentModels.isError,
    placement,
  ]);
  reactExports.useLayoutEffect(() => {
    if (!open) return;
    committedRef.current = false;
    rememberScopeChangedRef.current = false;
    setRememberForNewChats(true);
  }, [open]);
  reactExports.useLayoutEffect(() => {
    if (!open) commitDraft();
  }, [open, commitDraft]);
  const handleClose = reactExports.useCallback(() => {
    commitDraft();
    onClose();
  }, [commitDraft, onClose]);
  const [position2, setPosition] = reactExports.useState(null);
  const popoverRef = reactExports.useRef(null);
  const { data: mediaModels, isPending, isError, isFetching, refetch } = useMediaModels();
  const visibleMediaModels = reactExports.useMemo(
    () => (mediaModels ?? []).filter((model) => model.visibility !== "hidden"),
    [mediaModels],
  );
  const modelTabOptions = reactExports.useMemo(
    () =>
      MEDIA_MODEL_TABS.map((tab2) => {
        const categoryLabel = localizedCategoryLabel(tab2, t2);
        if (tab2 === "agent" || isPending || isError) {
          return {
            value: tab2,
            label: categoryLabel,
            ariaLabel: categoryLabel,
            dataActionUiId: `chat-model-tab-${tab2}`,
          };
        }
        const count2 = countVisibleSelectedMediaModelsForCategory(draft, tab2, visibleMediaModels);
        return {
          value: tab2,
          ariaLabel: t2("chat.mediaModels.tabs.selectionCount", {
            category: categoryLabel,
            count: count2,
          }),
          label: (
            <span className="inline-flex min-w-0 items-center justify-center gap-1">
              <span className="truncate">{categoryLabel}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">{count2}</span>
            </span>
          ),
          dataActionUiId: `chat-model-tab-${tab2}`,
        };
      }),
    [draft, isError, isPending, t2, visibleMediaModels],
  );
  const handleRememberForNewChatsChange = reactExports.useCallback((checked) => {
    rememberScopeChangedRef.current = true;
    setRememberForNewChats(checked === true);
  }, []);
  reactExports.useEffect(() => {
    if (open) {
      setDraft(getInitialDraft(current2));
      setDraftModelId(null);
    }
  }, [open, current2, currentModelId]);
  reactExports.useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    if (!anchorRef.current) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const inputRoot = anchorRef.current?.closest("[data-message-input-root]");
      const inputRect = inputRoot?.getBoundingClientRect() ?? rect;
      const chatPane = anchorRef.current?.closest('[data-workspace-pane="chat"]');
      const chatPaneRect = chatPane?.getBoundingClientRect();
      const chatBounds =
        placement === "above" && chatPaneRect && chatPaneRect.width > 0
          ? {
              left: chatPaneRect.left,
              right: chatPaneRect.right,
            }
          : void 0;
      const horizontalLayout = getMediaModelPopoverHorizontalLayout(
        placement === "below"
          ? {
              left: inputRect.left,
              width: inputRect.width,
            }
          : {
              left: rect.left,
              width: rect.width,
            },
        window.innerWidth,
        placement === "below" ? "start" : "center",
        chatBounds,
      );
      const top2 = placement === "below" ? inputRect.bottom + HOME_POPOVER_GAP : 0;
      const bottom = placement === "above" ? window.innerHeight - rect.top + 4 : void 0;
      const height =
        placement === "below"
          ? Math.max(120, Math.min(POPOVER_HEIGHT, window.innerHeight - top2 - 16))
          : POPOVER_HEIGHT;
      const nextTop = placement === "below" ? top2 : void 0;
      const nextLeft = horizontalLayout.left;
      const width = horizontalLayout.width;
      setPosition((prev) =>
        prev &&
        prev.left === nextLeft &&
        prev.top === nextTop &&
        prev.bottom === bottom &&
        prev.height === height &&
        prev.width === width &&
        prev.placement === placement
          ? prev
          : {
              left: nextLeft,
              top: nextTop,
              bottom,
              height,
              width,
              placement,
            },
      );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, placement]);
  reactExports.useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      handleClose();
    };
    const onKeyDown = (e2) => {
      if (e2.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose, anchorRef]);
  const tabModels = reactExports.useMemo(() => {
    if (!activeMediaCategory) return [];
    const models = visibleMediaModels.filter((m3) => m3.type === activeMediaCategory);
    if (activeMediaCategory !== "video") return models;
    return orderVideoModelsWithMiniMaxH3First(models);
  }, [visibleMediaModels, activeMediaCategory]);
  const toggleModel = reactExports.useCallback(
    (category, modelId) => {
      setDraft((prev) => {
        const visibleModelsInCategory = visibleMediaModels.filter((m3) => m3.type === category);
        const visibleIdsInCat = visibleModelsInCategory.map((m3) => m3.id);
        if (visibleIdsInCat.length === 0) return prev;
        const currentChecked = visibleModelsInCategory
          .filter((model) => isVisibleMediaModelSelected(prev, model))
          .map((model) => model.id);
        const next2 = currentChecked.includes(modelId)
          ? currentChecked.filter((id2) => id2 !== modelId)
          : [...currentChecked, modelId];
        if (next2.length === 0) {
          dedupedToast.info(t2("chat.mediaModels.hint.atLeastOne"));
          return prev;
        }
        const allVisibleChecked =
          next2.length === visibleIdsInCat.length &&
          visibleIdsInCat.every((id2) => next2.includes(id2));
        if (allVisibleChecked) {
          return {
            ...prev,
            [category]: void 0,
          };
        }
        return {
          ...prev,
          [category]: next2,
        };
      });
    },
    [visibleMediaModels, t2],
  );
  const selectAllInActiveTab = reactExports.useCallback(() => {
    if (!activeMediaCategory) return;
    setDraft((previous2) => selectAllVisibleModelsForCategory(previous2, activeMediaCategory));
  }, [activeMediaCategory]);
  const clearAllInActiveTab = reactExports.useCallback(() => {
    if (!activeMediaCategory) return;
    dedupedToast.info(t2("chat.mediaModels.hint.keptFirst"));
    setDraft((previous2) =>
      selectMinimumVisibleMediaModelForCategory(previous2, activeMediaCategory, visibleMediaModels),
    );
  }, [activeMediaCategory, visibleMediaModels, t2]);
  const allSelected =
    activeMediaCategory !== null &&
    isAllVisibleMediaModelsSelectedForCategory(draft, activeMediaCategory, visibleMediaModels);
  const releaseRegion = getRuntimeConfig().region;
  const handleOpenPricing = () => {
    const creditRulesRegion = releaseRegion === "domestic" ? "domestic" : "overseas";
    void openExternalUrl(platform2, getHailuoCreditsRulesUrl(creditRulesRegion), {
      source: "chat.model-picker.pricing",
    });
    handleClose();
  };
  const handleConfigureCustom = () => {
    handleClose();
    openSettings("models");
  };
  const popover = (
    <QuickZoomPresence value={open ? position2 : null}>
      {(position22, motionProps) =>
        reactDomExports.createPortal(
          <div
            {...motionProps}
            ref={(element2) => {
              popoverRef.current = element2;
              motionProps.ref.current = element2;
            }}
            inert={!open}
            aria-hidden={!open || void 0}
            role="dialog"
            aria-label={t2("chat.mediaModels.title")}
            style={{
              position: "fixed",
              left: position22.left,
              top: position22.top,
              bottom: position22.bottom,
              width: position22.width,
              height: position22.height,
              zIndex: 50,
            }}
            className={`dp-motion-quick-zoom elevated-surface-border bg-popover rounded-xl shadow-lg flex flex-col p-1.5 overflow-hidden ${position22.placement === "below" ? "[--dp-quick-zoom-origin:top]" : "[--dp-quick-zoom-origin:bottom]"}`}
          >
            <CapabilityPopoverHeader
              title={t2("chat.mediaModels.title")}
              description={t2("chat.mediaModels.selectionDescription")}
              trailing={
                <Button$1
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleConfigureCustom}
                  data-action-ui-id="chat-model-configure-custom"
                  className="text-muted-foreground"
                >
                  <Icon icon={PencilLine} size="sm" strokeWidth={1.5} />
                  {t2("chat.mediaModels.custom.configure")}
                </Button$1>
              }
            />
            <SegmentedSwitch
              value={activeTab}
              onValueChange={setActiveTab}
              ariaLabel={t2("chat.mediaModels.title")}
              dataActionUiId="chat-model-tabs"
              thumbDataSlot="chat-model-tabs-thumb"
              variant="label"
              gap="xs"
              stretch={true}
              className="media-model-tabs mb-1"
              itemClassName="px-1.5 hover:!bg-tab-active-bg/80"
              options={modelTabOptions}
            />
            {activeTab === "agent" ? (
              <div className="-mr-1 flex-1 overflow-y-auto pr-1">
                {agentModels.isPending && (
                  <div className="px-2 py-6 text-center text-xs text-muted-foreground">…</div>
                )}
                {agentModels.isError && (
                  <div className="flex flex-col items-center gap-2 px-2 py-6 text-xs text-destructive">
                    <span>{t2("chat.mediaModels.loadFailed")}</span>
                    <button
                      type="button"
                      data-action-ui-id="chat-agent-model-retry"
                      disabled={agentModels.isFetching}
                      onClick={() => void agentModels.refetch()}
                      className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted disabled:opacity-50"
                    >
                      {t2("common.retry")}
                    </button>
                  </div>
                )}
                {!agentModels.isPending &&
                  !agentModels.isError &&
                  !agentModels.data?.models.length && (
                    <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                      {t2("chat.mediaModels.empty")}
                    </div>
                  )}
                {!agentModels.isError &&
                  agentModels.data?.models.map((model) => {
                    const access = resolveAgentModelAccess(model.id, model.access);
                    return (
                      <div key={model.id}>
                        <AgentModelRow
                          model={model.id}
                          displayName={model.name}
                          display={model.display}
                          membershipRequired={
                            access?.requirement === "membership" &&
                            agentModelMembership.membershipState === "non-member"
                          }
                          selected={agentModelMatchesSelection(model, selectedAgentModel)}
                          onSelect={(id2) =>
                            handleAgentModelSelect(
                              agentModelMatchesSelection(model, selectedAgentModel)
                                ? (selectedAgentModel ?? id2)
                                : id2,
                            )
                          }
                        />
                        {agentModelMatchesSelection(model, selectedAgentModel) &&
                          Boolean(model.reasoningLevels?.length) && (
                            <AgentReasoningSelector
                              model={model}
                              selectedId={selectedAgentModel}
                              onSelect={handleAgentModelSelect}
                            />
                          )}
                      </div>
                    );
                  })}
              </div>
            ) : !activeMediaCategory ? null : (
              <>
                <div className="flex h-7 shrink-0 items-center justify-between px-2">
                  <span className="text-[11px] font-medium leading-4 text-muted-foreground">
                    {t2("chat.mediaModels.generationModels")}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{t2("chat.mediaModels.selectAll")}</span>
                    <Switch
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        checked ? selectAllInActiveTab() : clearAllInActiveTab()
                      }
                      data-action-ui-id="chat-model-select-all-toggle"
                      className="origin-right scale-75"
                    />
                  </div>
                </div>
                <div className="-mr-1 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15 [&::-webkit-scrollbar-thumb:hover]:bg-foreground/30">
                  {isPending && (
                    <div className="px-2 py-6 text-center text-xs text-muted-foreground">…</div>
                  )}
                  {!isPending && isError && (
                    <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-xs text-destructive">
                      <span>{t2("chat.mediaModels.loadFailed")}</span>
                      <button
                        type="button"
                        data-action-ui-id="chat-model-registry-retry"
                        disabled={isFetching}
                        onClick={() => void refetch()}
                        className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t2("common.retry")}
                      </button>
                    </div>
                  )}
                  {!isPending && !isError && tabModels.length === 0 && (
                    <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                      {t2("chat.mediaModels.empty")}
                    </div>
                  )}
                  {!isPending &&
                    !isError &&
                    tabModels.map((model) => (
                      <ModelRow
                        key={model.id}
                        model={model}
                        category={activeMediaCategory}
                        checked={isVisibleMediaModelSelected(draft, model)}
                        onToggle={toggleModel}
                      />
                    ))}
                </div>
              </>
            )}
            <div className="mt-1 flex h-10 shrink-0 items-center justify-between border-t border-border px-2">
              <label
                htmlFor={rememberCheckboxId}
                className="hilo-checkbox-label flex cursor-pointer items-center text-xs text-muted-foreground"
              >
                <Checkbox
                  id={rememberCheckboxId}
                  checked={rememberForNewChats}
                  onCheckedChange={handleRememberForNewChatsChange}
                  data-action-ui-id="chat-model-remember-default"
                  size="sm"
                />
                <span>{t2("chat.mediaModels.scope.currentAndFuture")}</span>
              </label>
              <button
                type="button"
                onClick={handleOpenPricing}
                data-action-ui-id="chat-model-pricing"
                className="inline-flex items-center gap-0.5 rounded-md py-1 pl-1.5 pr-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {t2("chat.mediaModels.pricing")}
                <Icon icon={ArrowUpRight} size="sm" strokeWidth={2} />
              </button>
            </div>
          </div>,
          document.body,
        )
      }
    </QuickZoomPresence>
  );
  return popover;
}
const ModelRow = reactExports.memo(function ModelRow2({ model, category, checked, onToggle }) {
  const { t: t2 } = useTranslation();
  const subtitle = buildModelSubtitle(model);
  const promotion = model.promotion;
  const isNewModel = isMiniMaxH3Model(model);
  const promotionTagLabel = promotion?.toastTitle?.trim();
  const modelHoverDescription = isMiniMaxH3MaxModel(model)
    ? model.id.toLowerCase().includes("h3-max-turbo")
      ? t2("canvas.minimaxH3MaxTurbo.hoverDescription", {
          defaultValue:
            "H3 Max Turbo supports text-to-video and image-to-video, but not omnireference.",
        })
      : t2("canvas.minimaxH3Max.hoverDescription", {
          defaultValue:
            "H3 Max is a video generation model post-trained by fal.ai on MiniMax H3 and optimized for high-speed generation. It supports omnireference, text-to-video, and image-to-video.",
        })
    : void 0;
  const handleToggle = reactExports.useCallback(
    () => onToggle(category, model.id),
    [onToggle, category, model.id],
  );
  const row = (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={checked}
      data-action-ui-id={`chat-model-row-${model.id}`}
      className="list-row-hit-area mt-0.5 before:-top-0.5 before:bottom-0 first:before:top-0 flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-foreground transition-colors duration-150 first:mt-0 hover:bg-popup-item-hover"
    >
      <span
        data-model-icon-tile={true}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--model-selector-icon-border)] bg-transparent [border-width:var(--divider-width)]"
      >
        <span className="flex items-center justify-center text-foreground opacity-60">
          <ModelIcon model={model} size={20} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="flex items-center gap-1 min-w-0">
          <span className="truncate text-[14px] font-normal leading-5 text-foreground">
            {model.display_name}
          </span>
          {isNewModel && (
            <span
              data-action-ui-id="chat-model-new-tag"
              className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-medium leading-none text-background"
            >
              {t2("canvas.modelNew", {
                defaultValue: "New",
              })}
            </span>
          )}
          {isPromotionActive(promotion) && promotionTagLabel && (
            <span
              title={promotionTagLabel}
              data-action-ui-id="chat-model-promotion-tag"
              className="shrink-0 max-w-[140px] truncate rounded-md bg-brand-accent px-1.5 py-0.5 text-[11px] font-medium leading-none text-brand-accent-foreground"
            >
              {promotionTagLabel}
            </span>
          )}
          {model.hot && (
            <span className="shrink-0 px-1 py-0.5 rounded-sm bg-badge-hot-bg text-badge-hot-fg text-[10px] font-heading font-medium leading-none">
              {t2("chat.mediaModels.hot")}
            </span>
          )}
        </span>
        <ModelSubtitleRow subtitle={subtitle} fallback={model.description} />
      </span>
      {checked && (
        <span className="shrink-0 ml-auto self-center size-4 flex items-center justify-center text-foreground">
          <Check size={14} strokeWidth={2} />
        </span>
      )}
    </button>
  );
  if (!modelHoverDescription) return row;
  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent side="right" className="max-w-[320px] whitespace-normal leading-5">
        {modelHoverDescription}
      </TooltipContent>
    </Tooltip>
  );
});
ModelRow.displayName = "ModelRow";
const ModelSubtitleRow = reactExports.memo(function ModelSubtitleRow2({ subtitle, fallback }) {
  if (!subtitle) {
    return fallback ? (
      <span className="text-[12px] leading-4 text-muted-foreground truncate">{fallback}</span>
    ) : null;
  }
  const resolutionRange = formatResolutionRange(subtitle.resolutionOptions);
  return (
    <span className="text-[12px] leading-4 text-muted-foreground flex items-center gap-1.5 truncate">
      {resolutionRange && <span>{resolutionRange}</span>}
      {resolutionRange && subtitle.duration && (
        <span aria-hidden={true} className="w-px h-2.5 bg-foreground/15" />
      )}
      {subtitle.duration && (
        <span className="flex items-center gap-0.5">
          <ClockIcon$1 />
          <span>{subtitle.duration}</span>
        </span>
      )}
      {(resolutionRange || subtitle.duration) && subtitle.audio && (
        <span aria-hidden={true} className="w-px h-2.5 bg-foreground/15" />
      )}
      {subtitle.audio && <SpeakerIcon />}
    </span>
  );
});
ModelSubtitleRow.displayName = "ModelSubtitleRow";
const ModelIcon = reactExports.memo(function ModelIcon22({ model, size: size2 = 16 }) {
  const [errored, setErrored] = reactExports.useState(false);
  const releaseRegion = getRuntimeConfig().region;
  const BrandIcon = reactExports.useMemo(
    () => pickBrandIcon(model, releaseRegion),
    [model, releaseRegion],
  );
  if (BrandIcon) {
    return <BrandIcon size={size2} />;
  }
  if (model.icon_url && !errored) {
    return (
      <img
        src={model.icon_url}
        alt=""
        aria-hidden="true"
        onError={() => setErrored(true)}
        className={size2 === 20 ? "size-5 object-contain" : "size-4 object-contain"}
      />
    );
  }
  return <FallbackIcon type={model.type} size={size2} />;
});
ModelIcon.displayName = "ModelIcon";
function FallbackIcon({ type: type2, size: size2 = 16 }) {
  switch (type2) {
    case "image":
      return <ImageOutlineIcon size={size2} strokeWidth={1.5} />;
    case "video":
      return <Video size={size2} strokeWidth={1.5} />;
    case "audio":
      return <Music size={size2} strokeWidth={1.5} />;
    default:
      return <ImageOutlineIcon size={size2} strokeWidth={1.5} />;
  }
}
export const ChatToolbar = reactExports.memo(function ChatToolbar2({
  addFromLocal,
  attachmentAccept,
  uploading,
  interactionLocked = false,
  busy,
  running: running2,
  triggerSlash,
  skillTriggerRef,
  selectedModelId,
  selectedMediaModels,
  onModelSelectionChange,
  requestAssetSource,
  skillLabel,
  hideMediaModelSelector = false,
  showModelSelector = true,
  showSkillSelector = true,
}) {
  const { t: t2 } = useTranslation();
  const actionsCompact = useComposerActionsCompact();
  const fileInputRef = reactExports.useRef(null);
  const attachmentButtonRef = reactExports.useRef(null);
  const modelButtonRef = reactExports.useRef(null);
  const [modelPickerOpen, setModelPickerOpen] = reactExports.useState(false);
  const { data: mediaModels } = useMediaModels();
  const controlsLocked = busy || running2 || interactionLocked;
  const modelSelectorVisible = showModelSelector && !hideMediaModelSelector;
  const attachmentOnly = !modelSelectorVisible && !showSkillSelector;
  reactExports.useEffect(() => {
    if (actionsCompact || controlsLocked) setModelPickerOpen(false);
  }, [actionsCompact, controlsLocked]);
  const handleFileChange = reactExports.useCallback(
    (e2) => {
      const selected2 = e2.target.files;
      if (selected2 && selected2.length > 0) {
        addFromLocal(selected2);
      }
      e2.target.value = "";
    },
    [addFromLocal],
  );
  const handleOpenFilePicker = reactExports.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const { requestAttachmentPicker, attachmentFaceNoticeDialog } =
    useAttachmentFaceNoticeGate(handleOpenFilePicker);
  const handleAttachmentClick = reactExports.useCallback(() => {
    const anchor = attachmentButtonRef.current;
    if (requestAssetSource && anchor) {
      requestAssetSource(anchor, requestAttachmentPicker);
      return;
    }
    requestAttachmentPicker();
  }, [requestAssetSource, requestAttachmentPicker]);
  const handleModelToggle = reactExports.useCallback(() => {
    if (controlsLocked) return;
    setModelPickerOpen((v2) => !v2);
  }, [controlsLocked]);
  const handleModelCommit = reactExports.useCallback(
    (next2, rememberForNewChats) => {
      if (controlsLocked) return;
      onModelSelectionChange(next2, rememberForNewChats);
    },
    [controlsLocked, onModelSelectionChange],
  );
  const handleModelClose = reactExports.useCallback(() => {
    setModelPickerOpen(false);
  }, []);
  const allVisibleModelsSelected =
    !selectedMediaModels ||
    !mediaModels ||
    isAllVisibleMediaModelsSelected(selectedMediaModels, mediaModels);
  const selectedModelCount =
    selectedMediaModels && mediaModels
      ? countVisibleSelectedMediaModels(selectedMediaModels, mediaModels)
      : 0;
  const buttonLabel =
    allVisibleModelsSelected || selectedModelCount === 0
      ? t2("chat.mediaModels.label")
      : `${t2("chat.mediaModels.label")} · ${selectedModelCount}`;
  const modelButton = (
    <button
      ref={modelButtonRef}
      type="button"
      data-action-ui-id="chat-model-btn"
      data-selected-media-model-auto={allVisibleModelsSelected ? "true" : "false"}
      data-selected-media-model-count={selectedModelCount}
      data-selected-media-models={JSON.stringify(selectedMediaModels ?? {})}
      onClick={handleModelToggle}
      aria-disabled={controlsLocked}
      aria-label={buttonLabel}
      title={buttonLabel}
      disabled={controlsLocked}
      className={`flex h-[var(--btn-height-sm)] shrink-0 min-w-0 max-w-full items-center gap-[var(--home-input-control-content-gap)] rounded-full px-[var(--home-input-toolbar-padding-x)] text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] transition-colors duration-75 group-data-[actions-compact=true]/composer:size-[var(--btn-height-sm)] group-data-[actions-compact=true]/composer:justify-center group-data-[actions-compact=true]/composer:gap-0 group-data-[actions-compact=true]/composer:p-0 ${controlsLocked ? "text-muted-foreground cursor-not-allowed" : "text-foreground/70 hover:text-foreground hover:bg-[var(--message-input-control-hover)] cursor-pointer"}`}
    >
      <Icon icon={Box} size="md" strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 truncate whitespace-nowrap group-data-[actions-compact=true]/composer:hidden">
        {buttonLabel}
      </span>
    </button>
  );
  return (
    <div
      data-attachment-only={attachmentOnly ? "true" : void 0}
      className={
        attachmentOnly ? "flex items-center" : "flex min-w-0 flex-1 items-center overflow-hidden"
      }
    >
      <button
        ref={attachmentButtonRef}
        type="button"
        data-action-ui-id="chat-attach-btn"
        onClick={handleAttachmentClick}
        disabled={busy || uploading}
        aria-label={t2("chat.addFile")}
        title={t2("chat.addFile")}
        className={
          attachmentOnly
            ? "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors duration-75 hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            : "mr-1 flex size-[var(--btn-height-sm)] shrink-0 items-center justify-center rounded-full bg-[var(--message-input-attachment-bg)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-attachment-bg-hover)] hover:text-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        }
      >
        {attachmentOnly ? (
          <Icon icon={Paperclip} size="sm" strokeWidth={1.5} />
        ) : (
          <Plus size={16} strokeWidth={1.5} />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={attachmentAccept}
        multiple={true}
        className="hidden"
        onChange={handleFileChange}
      />
      {attachmentFaceNoticeDialog}
      {modelSelectorVisible && (
        <div data-composer-optional={true} className="contents">
          <div data-model-control-slot="true" className="flex min-w-0 items-center">
            {controlsLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={modelButton} />
                  <TooltipContent side="top">{t2("chat.mediaModels.busyTooltip")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              modelButton
            )}
          </div>
        </div>
      )}
      {modelSelectorVisible && showSkillSelector && (
        <span
          aria-hidden={true}
          className="mx-1 h-3 w-[var(--home-input-toolbar-divider-width)] shrink-0 bg-foreground/15"
        />
      )}
      {showSkillSelector && (
        <button
          ref={skillTriggerRef}
          type="button"
          data-action-ui-id="chat-skill-btn"
          onClick={triggerSlash}
          disabled={interactionLocked}
          aria-label={skillLabel ?? t2("skills.popover.buttonLabel")}
          title={skillLabel ?? t2("skills.popover.buttonLabel")}
          className="flex h-[var(--btn-height-sm)] shrink-0 items-center gap-[var(--home-input-control-content-gap)] whitespace-nowrap rounded-full px-[var(--home-input-toolbar-padding-x)] text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground cursor-pointer group-data-[actions-compact=true]/composer:size-[var(--btn-height-sm)] group-data-[actions-compact=true]/composer:justify-center group-data-[actions-compact=true]/composer:gap-0 group-data-[actions-compact=true]/composer:p-0"
        >
          <SkillIcon size={16} strokeWidth={1.5} className="shrink-0" />
          <span className="group-data-[actions-compact=true]/composer:hidden">
            {skillLabel ?? t2("skills.popover.buttonLabel")}
          </span>
        </button>
      )}
      {modelSelectorVisible && (
        <MediaModelSelector
          open={modelPickerOpen && !controlsLocked}
          anchorRef={modelButtonRef}
          currentModelId={selectedModelId}
          current={selectedMediaModels}
          onCommit={handleModelCommit}
          onClose={handleModelClose}
        />
      )}
    </div>
  );
});
ChatToolbar.displayName = "ChatToolbar";
export function useChatToolbar({
  busy,
  running: running2,
  selectedModelId,
  selectedMediaModels,
  onModelSelectionChange,
  skillLabel,
  hideMediaModelSelector,
}) {
  return reactExports.useCallback(
    (context) => (
      <ChatToolbar
        {...context}
        busy={busy}
        running={running2}
        selectedModelId={selectedModelId}
        selectedMediaModels={selectedMediaModels}
        onModelSelectionChange={onModelSelectionChange}
        skillLabel={skillLabel}
        hideMediaModelSelector={hideMediaModelSelector}
      />
    ),
    [
      busy,
      running2,
      selectedModelId,
      selectedMediaModels,
      onModelSelectionChange,
      skillLabel,
      hideMediaModelSelector,
    ],
  );
}
const LOOP_GUARD_SETTLEMENT_ACK_TIMEOUT_MS = 5e3;
const RECORDED_SETTLEMENT_LIMIT = 256;
export function useLoopGuardSettlement({
  messages: messages2,
  isPresented,
  focusedSessionId,
  onRejectedSettlement,
  onConflictingSettlement,
  onAckTimeout,
}) {
  const submissionsRef = reactExports.useRef(new Map());
  const recordedSettlementIdsRef = reactExports.useRef(new Set());
  const isPresentedRef = reactExports.useRef(isPresented);
  const focusedSessionIdRef = reactExports.useRef(focusedSessionId);
  const rejectedSettlementRef = reactExports.useRef(onRejectedSettlement);
  const conflictingSettlementRef = reactExports.useRef(onConflictingSettlement);
  const ackTimeoutRef = reactExports.useRef(onAckTimeout);
  const [submittingIds, setSubmittingIds] = reactExports.useState(() => new Set());
  isPresentedRef.current = isPresented;
  focusedSessionIdRef.current = focusedSessionId;
  rejectedSettlementRef.current = onRejectedSettlement;
  conflictingSettlementRef.current = onConflictingSettlement;
  ackTimeoutRef.current = onAckTimeout;
  const removeSubmission = reactExports.useCallback((requestId) => {
    const submission = submissionsRef.current.get(requestId);
    if (!submission) return void 0;
    clearTimeout(submission.timer);
    submissionsRef.current.delete(requestId);
    setSubmittingIds((current2) => {
      if (!current2.has(requestId)) return current2;
      const next2 = new Set(current2);
      next2.delete(requestId);
      return next2;
    });
    return submission;
  }, []);
  const beginSubmission = reactExports.useCallback(
    (requestId, decision, sessionId) => {
      if (submissionsRef.current.has(requestId)) return false;
      const timer2 = setTimeout(() => {
        if (!removeSubmission(requestId)) return;
        if (isPresentedRef.current && focusedSessionIdRef.current === sessionId) {
          ackTimeoutRef.current();
        }
      }, LOOP_GUARD_SETTLEMENT_ACK_TIMEOUT_MS);
      submissionsRef.current.set(requestId, {
        decision,
        sessionId,
        timer: timer2,
      });
      setSubmittingIds((current2) => new Set(current2).add(requestId));
      return true;
    },
    [removeSubmission],
  );
  reactExports.useEffect(() => {
    for (const message2 of messages2.slice(-RECORDED_SETTLEMENT_LIMIT)) {
      if (message2.type !== "loop_guard_ask" || !message2.resolved || !message2.requestId) continue;
      if (
        message2.loopGuardSettlementCause &&
        !recordedSettlementIdsRef.current.has(message2.requestId)
      ) {
        recordedSettlementIdsRef.current.add(message2.requestId);
        while (recordedSettlementIdsRef.current.size > RECORDED_SETTLEMENT_LIMIT) {
          const oldest = recordedSettlementIdsRef.current.values().next().value;
          if (typeof oldest !== "string") break;
          recordedSettlementIdsRef.current.delete(oldest);
        }
        recordAction("chat:loop-guard-settled", {
          session_id: message2.loopGuardSessionId,
          cause: message2.loopGuardSettlementCause,
          decision: message2.loopGuardDecision ?? "unknown",
        });
      }
      const submission = removeSubmission(message2.requestId);
      if (!submission || !message2.loopGuardSettlementCause) {
        continue;
      }
      if (message2.loopGuardSettlementCause === "reply") {
        if (message2.loopGuardDecision && message2.loopGuardDecision !== submission.decision) {
          conflictingSettlementRef.current(message2.loopGuardDecision, submission.decision);
        }
        continue;
      }
      rejectedSettlementRef.current(message2.loopGuardSettlementCause, submission.decision);
    }
  }, [messages2, removeSubmission]);
  reactExports.useEffect(
    () => () => {
      for (const submission of submissionsRef.current.values()) {
        clearTimeout(submission.timer);
      }
      submissionsRef.current.clear();
    },
    [],
  );
  const isSubmitting = reactExports.useCallback(
    (requestId) => requestId !== void 0 && submittingIds.has(requestId),
    [submittingIds],
  );
  return {
    beginSubmission,
    isSubmitting,
  };
}
const RECLAIM_TTL_MS = RECONNECTING_STUCK_THRESHOLD_MS + 6e4;
export function useRuntimeMemoryReclaim() {
  const [reclaimed, setReclaimed] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (typeof hilo === "undefined") return;
    const unsubscribe = hilo.diagnostics.onRuntimeMemoryReclaim(() => {
      setReclaimed(true);
      clearTimer2();
      timerRef.current = setTimeout(() => setReclaimed(false), RECLAIM_TTL_MS);
    });
    return () => {
      unsubscribe();
      clearTimer2();
    };
  }, [clearTimer2]);
  return reclaimed;
}
function retainActiveEntries(previous2, activeIds2) {
  let changed = false;
  const next2 = {};
  for (const [requestId, value] of Object.entries(previous2)) {
    if (activeIds2.has(requestId)) next2[requestId] = value;
    else changed = true;
  }
  return changed ? next2 : previous2;
}
export function useToolConfirmEditState(pendingMessages, submittingIds) {
  const [edits, setEdits] = reactExports.useState({});
  const [approvalState, setApprovalState] = reactExports.useState({});
  const setEdit = reactExports.useCallback((requestId, args) => {
    setEdits((previous2) => ({
      ...previous2,
      [requestId]: args,
    }));
  }, []);
  const setApproval = reactExports.useCallback((requestId, state2) => {
    setApprovalState((previous2) => ({
      ...previous2,
      [requestId]: state2,
    }));
  }, []);
  const contextValue = reactExports.useMemo(
    () => ({
      edits,
      setEdit,
      approvalState,
      setApprovalState: setApproval,
      submittingIds,
    }),
    [approvalState, edits, setApproval, setEdit, submittingIds],
  );
  reactExports.useEffect(() => {
    const activeIds2 = new Set(
      pendingMessages
        .map((message2) => message2.requestId)
        .filter((requestId) => Boolean(requestId)),
    );
    setEdits((previous2) => retainActiveEntries(previous2, activeIds2));
    setApprovalState((previous2) => retainActiveEntries(previous2, activeIds2));
  }, [pendingMessages]);
  return {
    approvalState,
    contextValue,
    edits,
  };
}
const TOOL_LABEL_DEFINITIONS = {
  ...TOOL_LABEL_DEFINITIONS$1,
  browser: {
    i18nKey: "chat.toolLabel.browser",
  },
};
export const TODO_STATUS_ICON = {
  completed: "✅",
  in_progress: "⏳",
  pending: "⬜",
  cancelled: "❌",
};
const MAIN_AGENT_THINKING_TOOL_NAMES = new Set([
  "todowrite",
  "hub_search_knowledge",
  "hub_select_image_recipe",
]);
const TRANSIENT_TOOL_LABEL_KEYS = {
  hub_canvas_get_node: "chat.toolLabel.canvasGetNode",
  hub_canvas_list_nodes: "chat.toolLabel.canvasListNodes",
  hub_canvas_grep_text: "chat.toolLabel.canvasGrepText",
  hub_canvas_read_text: "chat.toolLabel.canvasReadText",
  hub_plan_get_stage_status: "chat.toolLabel.planGetStageStatus",
  hub_plan_get_stage_detail: "chat.toolLabel.planGetStageDetail",
  hub_plan_get_work_items: "chat.toolLabel.planGetWorkItems",
  hub_plan_patch_stage: "chat.toolLabel.planPatchStage",
  hub_plan_update_stage_state: "chat.toolLabel.planUpdateStageState",
  hub_memory: "chat.toolLabel.memory",
  hub_search_knowledge: "chat.toolLabel.searchKnowledge",
  hub_select_image_recipe: "chat.toolLabel.selectImageRecipe",
  hub_list_capabilities: "chat.toolLabel.listCapabilities",
  hub_report_outcome: "chat.toolLabel.reportOutcome",
  hub_list_comfyui_template: "chat.toolLabel.listComfyUiWorkflow",
  hub_list_comfyui_workflow: "chat.toolLabel.listComfyUiWorkflow",
  hub_get_comfyui_workflow: "chat.toolLabel.getComfyUiWorkflow",
  hub_run_comfyui_workflow: "chat.toolLabel.runComfyUiWorkflow",
  hub_get_comfyui_run_status: "chat.toolLabel.getComfyUiRunStatus",
};
export function isMainAgentThinkingTool(toolName2) {
  return !!toolName2 && MAIN_AGENT_THINKING_TOOL_NAMES.has(toolName2);
}
export function isTransientTool(toolName2) {
  return getToolLabelId(toolName2) === "transient";
}
export function getToolDisplayLabel(toolName2, t2) {
  const labelId = getToolLabelId(toolName2);
  if (labelId === "silent") return "";
  if (toolName2 && !getBuiltInToolLabelId(toolName2)) {
    const configured = getConfiguredToolDisplayLabel(toolName2);
    if (configured) return configured;
  }
  if (labelId === "connectorOp" && toolName2) {
    if (toolName2 === "hub_connector_authorize") return t2("connectors.oauth.connect");
    if (/^apify_/iu.test(toolName2)) return t2("chat.toolLabel.connector.apify");
    if (/^fastmoss(?:-mcp)?_/iu.test(toolName2)) return t2("chat.toolLabel.connector.fastmoss");
    if (/^shopify(?:-mcp)?_/iu.test(toolName2)) return t2("chat.toolLabel.connector.shopify");
    return toolName2;
  }
  if (labelId === "transient" && toolName2) {
    return t2(TRANSIENT_TOOL_LABEL_KEYS[toolName2] ?? TOOL_LABEL_DEFINITIONS.transient.i18nKey);
  }
  if (labelId === "askUser" && toolName2?.startsWith("hub_preview_")) {
    return t2("chat.toolLabel.askUser.preview");
  }
  return t2(TOOL_LABEL_DEFINITIONS[labelId].i18nKey);
}
const RUNNING_PHRASE_KEYS = {
  mediaGen: ["chat.toolPhrase.mediaGen.0", "chat.toolPhrase.mediaGen.1"],
  askUser: ["chat.toolPhrase.askUser.0"],
  canvasOp: ["chat.toolPhrase.canvasOp.0"],
  planOp: ["chat.toolPhrase.planOp.0"],
  spawnSubtask: ["chat.toolPhrase.spawnSubtask.0"],
  skillOp: ["chat.toolPhrase.skillOp.0"],
  searchInfo: ["chat.toolPhrase.searchInfo.0"],
  fileOp: ["chat.toolPhrase.fileOp.0"],
  contentProcess: ["chat.toolPhrase.contentProcess.0", "chat.toolPhrase.contentProcess.1"],
  browser: ["chat.toolPhrase.browser.0"],
  connectorOp: ["chat.toolPhrase.connectorOp.0"],
  transient: [],
  // silent never renders — empty pool. getRunningPhraseKeys falls back
  // gracefully for any caller that still asks.
  silent: [],
};
export function getRunningPhraseKeys(labelId, toolName2) {
  if (labelId === "askUser" && toolName2?.startsWith("hub_preview_")) {
    return [ASK_USER_PREVIEW_PHRASE_KEY];
  }
  return RUNNING_PHRASE_KEYS[labelId] ?? [];
}
const ASK_USER_PREVIEW_PHRASE_KEY = "chat.toolPhrase.askUser.preview.0";
export function filterSilentTools(messages2, getToolName) {
  return messages2.filter((msg) => {
    if (msg.type !== "tool") return true;
    const name2 = getToolName(msg);
    return getToolLabelId(name2) !== "silent";
  });
}
