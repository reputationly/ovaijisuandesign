// 技能导入弹窗：选择文件、校验、导入与错误提示。
import {
  mv as isValidSkillName,
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  x as useNavigateToWorkspace,
  H as homeService,
  K as workspaceRuntimeFromOpenResult,
  l9 as toastWorkspaceOpenResult,
  j as jsxRuntimeExports,
  gj as DialogHeader,
  au as cn,
  fM as Button,
  l as gatewayFetch,
  m as API_PATHS,
  as as Dialog,
  at as DialogContent,
  g8 as DialogTitle,
  bB as CheckCircle2,
  f as Input,
  dl as Loader2,
  ns as detectSkillImportFileExt,
  nt as trackSkillImportFailed,
  nu as trackSkillImport,
  nv as chatLog,
  aS as AlertCircle,
  aO as FileText,
  cy as FilePlus2,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const ACCEPTED_EXTENSIONS = new Set([".zip", ".md"]);
function getFileExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function resolveImportErrorMessage(t, data) {
  const detail = data.error ?? "";
  const fallback = detail || t("skills.import.importFailed", "Import failed");
  switch (data.errorType) {
    case "unsupported_type":
      return t("skills.import.error.unsupported_type", "Only .zip and .md files are supported");
    case "no_skill_md":
      return t("skills.import.error.no_skill_md", "SKILL.md not found in zip file");
    case "extract_failed":
      return t("skills.import.error.extract_failed", {
        detail,
      });
    case "invalid_format": {
      const quoted = detail.match(/"([^"]+)"/);
      if (quoted) {
        return t("skills.import.error.invalid_format.invalidName", {
          name: quoted[1],
        });
      }
      return t(
        "skills.import.error.invalid_format.noName",
        "Cannot determine skill name. Please add a name field to the file.",
      );
    }
    case "download_failed": {
      const statusMatch = detail.match(/\((\d+)\)/);
      return t("skills.import.error.downloadFailed", {
        status: statusMatch?.[1] ?? "?",
      });
    }
    case "invalid_staging_path":
      return t("skills.import.error.invalidStagingPath", "Invalid staging path");
    case "staging_not_found":
      return t(
        "skills.import.error.stagingNotFound",
        "Staging directory expired. Please re-upload the file.",
      );
    default:
      return fallback;
  }
}
function resolveNetworkErrorMessage(t, err) {
  const detail = err instanceof Error ? err.message : String(err);
  if (/failed:\s*413\b/.test(detail)) {
    return t("skills.import.error.fileTooLarge", "File too large. Max 50 MB per upload.");
  }
  return t("skills.import.error.network", "Network error. Please check your connection and retry.");
}
function IconBadge({ children, variant = "muted" }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg",
        variant === "success" ? "bg-success/10" : "bg-muted",
      )}
    >
      {children}
    </div>
  );
}
export function SkillImportDialog({ open, onOpenChange, onImported }) {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const fileInputRef = reactExports.useRef(null);
  const [state, setState] = reactExports.useState("idle");
  const [file, setFile] = reactExports.useState(null);
  const [errorInfo, setErrorInfo] = reactExports.useState(null);
  const [importedSkill, setImportedSkill] = reactExports.useState(null);
  const [autoFixed, setAutoFixed] = reactExports.useState(false);
  const [warning, setWarning] = reactExports.useState(null);
  const [_missingRefs, setMissingRefs] = reactExports.useState([]);
  const [stagingPath, setStagingPath] = reactExports.useState(null);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [dragInvalid, setDragInvalid] = reactExports.useState(false);
  const [conflict, setConflict] = reactExports.useState(null);
  const [newName, setNewName] = reactExports.useState("");
  const [nameError, setNameError] = reactExports.useState(null);
  const [needsAdaptationAfterRename, setNeedsAdaptationAfterRename] = reactExports.useState(false);
  const reset = reactExports.useCallback(() => {
    setState("idle");
    setFile(null);
    setErrorInfo(null);
    setImportedSkill(null);
    setAutoFixed(false);
    setWarning(null);
    setMissingRefs([]);
    setStagingPath(null);
    setDragOver(false);
    setDragInvalid(false);
    setConflict(null);
    setNewName("");
    setNameError(null);
    setNeedsAdaptationAfterRename(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);
  const handleFileSelect = reactExports.useCallback(
    (selected) => {
      const ext = getFileExtension(selected.name);
      if (!ACCEPTED_EXTENSIONS.has(ext)) {
        dedupedToast.error(t("skills.import.unsupportedType", "请选择 .zip 文件或 SKILL.md 文件"));
        return;
      }
      setFile(selected);
      setState("fileSelected");
      setErrorInfo(null);
      setAutoFixed(false);
      setWarning(null);
    },
    [t],
  );
  const handleInputChange = reactExports.useCallback(
    (e) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
    },
    [handleFileSelect],
  );
  const handleDragOver = reactExports.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const mimeType = items[0].type || "";
      if (mimeType.includes("zip") || mimeType.includes("markdown") || mimeType === "") {
        setDragOver(true);
        setDragInvalid(false);
      } else {
        setDragOver(true);
        setDragInvalid(true);
      }
    }
  }, []);
  const handleDragLeave = reactExports.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setDragInvalid(false);
  }, []);
  const handleDrop = reactExports.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      setDragInvalid(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect],
  );
  const handleInstall = reactExports.useCallback(async () => {
    if (!file) return;
    setState("installing");
    setErrorInfo(null);
    const fileExt = detectSkillImportFileExt(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await gatewayFetch(API_PATHS.skillImport, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setErrorInfo({
          message: resolveImportErrorMessage(t, data),
          type: data.errorType,
          missingFields: data.missingFields,
        });
        trackSkillImportFailed({
          fileExt,
          name: data.skill?.name,
          error: new Error(data.error || "Import failed"),
          errorType: data.errorType ?? "business",
        });
        return;
      }
      if (data.conflict) {
        setConflict(data.conflict);
        setNewName(data.suggestedName ?? "");
        setNameError(null);
        setStagingPath(data.stagingPath ?? null);
        if (data.skill) setImportedSkill(data.skill);
        setNeedsAdaptationAfterRename(!!data.needsAdaptation);
        setState("nameConflict");
        trackSkillImport({
          skill_name: data.skill?.name,
          file_ext: fileExt,
          result: "name_conflict",
          auto_fixed: data.autoFixed ?? false,
        });
        return;
      }
      if (data.needsAdaptation) {
        setStagingPath(data.stagingPath ?? null);
        if (data.skill) setImportedSkill(data.skill);
        setState("needsAdaptation");
        trackSkillImport({
          skill_name: data.skill?.name,
          file_ext: fileExt,
          result: "needs_adaptation",
          auto_fixed: data.autoFixed ?? false,
        });
        return;
      }
      if (data.skill) {
        setImportedSkill(data.skill);
        await homeService.hiloApp.toggleSkill(data.skill.name, true).catch(() => {});
        try {
          await window.hilo.opencode.restart();
        } catch {}
      }
      setAutoFixed(data.autoFixed ?? false);
      setWarning(data.warning ?? null);
      setMissingRefs(data.missingReferences ?? []);
      setState("success");
      trackSkillImport({
        skill_name: data.skill?.name,
        file_ext: fileExt,
        result: "success",
        auto_fixed: data.autoFixed ?? false,
      });
      onImported?.();
    } catch (err) {
      setState("error");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrorInfo({
        message: resolveNetworkErrorMessage(t, err),
        type: "network",
      });
      trackSkillImportFailed({
        fileExt,
        error: err,
        errorType: "network",
      });
    }
  }, [file, onImported, t]);
  const handleTryInHub = reactExports.useCallback(async () => {
    if (!importedSkill) return;
    const guide = importedSkill.guidePrompt || importedSkill.guidePromptEn;
    const prompt = guide ? `/${importedSkill.name} ${guide}` : `/${importedSkill.name}`;
    const initialPayloadId = crypto.randomUUID();
    try {
      const entries = await homeService.hiloApp.listWorkspaceEntries().catch(() => []);
      const latestEntry = entries[entries.length - 1];
      const result = latestEntry?.folderPath
        ? await homeService.hiloApp
            .openWorkspaceWithResult(latestEntry.folderPath)
            .catch(() => null)
        : await homeService.hiloApp
            .createWorkspaceWithResult(`try-${importedSkill.name}`)
            .catch(() => null);
      if (!result) {
        chatLog.error("initial-payload handoff-failed", {
          client_message_id: initialPayloadId,
          source: "skill-import.try-in-hub",
          skill_name: importedSkill.name,
          stage: "workspace_open",
          reused_workspace: Boolean(latestEntry?.folderPath),
        });
        return;
      }
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        chatLog.error("initial-payload handoff-failed", {
          client_message_id: initialPayloadId,
          source: "skill-import.try-in-hub",
          skill_name: importedSkill.name,
          stage: "workspace_not_ready",
          result_kind: result.kind,
        });
        toastWorkspaceOpenResult(result, t);
        return;
      }
      chatLog.info("initial-payload handoff", {
        client_message_id: initialPayloadId,
        source: "skill-import.try-in-hub",
        skill_name: importedSkill.name,
        workspace_id: runtime.workspaceId,
        result_kind: result.kind,
      });
      navigateToWorkspace(runtime, {
        initialPayloadId,
        initialMessage: prompt,
      });
      onOpenChange(false);
    } catch (error) {
      chatLog.error("initial-payload handoff-failed", {
        client_message_id: initialPayloadId,
        source: "skill-import.try-in-hub",
        skill_name: importedSkill.name,
        stage: "exception",
        error: error instanceof Error ? error.message : String(error),
      });
      onOpenChange(false);
    }
  }, [importedSkill, navigateToWorkspace, onOpenChange, t]);
  const handleAdaptToHub = reactExports.useCallback(async () => {
    if (!stagingPath || !importedSkill) return;
    trackSkillImport({
      skill_name: importedSkill.name,
      file_ext: file ? detectSkillImportFileExt(file.name) : "other",
      result: "adapt",
    });
    const prompt = t(
      "skills.import.adaptPrompt",
      "/skill-creator Please adapt the third-party skill at {{stagingPath}}/SKILL.md to the current MiniMax Design environment. Read the file content, analyze its dependencies and tools, rewrite it in MiniMax Design-compatible format, and save to the user skills directory.",
    ).replace("{{stagingPath}}", stagingPath);
    const initialPayloadId = crypto.randomUUID();
    try {
      const result = await homeService.hiloApp.createWorkspaceWithResult(
        `adapt-${importedSkill.name}`,
      );
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        chatLog.error("initial-payload handoff-failed", {
          client_message_id: initialPayloadId,
          source: "skill-import.adapt",
          skill_name: importedSkill.name,
          stage: "workspace_not_ready",
          result_kind: result.kind,
        });
        toastWorkspaceOpenResult(result, t);
        return;
      }
      chatLog.info("initial-payload handoff", {
        client_message_id: initialPayloadId,
        source: "skill-import.adapt",
        skill_name: importedSkill.name,
        workspace_id: runtime.workspaceId,
        result_kind: result.kind,
      });
      navigateToWorkspace(runtime, {
        initialPayloadId,
        initialMessage: prompt,
      });
      onOpenChange(false);
    } catch (error) {
      chatLog.error("initial-payload handoff-failed", {
        client_message_id: initialPayloadId,
        source: "skill-import.adapt",
        skill_name: importedSkill.name,
        stage: "exception",
        error: error instanceof Error ? error.message : String(error),
      });
      dedupedToast.error(t("skills.import.adaptFailed", "创建适配项目失败"));
    }
  }, [stagingPath, importedSkill, navigateToWorkspace, onOpenChange, t, file]);
  const handleDirectInstall = reactExports.useCallback(async () => {
    if (!stagingPath || !importedSkill) return;
    setState("installing");
    const fileExt = file ? detectSkillImportFileExt(file.name) : "other";
    try {
      const res = await gatewayFetch("/api/skills/import/confirm-staging", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stagingPath,
          name: importedSkill.name,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setErrorInfo({
          message: resolveImportErrorMessage(t, data),
          type: data.errorType,
        });
        trackSkillImportFailed({
          fileExt,
          name: importedSkill.name,
          error: new Error(data.error || "Install failed"),
          errorType: "business",
        });
        return;
      }
      setImportedSkill(data.skill ?? importedSkill);
      await homeService.hiloApp.toggleSkill(importedSkill.name, true).catch(() => {});
      try {
        await window.hilo.opencode.restart();
      } catch {}
      setState("success");
      trackSkillImport({
        skill_name: importedSkill.name,
        file_ext: fileExt,
        result: "direct_install",
      });
      onImported?.();
    } catch (err) {
      setState("error");
      setErrorInfo({
        message: resolveNetworkErrorMessage(t, err),
        type: "network",
      });
      trackSkillImportFailed({
        fileExt,
        name: importedSkill.name,
        error: err,
        errorType: "network",
      });
    }
  }, [stagingPath, importedSkill, onImported, t, file]);
  const handleConfirmRename = reactExports.useCallback(async () => {
    if (!stagingPath || !newName) return;
    if (needsAdaptationAfterRename) {
      setState("installing");
      const fileExt2 = file ? detectSkillImportFileExt(file.name) : "other";
      try {
        const res = await gatewayFetch("/api/skills/import/confirm-staging", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stagingPath,
            name: newName,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setState("error");
          setConflict(null);
          setErrorInfo({
            message: resolveImportErrorMessage(t, data),
            type: data.errorType,
          });
          trackSkillImportFailed({
            fileExt: fileExt2,
            name: newName,
            error: new Error(data.error || "Install failed"),
            errorType: "business",
          });
          return;
        }
        setConflict(null);
        setImportedSkill(data.skill ?? importedSkill);
        setState("needsAdaptation");
        trackSkillImport({
          skill_name: newName,
          file_ext: fileExt2,
          result: "renamed_adapt",
        });
      } catch (err) {
        setState("error");
        setConflict(null);
        setErrorInfo({
          message: resolveNetworkErrorMessage(t, err),
          type: "network",
        });
        trackSkillImportFailed({
          fileExt: fileExt2,
          name: newName,
          error: err,
          errorType: "network",
        });
      }
      return;
    }
    setState("installing");
    const fileExt = file ? detectSkillImportFileExt(file.name) : "other";
    try {
      const res = await gatewayFetch("/api/skills/import/confirm-staging", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stagingPath,
          name: newName,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setConflict(null);
        setErrorInfo({
          message: resolveImportErrorMessage(t, data),
          type: data.errorType,
        });
        trackSkillImportFailed({
          fileExt,
          name: newName,
          error: new Error(data.error || "Install failed"),
          errorType: "business",
        });
        return;
      }
      setImportedSkill(data.skill ?? importedSkill);
      setConflict(null);
      await homeService.hiloApp.toggleSkill(newName, true).catch(() => {});
      try {
        await window.hilo.opencode.restart();
      } catch {}
      setState("success");
      trackSkillImport({
        skill_name: newName,
        file_ext: fileExt,
        result: "renamed_install",
      });
      onImported?.();
    } catch (err) {
      setState("error");
      setConflict(null);
      setErrorInfo({
        message: resolveNetworkErrorMessage(t, err),
        type: "network",
      });
      trackSkillImportFailed({
        fileExt,
        name: newName,
        error: err,
        errorType: "network",
      });
    }
  }, [stagingPath, newName, needsAdaptationAfterRename, importedSkill, onImported, t, file]);
  const handleContinueAdd = reactExports.useCallback(() => {
    reset();
  }, [reset]);
  const handleOpenChange = reactExports.useCallback(
    (v) => {
      if (!v) reset();
      onOpenChange(v);
    },
    [onOpenChange, reset],
  );
  const isSuccess = state === "success";
  const isError = state === "error";
  const isAdaptation = state === "needsAdaptation";
  const isConflict = state === "nameConflict";
  const showDropZone = !isSuccess && !isAdaptation && !isConflict;
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="md"
        className="gap-0 p-0 [&_[data-slot=dialog-close]]:size-8! [&_[data-slot=dialog-close]_svg]:size-[18px]!"
        data-layout-slot="skill-import-dialog"
      >
        <DialogHeader className="px-6 pt-5 pb-4">
          <DialogTitle className="text-sm leading-5 font-medium">
            {t("skills.import.title", "导入 Skill")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          {isError && errorInfo && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium">{errorInfo.message}</p>
                {errorInfo.missingFields && errorInfo.missingFields.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {errorInfo.missingFields.map((f) => (
                      <span
                        key={f}
                        className="rounded-sm bg-destructive/10 px-1 py-0.5 font-mono text-[11px]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {isSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-success-foreground">
              <CheckCircle2 size={15} />
              <span className="text-xs font-medium">
                {t("skills.import.success", "Skill 导入成功")}
              </span>
            </div>
          )}
          {isSuccess && autoFixed && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground">
              <AlertCircle size={15} />
              <span className="text-xs">{t("skills.import.autoFixHint", "已自动优化格式")}</span>
            </div>
          )}
          {isSuccess && warning && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground">
              <AlertCircle size={15} />
              <span className="text-xs">{warning}</span>
            </div>
          )}
          {showDropZone && (
            <>
              <button
                type="button"
                data-action-ui-id="skills-import-dropzone"
                className={cn(
                  "relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 transition-colors",
                  dragOver && !dragInvalid && "border-foreground bg-muted/50",
                  dragOver && dragInvalid && "border-destructive bg-destructive/5",
                  !dragOver && file && "border-foreground/20",
                  !dragOver &&
                    !file &&
                    "border-muted-foreground/30 hover:border-muted-foreground/50",
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <>
                    <IconBadge variant="success">
                      <FileText size={22} className="text-success-foreground" />
                    </IconBadge>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </>
                ) : (
                  <>
                    <IconBadge>
                      <FilePlus2 size={22} className="text-foreground opacity-30" />
                    </IconBadge>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      {t("skills.import.dropzone", "拖放 .zip 或 SKILL.md 文件，或点击选择")}
                    </p>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.md"
                className="hidden"
                onChange={handleInputChange}
              />
            </>
          )}
          {isSuccess && file && (
            <>
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-success/30 border-dashed bg-success/5 px-4 py-8">
                <IconBadge variant="success">
                  <FileText size={22} className="text-success-foreground" />
                </IconBadge>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  data-action-ui-id="skills-import-continue"
                  variant="outline"
                  className="h-10 flex-1 rounded-lg text-sm"
                  onClick={handleContinueAdd}
                >
                  {t("skills.import.continueAdd", "继续导入")}
                </Button>
                <Button
                  data-action-ui-id="skills-import-try"
                  className="h-10 flex-1 rounded-lg text-sm"
                  onClick={handleTryInHub}
                >
                  {t("skills.import.tryInHub", "在 MiniMax Design 中试用")}
                  {" →"}
                </Button>
              </div>
            </>
          )}
          {isConflict && conflict && (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="text-xs">
                  {conflict.type === "official"
                    ? t("skills.import.nameConflict.official", {
                        name: conflict.existingName,
                      })
                    : t("skills.import.nameConflict.user", {
                        name: conflict.existingName,
                      })}
                </span>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="skill-rename-input" className="text-xs font-medium">
                  {t("skills.import.nameConflict.inputLabel", "新 Skill 名称")}
                </label>
                <Input
                  id="skill-rename-input"
                  data-action-ui-id="skills-import-rename-input"
                  className="h-10 text-sm"
                  value={newName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewName(val);
                    setNameError(
                      val && !isValidSkillName(val)
                        ? t("skills.import.nameConflict.invalid")
                        : null,
                    );
                  }}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1 rounded-lg text-sm"
                  onClick={() => {
                    reset();
                  }}
                >
                  {t("common.cancel", "取消")}
                </Button>
                <Button
                  data-action-ui-id="skills-import-rename-confirm"
                  className="h-10 flex-1 rounded-lg text-sm"
                  disabled={!newName || !!nameError}
                  onClick={handleConfirmRename}
                >
                  {t("skills.import.nameConflict.confirm", "使用新名字导入")}
                </Button>
              </div>
            </>
          )}
          {isAdaptation && file && (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="text-xs">
                  {t(
                    "skills.import.thirdPartyHint",
                    "检测到第三方 Skill，建议适配到 MiniMax Design 环境以获得最佳体验",
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-warning/30 border-dashed bg-warning/5 px-4 py-8">
                <IconBadge>
                  <FileText size={22} className="text-warning-foreground" />
                </IconBadge>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  data-action-ui-id="skills-import-direct-install"
                  variant="outline"
                  className="h-10 flex-1 rounded-lg text-sm"
                  onClick={handleDirectInstall}
                >
                  {t("skills.import.directInstall", "直接导入")}
                </Button>
                <Button
                  data-action-ui-id="skills-import-adapt"
                  className="h-10 flex-1 rounded-lg text-sm"
                  onClick={handleAdaptToHub}
                >
                  {t("skills.import.adaptToHub", "适配到 MiniMax Design")}
                  {" →"}
                </Button>
              </div>
            </>
          )}
          {showDropZone && (
            <>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p className="font-medium text-xs">{t("skills.import.requirements", "文件要求")}</p>
                <ul className="list-disc pl-4 space-y-0">
                  <li>{t("skills.import.reqZip", "包含 SKILL.md 文件的 .zip 压缩包")}</li>
                  <li>{t("skills.import.reqMd", "或直接拖入 SKILL.md 文件")}</li>
                </ul>
              </div>
              <Button
                data-action-ui-id="skills-import-install"
                className="h-10 w-full rounded-lg text-sm"
                disabled={state !== "fileSelected" && state !== "error"}
                onClick={handleInstall}
              >
                {state === "installing" && (
                  <Loader2 size={14} strokeWidth={1.5} className="animate-spin mr-1.5" />
                )}
                {state === "installing"
                  ? t("skills.import.installing", "导入中...")
                  : t("skills.import.install", "导入")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
