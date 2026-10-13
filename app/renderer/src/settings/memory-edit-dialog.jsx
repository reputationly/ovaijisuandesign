// memory-edit-dialog.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Label } from "../team/use-wallet-query.jsx";
import {
  BASE,
  expectOk,
  memoryQueryKeys,
  useMemoryEntry,
} from "./changelog-table.jsx";
import { jsxRuntimeExports, reactExports, useMutation, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => writeMemory(fetcher, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
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
function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
export function MemoryEditDialog({ open, mode, onOpenChange }) {
  const { t } = useTranslation();
  const isEdit = mode.mode === "edit";
  const writer = useMemoryWrite();
  const entry = useMemoryEntry(
    isEdit ? mode.scope : void 0,
    isEdit ? mode.name : void 0,
  );
  const [state, setState] = reactExports.useState(DEFAULT_STATE);
  const [submitted, setSubmitted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setSubmitted(false);
      return;
    }
    if (isEdit && entry.data) {
      const fm = entry.data.frontmatter;
      setState({
        scope: mode.scope,
        name: mode.name,
        type: fm.type,
        description: fm.description,
        body: entry.data.body,
        asset_uri: fm.asset_uri ?? "",
        asset_modality: fm.asset_modality ?? "image",
      });
    } else if (!isEdit) {
      setState(DEFAULT_STATE);
    }
  }, [open, isEdit, entry.data, mode]);
  const isAssetPin = state.type === "asset-pin";
  const errors = reactExports.useMemo(() => {
    const out = {};
    if (!isEdit) {
      if (!state.name)
        out.name = t("memory.errNameRequired", "name is required");
      else if (!NAME_RE.test(state.name))
        out.name = t(
          "memory.errNameFormat",
          "name must be kebab-case (1-64 chars)",
        );
      if (isAssetPin && state.scope === "user")
        out.scope = t(
          "memory.errAssetPinScope",
          "asset-pin requires project scope",
        );
    }
    if (!state.description)
      out.description = t("memory.errDescRequired", "description is required");
    else if (state.description.length > MAX_MEMORY_DESCRIPTION_LENGTH)
      out.description = t(
        "memory.errDescTooLong",
        `description must be ≤ ${MAX_MEMORY_DESCRIPTION_LENGTH} chars`,
      );
    if (state.description.includes("\n"))
      out.description = t(
        "memory.errDescSingleLine",
        "description must be a single line",
      );
    if (new Blob([state.body]).size > MAX_MEMORY_BODY_BYTES)
      out.body = t(
        "memory.errBodyTooLong",
        `body exceeds ${MAX_MEMORY_BODY_BYTES} bytes`,
      );
    if (isAssetPin) {
      if (!state.asset_uri)
        out.asset_uri = t(
          "memory.errAssetUriRequired",
          "asset_uri is required",
        );
      else if (!ASSET_URI_RE.test(state.asset_uri))
        out.asset_uri = t(
          "memory.errAssetUriFormat",
          "asset_uri must look like hilo://asset/<id>",
        );
    }
    return out;
  }, [isEdit, isAssetPin, state, t]);
  const hasErrors = Object.keys(errors).length > 0;
  async function submit() {
    setSubmitted(true);
    if (hasErrors) return;
    try {
      await writer.mutateAsync({
        scope: state.scope,
        name: state.name,
        type: state.type,
        description: state.description,
        body: state.body,
        asset_uri: isAssetPin ? state.asset_uri : void 0,
        asset_modality: isAssetPin ? state.asset_modality : void 0,
      });
      dedupedToast.success(
        isEdit
          ? t("memory.savedSuccess", "Memory updated")
          : t("memory.createdSuccess", "Memory created"),
      );
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(
        (isEdit
          ? t("memory.savedFailed", "Failed to save memory")
          : t("memory.createdFailed", "Failed to create memory")) +
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
              ? t("memory.editTitle", "Edit memory")
              : t("memory.createTitle", "New memory")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t(
                  "memory.editDesc",
                  "Scope, name and type are locked once created.",
                )
              : t(
                  "memory.createDesc",
                  "Stored as a markdown file under the chosen scope.",
                )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label={t("memory.fieldScope", "Scope")}
              error={submitted ? errors.scope : void 0}
            >
              <Select
                value={state.scope}
                onValueChange={(nextScope) =>
                  setState((prevState) => ({
                    ...prevState,
                    scope: nextScope,
                  }))
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-action-ui-id="settings.memory.editor.scope"
                >
                  <SelectValue>
                    {(scope) =>
                      scope === "project"
                        ? t("memory.scopeProject", "Project")
                        : t("memory.scopeUser", "User")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">
                    {t("memory.scopeProject", "Project")}
                  </SelectItem>
                  <SelectItem value="user">
                    {t("memory.scopeUser", "User")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("memory.fieldType", "Type")}>
              <Select
                value={state.type}
                onValueChange={(nextType) =>
                  setState((prevState) => ({
                    ...prevState,
                    type: nextType,
                  }))
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-action-ui-id="settings.memory.editor.type"
                >
                  <SelectValue>
                    {(type) => t(`memory.type.${type}`, type)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`memory.type.${type}`, type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field
            label={t("memory.fieldName", "Name")}
            error={submitted ? errors.name : void 0}
            hint={t(
              "memory.fieldNameHint",
              "kebab-case, 1-64 chars (locked after create)",
            )}
          >
            <Input3
              value={state.name}
              onChange={(changeEvent) =>
                setState((prevState) => ({
                  ...prevState,
                  name: changeEvent.target.value,
                }))
              }
              placeholder={t("memory.namePlaceholder", "cyberpunk-hero")}
              disabled={isEdit}
              data-action-ui-id="settings.memory.editor.name"
            />
          </Field>
          <Field
            label={t("memory.fieldDescription", "Description")}
            error={submitted ? errors.description : void 0}
            hint={`${state.description.length} / ${MAX_MEMORY_DESCRIPTION_LENGTH}`}
          >
            <Input3
              value={state.description}
              onChange={(changeEvent) =>
                setState((prevState) => ({
                  ...prevState,
                  description: changeEvent.target.value,
                }))
              }
              placeholder={t(
                "memory.descPlaceholder",
                "Single line shown in the index",
              )}
              data-action-ui-id="settings.memory.editor.description"
            />
          </Field>
          {isAssetPin && (
            <>
              <Field
                label={t("memory.fieldAssetUri", "Asset URI")}
                error={submitted ? errors.asset_uri : void 0}
                hint="hilo://asset/<id>"
              >
                <Input3
                  value={state.asset_uri}
                  onChange={(changeEvent) =>
                    setState((prevState) => ({
                      ...prevState,
                      asset_uri: changeEvent.target.value,
                    }))
                  }
                  placeholder={t(
                    "memory.assetUriPlaceholder",
                    "hilo://asset/01H...",
                  )}
                  disabled={isEdit}
                  data-action-ui-id="settings.memory.editor.asset_uri"
                />
              </Field>
              <Field label={t("memory.fieldAssetModality", "Modality")}>
                <Select
                  value={state.asset_modality}
                  onValueChange={(nextModality) =>
                    setState((prevState) => ({
                      ...prevState,
                      asset_modality: nextModality,
                    }))
                  }
                  disabled={isEdit}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    data-action-ui-id="settings.memory.editor.asset_modality"
                  >
                    <SelectValue>{() => state.asset_modality}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_MODALITIES.map((modality) => (
                      <SelectItem key={modality} value={modality}>
                        {modality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field
            label={t("memory.fieldBody", "Body (Markdown)")}
            error={submitted ? errors.body : void 0}
            hint={`${new Blob([state.body]).size} / ${MAX_MEMORY_BODY_BYTES} bytes`}
          >
            <Textarea
              value={state.body}
              onChange={(changeEvent) =>
                setState((prevState) => ({
                  ...prevState,
                  body: changeEvent.target.value,
                }))
              }
              placeholder={t(
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
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={writer.isPending || (submitted && hasErrors)}
            data-action-ui-id="settings.memory.editor.save"
          >
            {writer.isPending
              ? t("common.saving", "Saving…")
              : isEdit
                ? t("common.save", "Save")
                : t("common.create", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
