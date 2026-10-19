import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { classifyFileType } from "../infra/file-type.js";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { FileKindIcon } from "./use-composer-placeholder-actions.jsx";
import { FileTypeIcon } from "lucide-react";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export const MentionFileThumbnail = reactExports.memo(function MentionFileThumbnail2({ item, size: size2 = 24 }) {
  const gatewayUrl2 = useGatewayUrl();
  const url2 =
    item.kind === "image" || item.kind === "video"
      ? withThumbnail(
          gatewayUrl2(
            `${item.kind === "image" ? "/files/" : "/api/thumbnail/"}${item.path.split("/").map(encodeURIComponent).join("/")}`,
          ),
          size2,
        )
      : void 0;
  const [failedUrl, setFailedUrl] = reactExports.useState();
  const descriptor = classifyFileType({
    filename: item.path,
  });
  const media2 = ["image", "video", "audio"].includes(item.kind) && descriptor.category !== "photoshop";
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-sm ${media2 ? "bg-muted/40" : "bg-foreground/4"}`}
      style={{
        width: size2,
        height: size2,
      }}
    >
      {url2 && failedUrl !== url2 ? (
        <img
          src={url2}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="size-full object-cover"
          onError={() => setFailedUrl(url2)}
        />
      ) : media2 ? (
        <FileKindIcon kind={item.kind} className={`${size2 === 128 ? "size-8" : "size-4"} text-muted-foreground`} />
      ) : (
        <FileTypeIcon {...descriptor} size={size2 === 128 ? 48 : size2 === 20 ? 14 : 16} decorative={true} />
      )}
    </span>
  );
});

export const MentionThumb = MentionFileThumbnail;
