// 全局搜索的常量：防抖、各类结果的权重与排序、分类与类型文案、文件扩展名、缩略图加载参数。
export const DEBOUNCE_MS = 200;
export const HUB_PROJECT_RESULT_LIMIT = 20;
export const CATEGORY_WEIGHT = {
  project: 80,
  hubProject: 84,
  session: 76,
  file: 72,
  canvas: 68,
  skill: 60,
  plugin: 58,
  command: 54,
  help: 44,
};
export const CATEGORY_ORDER = [
  "project",
  "hubProject",
  "session",
  "file",
  "canvas",
  "skill",
  "plugin",
  "command",
  "help",
];
export const CATEGORY_LABEL_KEYS = {
  project: "globalSearch.projects",
  hubProject: "globalSearch.hubProjects",
  session: "globalSearch.sessions",
  file: "globalSearch.files",
  canvas: "globalSearch.canvasNodes",
  skill: "globalSearch.skills",
  plugin: "globalSearch.plugins",
  command: "globalSearch.commands",
  help: "globalSearch.help",
};
export const CATEGORY_LABEL_FALLBACKS = {
  project: "Creation pages",
  hubProject: "Projects",
  session: "Sessions",
  file: "Files",
  canvas: "Canvas Nodes",
  skill: "Skills",
  plugin: "Plugins",
  command: "Commands",
  help: "Help",
};
export const CATEGORY_TYPE_LABEL_KEYS = {
  project: "globalSearch.type.project",
  hubProject: "globalSearch.type.hubProject",
  session: "globalSearch.type.session",
  file: "globalSearch.type.file",
  canvas: "globalSearch.type.canvas",
  skill: "globalSearch.type.skill",
  plugin: "globalSearch.type.plugin",
  command: "globalSearch.type.command",
  help: "globalSearch.type.help",
};
export const CATEGORY_TYPE_LABEL_FALLBACKS = {
  project: "Creation page",
  hubProject: "Project",
  session: "Session",
  file: "File",
  canvas: "Node",
  skill: "Skill",
  plugin: "Plugin",
  command: "Action",
  help: "Help",
};
export const PRIMARY_FILTERS = [
  {
    id: "all",
    labelKey: "globalSearch.filter.all",
    label: "All",
  },
  {
    id: "project",
    labelKey: "globalSearch.filter.projects",
    label: "Creation pages",
  },
  {
    id: "session",
    labelKey: "globalSearch.filter.sessions",
    label: "Sessions",
  },
  {
    id: "image",
    labelKey: "globalSearch.filter.images",
    label: "Images",
  },
  {
    id: "video",
    labelKey: "globalSearch.filter.videos",
    label: "Videos",
  },
  {
    id: "text",
    labelKey: "globalSearch.filter.text",
    label: "Text",
  },
  {
    id: "audio",
    labelKey: "globalSearch.filter.audio",
    label: "Audio",
  },
  {
    id: "file",
    labelKey: "globalSearch.filter.files",
    label: "File assets",
  },
  {
    id: "quickAction",
    labelKey: "globalSearch.filter.quickActions",
    label: "Quick actions",
  },
  {
    id: "hubProject",
    labelKey: "globalSearch.filter.hubProjects",
    label: "Projects",
  },
];
export const SEARCH_TRACK_IDLE_MS = 600;
export const MODAL_HANDOFF_CLOSE_DELAY_MS = 120;
export const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
  "ico",
  "tiff",
]);
export const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);
export const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "flac", "ogg"]);
export const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "html",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "xml",
  "yaml",
  "yml",
]);
export const THUMBNAIL_VISIBLE_ROOT_MARGIN = "96px 0px";
export const THUMBNAIL_STABLE_DELAY_MS = 240;
