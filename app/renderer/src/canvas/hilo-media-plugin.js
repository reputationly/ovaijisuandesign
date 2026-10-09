// hilo-media-plugin.js
import { CanvasNodeType, reactExports } from "../vendor.js";
import {
  AUDIO_CARD_SIZE,
  FILE_CARD_DEFAULT_SIZE,
  TABLE_CARD_DEFAULT_SIZE,
  TEXT_CARD_DEFAULT_SIZE,
} from "./compute-group-bounds-from-children.js";
import {
  IMAGE_CARD_MAX_WIDTH,
  VIDEO_CARD_MAX_WIDTH,
} from "./is-reexecutable-generation-node.js";
import { areNodePropsEqual } from "./fullscreen-icon.jsx";
import { VideoNodeInner } from "../media-editing/video-node-inner.jsx";
import { TextNode3 } from "../media-editing/video-tool-meta.jsx";
import { AudioNode } from "../media-editing/resolve-panorama-generation-presentation.js";
import { ImageNode } from "../media-editing/canvas-sticker-assets.jsx";
import { PlaceholderNode } from "../media-editing/create-column.jsx";
import { StickerNode } from "../media-editing/sticker-node-toolbar.jsx";
import { FileNode } from "../media-editing/group-color-presets.jsx";
import { TableNode } from "../text-editor/table-node-inner.jsx";
import { GroupNode } from "../media-editing/group-node-inner.jsx";
import { DerivationEdge } from "../text-editor/table-document-to-llm-content.js";

const VideoNode = reactExports.memo(VideoNodeInner, areNodePropsEqual);

const sharedPorts = [
  {
    id: "input",
    type: "input",
    maxConnections: -1,
  },
  {
    id: "output",
    type: "output",
    maxConnections: -1,
  },
];

const imageNodeDef = {
  type: CanvasNodeType.Image,
  label: "Image",
  defaultSize: {
    width: IMAGE_CARD_MAX_WIDTH,
    height: IMAGE_CARD_MAX_WIDTH,
  },
  ports: sharedPorts,
};

const videoNodeDef = {
  type: CanvasNodeType.Video,
  label: "Video",
  defaultSize: {
    width: VIDEO_CARD_MAX_WIDTH,
    height: VIDEO_CARD_MAX_WIDTH,
  },
  ports: sharedPorts,
};

const audioNodeDef = {
  type: CanvasNodeType.Audio,
  label: "Audio",
  defaultSize: AUDIO_CARD_SIZE,
  ports: sharedPorts,
};

const textNodeDef = {
  type: CanvasNodeType.Text,
  label: "Text",
  defaultSize: TEXT_CARD_DEFAULT_SIZE,
  ports: sharedPorts,
};

const fileNodeDef = {
  type: CanvasNodeType.File,
  label: "File",
  defaultSize: FILE_CARD_DEFAULT_SIZE,
  ports: sharedPorts,
};

const placeholderDef = {
  type: CanvasNodeType.Placeholder,
  label: "Generating",
  defaultSize: {
    width: 160,
    height: 156,
  },
  ports: sharedPorts,
};

const tableNodeDef = {
  type: CanvasNodeType.Table,
  label: "Table",
  defaultSize: TABLE_CARD_DEFAULT_SIZE,
  ports: sharedPorts,
};

const groupNodeDef = {
  type: CanvasNodeType.Group,
  label: "Group",
  defaultSize: {
    width: 400,
    height: 300,
  },
  // No ports — group nodes don't participate in derivation edges.
  ports: [],
};

const stickerNodeDef = {
  type: CanvasNodeType.Sticker,
  label: "Sticker",
  defaultSize: {
    width: 56,
    height: 56,
  },
  ports: [],
};

export const hiloMediaPlugin = {
  id: "hilo-media",
  name: "Hilo Media Nodes",
  version: "1.0.0",
  nodeTypes: [
    {
      definition: imageNodeDef,
      component: ImageNode,
    },
    {
      definition: videoNodeDef,
      component: VideoNode,
    },
    {
      definition: audioNodeDef,
      component: AudioNode,
    },
    {
      definition: textNodeDef,
      component: TextNode3,
    },
    {
      definition: fileNodeDef,
      component: FileNode,
    },
    {
      definition: placeholderDef,
      component: PlaceholderNode,
    },
    {
      definition: tableNodeDef,
      component: TableNode,
    },
    {
      definition: groupNodeDef,
      component: GroupNode,
    },
    {
      definition: stickerNodeDef,
      component: StickerNode,
    },
  ],
  edgeTypes: [
    {
      type: "derivation",
      component: DerivationEdge,
    },
  ],
  contextMenuItems: [
    {
      id: "add-to-chat",
      label: "canvas.addToChat",
      icon: "message-square-plus",
      execute: () => {},
    },
    {
      id: "delete-selected",
      label: "common.delete",
      icon: "trash-2",
      execute: () => {},
    },
  ],
};
