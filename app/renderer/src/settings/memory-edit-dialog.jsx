// memory-edit-dialog.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Label } from "../team/use-wallet-query.jsx";
import {
  BASE,
  expectOk,
  memoryQueryKeys,
  useMemoryEntry,
} from "./changelog-table.jsx";
import {
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  useMutation,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { Select } from "../assets/credit-query-keys.jsx";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import {
  DialogDescription,
  DialogTitle,
  Textarea,
} from "../infra/badge-variants.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import {
  ASSET_MODALITIES,
  MAX_MEMORY_BODY_BYTES,
  MAX_MEMORY_DESCRIPTION_LENGTH,
  MEMORY_TYPES,
} from "../generation/to-workspace-browser-url.js";
async function writeMemory(fetcher, payload) {
  const res = await fetcher(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  await expectOk(res);
  return await res.json();
}
function useMemoryWrite() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  return useMutation({
    mutationFn: (payload) => writeMemory(fetcher, payload),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
  });
}
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ASSET_URI_RE = /^hilo:\/\/asset\/[a-zA-Z0-9_-]+$/;
const DEFAULT_STATE = {
  scope: "project",
  name: "",
  type: "media-style",
  description: "",
  body: "",
  asset_uri: "",
  asset_modality: "image",
};
function Field({ label, hint, error, children: children2 }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children2}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
export function MemoryEditDialog({ open, mode: mode2, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const isEdit = mode2.mode === "edit";
  const writer = useMemoryWrite();
  const entry = useMemoryEntry(
    isEdit ? mode2.scope : void 0,
    isEdit ? mode2.name : void 0,
  );
  const [state2, setState] = reactExports.useState(DEFAULT_STATE);
  const [submitted, setSubmitted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setSubmitted(false);
      return;
    }
    if (isEdit && entry.data) {
      const fm = entry.data.frontmatter;
      setState({
        scope: mode2.scope,
        name: mode2.name,
        type: fm.type,
        description: fm.description,
        body: entry.data.body,
        asset_uri: fm.asset_uri ?? "",
        asset_modality: fm.asset_modality ?? "image",
      });
    } else if (!isEdit) {
      setState(DEFAULT_STATE);
    }
  }, [open, isEdit, entry.data, mode2]);
  const isAssetPin = state2.type === "asset-pin";
  const errors = reactExports.useMemo(() => {
    const out = {};
    if (!isEdit) {
      if (!state2.name)
        out.name = t2("memory.errNameRequired", "name is required");
      else if (!NAME_RE.test(state2.name))
        out.name = t2(
          "memory.errNameFormat",
          "name must be kebab-case (1-64 chars)",
        );
      if (isAssetPin && state2.scope === "user")
        out.scope = t2(
          "memory.errAssetPinScope",
          "asset-pin requires project scope",
        );
    }
    if (!state2.description)
      out.description = t2("memory.errDescRequired", "description is required");
    else if (state2.description.length > MAX_MEMORY_DESCRIPTION_LENGTH)
      out.description = t2(
        "memory.errDescTooLong",
        `description must be ≤ ${MAX_MEMORY_DESCRIPTION_LENGTH} chars`,
      );
    if (state2.description.includes("\n"))
      out.description = t2(
        "memory.errDescSingleLine",
        "description must be a single line",
      );
    if (new Blob([state2.body]).size > MAX_MEMORY_BODY_BYTES)
      out.body = t2(
        "memory.errBodyTooLong",
        `body exceeds ${MAX_MEMORY_BODY_BYTES} bytes`,
      );
    if (isAssetPin) {
      if (!state2.asset_uri)
        out.asset_uri = t2(
          "memory.errAssetUriRequired",
          "asset_uri is required",
        );
      else if (!ASSET_URI_RE.test(state2.asset_uri))
        out.asset_uri = t2(
          "memory.errAssetUriFormat",
          "asset_uri must look like hilo://asset/<id>",
        );
    }
    return out;
  }, [isEdit, isAssetPin, state2, t2]);
  const hasErrors = Object.keys(errors).length > 0;
  async function submit() {
    setSubmitted(true);
    if (hasErrors) return;
    try {
      await writer.mutateAsync({
        scope: state2.scope,
        name: state2.name,
        type: state2.type,
        description: state2.description,
        body: state2.body,
        asset_uri: isAssetPin ? state2.asset_uri : void 0,
        asset_modality: isAssetPin ? state2.asset_modality : void 0,
      });
      dedupedToast.success(
        isEdit
          ? t2("memory.savedSuccess", "Memory updated")
          : t2("memory.createdSuccess", "Memory created"),
      );
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(
        (isEdit
          ? t2("memory.savedFailed", "Failed to save memory")
          : t2("memory.createdFailed", "Failed to create memory")) +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-action-ui-id="settings.memory.editor"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t2("memory.editTitle", "Edit memory")
              : t2("memory.createTitle", "New memory")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t2(
                  "memory.editDesc",
                  "Scope, name and type are locked once created.",
                )
              : t2(
                  "memory.createDesc",
                  "Stored as a markdown file under the chosen scope.",
                )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label={t2("memory.fieldScope", "Scope")}
              error={submitted ? errors.scope : void 0}
            >
              <Select
                value={state2.scope}
                onValueChange={(v2) =>
                  setState((s2) => ({
                    ...s2,
                    scope: v2,
                  }))
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-action-ui-id="settings.memory.editor.scope"
                >
                  <SelectValue>
                    {(v2) =>
                      v2 === "project"
                        ? t2("memory.scopeProject", "Project")
                        : t2("memory.scopeUser", "User")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">
                    {t2("memory.scopeProject", "Project")}
                  </SelectItem>
                  <SelectItem value="user">
                    {t2("memory.scopeUser", "User")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t2("memory.fieldType", "Type")}>
              <Select
                value={state2.type}
                onValueChange={(v2) =>
                  setState((s2) => ({
                    ...s2,
                    type: v2,
                  }))
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-action-ui-id="settings.memory.editor.type"
                >
                  <SelectValue>
                    {(v2) => t2(`memory.type.${v2}`, v2)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map((type2) => (
                    <SelectItem key={type2} value={type2}>
                      {t2(`memory.type.${type2}`, type2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field
            label={t2("memory.fieldName", "Name")}
            error={submitted ? errors.name : void 0}
            hint={t2(
              "memory.fieldNameHint",
              "kebab-case, 1-64 chars (locked after create)",
            )}
          >
            <Input3
              value={state2.name}
              onChange={(e2) =>
                setState((s2) => ({
                  ...s2,
                  name: e2.target.value,
                }))
              }
              placeholder={t2("memory.namePlaceholder", "cyberpunk-hero")}
              disabled={isEdit}
              data-action-ui-id="settings.memory.editor.name"
            />
          </Field>
          <Field
            label={t2("memory.fieldDescription", "Description")}
            error={submitted ? errors.description : void 0}
            hint={`${state2.description.length} / ${MAX_MEMORY_DESCRIPTION_LENGTH}`}
          >
            <Input3
              value={state2.description}
              onChange={(e2) =>
                setState((s2) => ({
                  ...s2,
                  description: e2.target.value,
                }))
              }
              placeholder={t2(
                "memory.descPlaceholder",
                "Single line shown in the index",
              )}
              data-action-ui-id="settings.memory.editor.description"
            />
          </Field>
          {isAssetPin && (
            <>
              <Field
                label={t2("memory.fieldAssetUri", "Asset URI")}
                error={submitted ? errors.asset_uri : void 0}
                hint="hilo://asset/<id>"
              >
                <Input3
                  value={state2.asset_uri}
                  onChange={(e2) =>
                    setState((s2) => ({
                      ...s2,
                      asset_uri: e2.target.value,
                    }))
                  }
                  placeholder={t2(
                    "memory.assetUriPlaceholder",
                    "hilo://asset/01H...",
                  )}
                  disabled={isEdit}
                  data-action-ui-id="settings.memory.editor.asset_uri"
                />
              </Field>
              <Field label={t2("memory.fieldAssetModality", "Modality")}>
                <Select
                  value={state2.asset_modality}
                  onValueChange={(v2) =>
                    setState((s2) => ({
                      ...s2,
                      asset_modality: v2,
                    }))
                  }
                  disabled={isEdit}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    data-action-ui-id="settings.memory.editor.asset_modality"
                  >
                    <SelectValue>{() => state2.asset_modality}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_MODALITIES.map((m3) => (
                      <SelectItem key={m3} value={m3}>
                        {m3}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field
            label={t2("memory.fieldBody", "Body (Markdown)")}
            error={submitted ? errors.body : void 0}
            hint={`${new Blob([state2.body]).size} / ${MAX_MEMORY_BODY_BYTES} bytes`}
          >
            <Textarea
              value={state2.body}
              onChange={(e2) =>
                setState((s2) => ({
                  ...s2,
                  body: e2.target.value,
                }))
              }
              placeholder={t2(
                "memory.bodyPlaceholder",
                "Markdown body — keywords, defaults, avoid notes…",
              )}
              rows={6}
              data-action-ui-id="settings.memory.editor.body"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={writer.isPending}
            data-action-ui-id="settings.memory.editor.cancel"
          >
            {t2("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={writer.isPending || (submitted && hasErrors)}
            data-action-ui-id="settings.memory.editor.save"
          >
            {writer.isPending
              ? t2("common.saving", "Saving…")
              : isEdit
                ? t2("common.save", "Save")
                : t2("common.create", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
