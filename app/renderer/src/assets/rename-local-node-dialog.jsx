// rename-local-node-dialog.jsx
import { API_PATHS, reactExports, Toggle$1 as TogglePrimitive, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { checkTextSafety } from "../workspace/asset-lineage-query-key.js";
import {
  Button,
  cn$2 as cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import {
  AssetRenameInput,
  buildRenamedFilename,
  FileTypeThumbnail,
  splitFilename,
} from "../canvas/uploading-assets.jsx";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";
import { toggleVariants } from "../infra/use-online.jsx";
export function NewLocalFolderDialog({ open, onOpenChange, onCreate }) {
  const { t: translate } = useTranslation();
  const [folderName, setName] = reactExports.useState("");
  const [pending, setPending] = reactExports.useState(false);
  const trimmed = folderName.trim();
  reactExports.useEffect(() => {
    if (open) return;
    setName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending) return;
    setPending(true);
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(translate("rename.safetyBlocked"));
        return;
      }
      await onCreate(trimmed);
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }, [onCreate, onOpenChange, pending, translate, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-action-ui-id="local-assets.new-folder-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {translate("localAssets.newFolderTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {translate("localAssets.newFolderTitle")}
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus={true}
          value={folderName}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={translate("localAssets.newFolderPlaceholder")}
          placeholder={translate("localAssets.newFolderPlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {translate("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!trimmed || pending}
            onClick={() => void handleConfirm()}
          >
            {translate("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function RenameLocalNodeDialog({ node, onOpenChange, onRename }) {
  const { t: translate } = useTranslation();
  const [nodeName, setName] = reactExports.useState("");
  const [pending, setPending] = reactExports.useState(false);
  const { tail: extension } = splitFilename(node?.name ?? "", node?.kind);
  const fullName = buildRenamedFilename(node?.name ?? "", nodeName, node?.kind);
  reactExports.useEffect(() => {
    setName(splitFilename(node?.name ?? "", node?.kind).head);
    setPending(false);
  }, [node]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!node || !fullName || pending || fullName === node.name) return;
    setPending(true);
    try {
      await onRename(node, fullName);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        message.includes("duplicate_name")
          ? translate("localAssets.renameDuplicate")
          : message,
      );
    } finally {
      setPending(false);
    }
  }, [fullName, node, onOpenChange, onRename, pending, translate]);
  return (
    <Dialog open={node !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="local-assets.rename-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {translate("localAssets.renameTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {translate("localAssets.renameTitle")}
          </DialogDescription>
        </DialogHeader>
        <AssetRenameInput
          extension={extension}
          data-action-ui-id="local-assets.rename-input"
          autoFocus={true}
          value={nodeName}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={translate("localAssets.renamePlaceholder")}
          placeholder={translate("localAssets.renamePlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {translate("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!fullName || pending || fullName === node?.name}
            onClick={() => void handleConfirm()}
          >
            {translate("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function useAnchorProjectAssets() {
  const scopedFetch = useGatewayFetch();
  return reactExports.useCallback(
    async (items) => {
      if (items.length === 0) return [];
      const res = await scopedFetch(API_PATHS.anchorProjectAsset, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
        }),
      });
      if (!res.ok) throw new Error(`Anchor failed: ${res.status}`);
      const data = await res.json();
      return (data.anchored ?? []).filter((row) =>
        Boolean(row?.path && row?.filename),
      );
    },
    [scopedFetch],
  );
}
export function useExternalFileDrop(rootDropProps, { enabled, onFiles }) {
  return reactExports.useMemo(() => {
    const isExternalFileDrag = (event) =>
      enabled &&
      event.dataTransfer.types.includes("Files") &&
      !event.dataTransfer.types.includes(RESOURCE_DRAG_MIME);
    return {
      ...rootDropProps,
      onDragOver: (event) => {
        if (!isExternalFileDrag(event)) {
          rootDropProps.onDragOver(event);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
      },
      onDrop: (event) => {
        if (!isExternalFileDrag(event)) {
          rootDropProps.onDrop(event);
          return;
        }
        event.stopPropagation();
        if (event.defaultPrevented) return;
        event.preventDefault();
        void onFiles([...event.dataTransfer.files]);
      },
    };
  }, [enabled, onFiles, rootDropProps]);
}
export function AssetRowThumb({ thumbSrc, filename, mime }) {
  const [failed, setFailed] = reactExports.useState(false);
  if (failed || !thumbSrc) {
    return <FileTypeThumbnail filename={filename} mime={mime} />;
  }
  return (
    <img
      src={thumbSrc}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className="size-5 shrink-0 rounded-sm border border-border object-cover"
    />
  );
}
export function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        toggleVariants({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    />
  );
}
