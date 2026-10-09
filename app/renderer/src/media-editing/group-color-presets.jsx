// group-color-presets.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { PluginNodeInner } from "./plugin-node-inner.jsx";
import { FileNodeImpl } from "./file-node-impl.jsx";
import { PANORAMA_VIEWER_PLUGIN_ID } from "./resolve-panorama-generation-presentation.js";
import { PanoramaNode } from "./panorama-node.jsx";
import { __webpack_exports__, reactExports } from "../vendor.js";
import { areNodePropsEqual } from "../canvas/fullscreen-icon.jsx";

const pdfWorkerUrl =
  "" + new URL("../pdf.worker.min-yatZIOMy.mjs", import.meta.url).href;

var __webpack_exports__GlobalWorkerOptions =
  __webpack_exports__.GlobalWorkerOptions;

__webpack_exports__GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function FileNodeDispatcher(props) {
  const data2 = props.data;
  if (data2?.pluginId === PANORAMA_VIEWER_PLUGIN_ID)
    return <PanoramaNode {...props} />;
  const isPlugin = typeof data2?.pluginId === "string";
  return isPlugin ? (
    <PluginNodeInner {...props} />
  ) : (
    <FileNodeImpl {...props} />
  );
}

export const FileNode = reactExports.memo(
  FileNodeDispatcher,
  areNodePropsEqual,
);

export const GROUP_COLOR_PRESETS = {
  red: {
    swatch: "var(--canvas-group-swatch-red)",
    bg: "var(--canvas-group-fill-red)",
  },
  orange: {
    swatch: "var(--canvas-group-swatch-orange)",
    bg: "var(--canvas-group-fill-orange)",
  },
  yellow: {
    swatch: "var(--canvas-group-swatch-yellow)",
    bg: "var(--canvas-group-fill-yellow)",
  },
  green: {
    swatch: "var(--canvas-group-swatch-green)",
    bg: "var(--canvas-group-fill-green)",
  },
  cyan: {
    swatch: "var(--canvas-group-swatch-cyan)",
    bg: "var(--canvas-group-fill-cyan)",
  },
  blue: {
    swatch: "var(--canvas-group-swatch-blue)",
    bg: "var(--canvas-group-fill-blue)",
  },
  purple: {
    swatch: "var(--canvas-group-swatch-purple)",
    bg: "var(--canvas-group-fill-purple)",
  },
};
