import { __jsx } from "../shared/jsx-runtime.js";
import { ImageOutlineIcon } from "../media-editing/package.jsx";
import { AudioFileIcon } from "./audio-file-icon.jsx";
import { File as File$3, Video as Video$2 } from "lucide-react";
export function AttachmentKindIcon({
  kind: kind2
}) {
  if (kind2 === "image") return <ImageOutlineIcon size={14} />;
  if (kind2 === "video") return <Video$2 size={14} />;
  if (kind2 === "audio") return <AudioFileIcon size={14} />;
  return <File$3 size={14} />;
}