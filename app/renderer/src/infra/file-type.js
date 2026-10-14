// 扩展名、MIME 和文件类型字形路径，加上 `classifyFileType`。
import { inferMediaKind } from "./media-lineage.js";

export const BODY = "M98.2014 38.8205L98.2662 45.3986V103.694C98.2662 107.132 96.9005 110.429 94.4697 112.86C92.0389 115.29 88.7421 116.656 85.3044 116.656H20.4955C17.0578 116.656 13.7609 115.29 11.3301 112.86C8.8993 110.429 7.53369 107.132 7.53369 103.694V12.9618C7.53369 9.5241 8.8993 6.22722 11.3301 3.79642C13.7609 1.36561 17.0578 0 20.4955 0H54.6822C57.7217 0 60.6576 1.06287 62.9907 3.00713L95.8747 30.4602C97.3459 31.6916 98.2014 33.5127 98.2014 35.4375V38.8141V38.8205Z";
export const FOLD = "M61.2405 4.17435C60.5923 3.62919 59.6022 4.08643 59.5969 4.93342L59.4548 27.6103C59.4538 28.6239 59.6531 29.6278 60.0412 30.5642C60.4294 31.5006 60.9987 32.3511 61.7165 33.0667C62.4344 33.7824 63.2866 34.3492 64.2241 34.7345C65.1617 35.1198 66.1662 35.316 67.1798 35.3119H95.5234C96.4565 35.3119 96.8812 34.1472 96.167 33.5466L61.2405 4.17435Z";
export const ARCHIVE_ZIPPER = "M11.1768 32.8037C12.1608 32.8037 12.9589 33.6009 12.959 34.585C12.959 35.569 12.1608 36.3672 11.1768 36.3672H6.47949V39.2822H11.1768C12.1608 39.2822 12.959 40.0804 12.959 41.0645C12.9589 42.0484 12.1608 42.8457 11.1768 42.8457H6.47949V46.0859H1.78223C0.79817 46.0859 -8.60288e-08 45.2878 0 44.3037C9.98125e-05 43.3197 0.798231 42.5225 1.78223 42.5225H6.47949V39.6064H1.78223C0.79817 39.6064 -8.60288e-08 38.8083 0 37.8242C0.000227585 36.8404 0.79831 36.043 1.78223 36.043H6.47949V32.8037H11.1768ZM11.1768 26C12.1608 26 12.959 26.7982 12.959 27.7822C12.9588 28.7661 12.1607 29.5635 11.1768 29.5635H6.47949V32.8037H1.78223C0.798182 32.8037 1.94808e-05 32.0055 0 31.0215C8.60291e-08 30.0374 0.79817 29.2393 1.78223 29.2393H6.47949V26H11.1768ZM6.79492 0C9.82327 0.000105874 12.3238 2.36775 12.4883 5.3916L12.9961 14.7529C13.1891 18.3098 10.3571 21.2997 6.79492 21.2998C3.23269 21.2998 0.400744 18.3099 0.59375 14.7529L1.10254 5.3916C1.26706 2.36773 3.76653 3.69844e-05 6.79492 0ZM6.79492 10.5C4.45169 10.5 2.55176 12.3999 2.55176 14.7432C2.55192 17.0863 4.45179 18.9853 6.79492 18.9854C9.13799 18.9852 11.0379 17.0862 11.0381 14.7432C11.0381 12.4 9.13809 10.5001 6.79492 10.5Z";
export const JPEG = "M15.9119 63.7994H20.071V75.8676C20.0653 76.9983 19.7955 77.9869 19.2614 78.8335C18.7273 79.6744 17.9886 80.3278 17.0455 80.7937C16.108 81.2596 15.0227 81.4926 13.7898 81.4926C12.6989 81.4926 11.7074 81.3023 10.8153 80.9216C9.92898 80.5409 9.22159 79.95 8.69318 79.1489C8.17045 78.3477 7.91193 77.3221 7.91761 76.0721H12.1193C12.1364 76.521 12.2216 76.9045 12.375 77.2227C12.5341 77.5352 12.7528 77.771 13.0312 77.9301C13.3097 78.0892 13.642 78.1687 14.0284 78.1687C14.4318 78.1687 14.7727 78.0835 15.0511 77.9131C15.3295 77.7369 15.5398 77.4784 15.6818 77.1375C15.8295 76.7966 15.9063 76.3733 15.9119 75.8676V63.7994ZM25.1195 81.254V63.7994H32.3297C33.6365 63.7994 34.7643 64.0551 35.7132 64.5665C36.6678 65.0721 37.4036 65.7795 37.9206 66.6886C38.4376 67.592 38.6962 68.6432 38.6962 69.842C38.6962 71.0466 38.432 72.1006 37.9036 73.004C37.3808 73.9017 36.6337 74.5977 35.6621 75.092C34.6905 75.5864 33.5371 75.8335 32.2018 75.8335H27.753V72.5096H31.4178C32.0541 72.5096 32.5854 72.3989 33.0115 72.1773C33.4433 71.9557 33.77 71.646 33.9916 71.2483C34.2132 70.8449 34.324 70.3761 34.324 69.842C34.324 69.3023 34.2132 68.8364 33.9916 68.4443C33.77 68.0466 33.4433 67.7398 33.0115 67.5239C32.5797 67.3079 32.0484 67.2 31.4178 67.2H29.3382V81.254H25.1195ZM43.1757 81.254V63.7994H55.3462V67.2256H47.3945V70.8051H54.724V74.2398H47.3945V77.8278H55.3462V81.254H43.1757ZM71.8428 69.5011C71.7462 69.1432 71.6041 68.8278 71.4166 68.5551C71.2291 68.2767 70.999 68.0409 70.7263 67.8477C70.4536 67.6545 70.1411 67.5096 69.7888 67.4131C69.4365 67.3108 69.0501 67.2596 68.6297 67.2596C67.7831 67.2596 67.0501 67.4642 66.4308 67.8733C65.8172 68.2824 65.3428 68.879 65.0075 69.6631C64.6723 70.4415 64.5047 71.3875 64.5047 72.5011C64.5047 73.6204 64.6666 74.575 64.9905 75.3648C65.3143 76.1545 65.7831 76.7568 66.3967 77.1716C67.0104 77.5864 67.7547 77.7937 68.6297 77.7937C69.4024 77.7937 70.0558 77.6687 70.5899 77.4187C71.1297 77.1631 71.5388 76.8023 71.8172 76.3364C72.0956 75.8704 72.2348 75.3221 72.2348 74.6915L73.0189 74.7852H68.7746V71.7085H76.3001V74.0182C76.3001 75.5807 75.9678 76.9187 75.303 78.0324C74.6439 79.146 73.7348 80.0011 72.5757 80.5977C71.4223 81.1943 70.0956 81.4926 68.5956 81.4926C66.9308 81.4926 65.4678 81.1318 64.2064 80.4102C62.945 79.6886 61.9621 78.6602 61.2575 77.325C60.553 75.9841 60.2007 74.3932 60.2007 72.5523C60.2007 71.1204 60.4138 69.8506 60.8399 68.7426C61.2661 67.629 61.8598 66.6858 62.6212 65.9131C63.3882 65.1403 64.2746 64.5551 65.2803 64.1574C66.2916 63.7596 67.3797 63.5608 68.5445 63.5608C69.5558 63.5608 70.4962 63.7057 71.3655 63.9954C72.2405 64.2852 73.0132 64.6943 73.6837 65.2227C74.3598 65.7511 74.9081 66.379 75.3286 67.1062C75.749 67.8335 76.0104 68.6318 76.1126 69.5011H71.8428Z";
export const FILE_TYPE_EXTENSIONS = {
  photoshop: ["psd", "psb"],
  vector: ["ai", "eps", "svg"],
  pdf: ["pdf"],
  document: ["doc", "docx", "odt", "rtf"],
  spreadsheet: ["xls", "xlsx", "csv", "ods"],
  presentation: ["ppt", "pptx", "key", "odp"],
  image: ["jpg", "jpeg", "png", "webp", "gif", "heic", "tiff", "bmp", "avif"],
  video: ["mp4", "mov", "webm", "avi", "mkv"],
  design: ["fig", "sketch"],
  audio: ["mp3", "wav", "aac", "flac", "ogg", "m4a"],
  archive: ["zip", "rar", "7z", "tar", "gz"],
  code: ["txt", "md", "json", "js", "ts", "html", "css", "py", "xml", "yaml"]
};
const extensions = new Map(Object.entries(FILE_TYPE_EXTENSIONS).flatMap(([category, values3]) => values3.map(ext => [ext, category])));
for (const ext of ["tsx", "jsx", "vue", "svelte", "go", "rs", "java", "c", "cpp", "h", "hpp", "rb", "php", "swift", "kt", "scala", "sh", "bash", "zsh", "scss", "less", "sass", "yml", "toml", "jsonc", "log", "mjs", "cjs", "kts", "cc", "cs", "fish", "sql", "htm", "lua", "dart", "r", "proto", "srt", "vtt", "ass", "ssa"]) extensions.set(ext, "code");
for (const ext of ["bz2", "xz", "tgz"]) extensions.set(ext, "archive");
for (const ext of ["heif", "tif", "ico"]) extensions.set(ext, "image");
extensions.set("htable", "spreadsheet");
const exactMime = {
  "application/pdf": "pdf",
  "image/vnd.adobe.photoshop": "psd",
  "application/vnd.adobe.photoshop": "psd",
  "image/svg+xml": "svg",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/json": "json",
  "application/zip": "zip"
};
function extensionOf$1(filename) {
  const leaf = filename?.split(/[\\/]/).pop() ?? "";
  if (leaf.includes("://") || filename?.includes("://")) return "";
  const dot2 = leaf.lastIndexOf(".");
  const extension2 = dot2 > 0 ? leaf.slice(dot2 + 1).toLowerCase() : "";
  return /^[a-z0-9][a-z0-9_-]*$/.test(extension2) ? extension2 : "";
}
function broadCategory(kind) {
  if (kind === "image" || kind === "video" || kind === "audio") return kind;
  if (kind === "text" || kind === "subtitle") return "code";
  return void 0;
}
export function classifyFileType({
  filename,
  mime,
  mediaKind: mediaKind2
}) {
  const extension2 = extensionOf$1(filename);
  const normalizedMime = mime?.split(";", 1)[0]?.trim().toLowerCase();
  const mimeExtension = normalizedMime ? exactMime[normalizedMime] : void 0;
  if (mimeExtension && !(normalizedMime === "text/plain" && extensions.get(extension2) === "code")) {
    return {
      category: extensions.get(mimeExtension) ?? "neutral",
      recognition: "known",
      typeLabel: mimeExtension.toUpperCase()
    };
  }
  const extensionCategory = extensions.get(extension2);
  const inferred = inferMediaKind(normalizedMime, extension2);
  const mimeCategory = normalizedMime && /^(image|video|audio)\//.test(normalizedMime) ? broadCategory(inferred) : void 0;
  const compatible = mimeCategory === extensionCategory || mimeCategory === "image" && (extensionCategory === "photoshop" || extensionCategory === "vector");
  if (mimeCategory && !compatible) {
    return {
      category: mimeCategory,
      recognition: "known",
      typeLabel: "FILE"
    };
  }
  const hostCategory = broadCategory(mediaKind2);
  const hostCompatible = hostCategory === extensionCategory || hostCategory === "image" && (extensionCategory === "photoshop" || extensionCategory === "vector") || hostCategory === "code" && (extensionCategory === "document" || extensionCategory === "spreadsheet");
  if (!mimeCategory && hostCategory && extensionCategory && !hostCompatible) {
    return {
      category: hostCategory,
      recognition: "known",
      typeLabel: "FILE"
    };
  }
  const category = extensionCategory ?? hostCategory ?? broadCategory(inferred);
  return {
    category: category ?? "neutral",
    recognition: category ? "known" : extension2 ? "unknown" : "missing",
    typeLabel: extension2.toUpperCase() || "FILE"
  };
}
