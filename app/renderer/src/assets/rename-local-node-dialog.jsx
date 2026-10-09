// rename-local-node-dialog.jsx
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  Toggle$1,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { checkTextSafety } from "../workspace/asset-lineage-query-key.js";
import {
  Button$1,
  cn$2,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { Input3 } from "../infra/select-content.jsx";
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
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const trimmed = name2.trim();
  reactExports.useEffect(() => {
    if (open) return;
    setName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending2) return;
    setPending(true);
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(t2("rename.safetyBlocked"));
        return;
      }
      await onCreate(trimmed);
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }, [onCreate, onOpenChange, pending2, t2, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-action-ui-id="local-assets.new-folder-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("localAssets.newFolderTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t2("localAssets.newFolderTitle")}
          </DialogDescription>
        </DialogHeader>
        <Input3
          autoFocus={true}
          value={name2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t2("localAssets.newFolderPlaceholder")}
          placeholder={t2("localAssets.newFolderPlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button$1
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            disabled={!trimmed || pending2}
            onClick={() => void handleConfirm()}
          >
            {t2("common.confirm")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameLocalNodeDialog({ node: node2, onOpenChange, onRename }) {
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const { tail: extension2 } = splitFilename(node2?.name ?? "", node2?.kind);
  const fullName = buildRenamedFilename(node2?.name ?? "", name2, node2?.kind);
  reactExports.useEffect(() => {
    setName(splitFilename(node2?.name ?? "", node2?.kind).head);
    setPending(false);
  }, [node2]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!node2 || !fullName || pending2 || fullName === node2.name) return;
    setPending(true);
    try {
      await onRename(node2, fullName);
      onOpenChange(false);
    } catch (err) {
      const message2 = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        message2.includes("duplicate_name")
          ? t2("localAssets.renameDuplicate")
          : message2,
      );
    } finally {
      setPending(false);
    }
  }, [fullName, node2, onOpenChange, onRename, pending2, t2]);
  return (
    <Dialog open={node2 !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="local-assets.rename-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("localAssets.renameTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t2("localAssets.renameTitle")}
          </DialogDescription>
        </DialogHeader>
        <AssetRenameInput
          extension={extension2}
          data-action-ui-id="local-assets.rename-input"
          autoFocus={true}
          value={name2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t2("localAssets.renamePlaceholder")}
          placeholder={t2("localAssets.renamePlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button$1
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            disabled={!fullName || pending2 || fullName === node2?.name}
            onClick={() => void handleConfirm()}
          >
            {t2("common.confirm")}
          </Button$1>
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
      const data2 = await res.json();
      return (data2.anchored ?? []).filter((row) =>
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
  size: size2 = "default",
  ...props
}) {
  return (
    <Toggle$1
      data-slot="toggle"
      className={cn$2(
        toggleVariants({
          variant,
          size: size2,
          className,
        }),
      )}
      {...props}
    />
  );
}
