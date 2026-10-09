// 下载工作流前的确认弹窗：模型依赖、许可证、兼容性与磁盘空间。
import {
  h as useTranslation,
  fM as Button,
  ez as ShieldCheck,
  r as reactExports,
  as as Dialog,
  at as DialogContent,
  gj as DialogHeader,
  g8 as DialogTitle,
  g9 as DialogDescription,
  f as Input,
  kS as DialogFooter,
  ck as ExternalLink,
  o as usePlatform,
  gB as openExternalUrl,
  dQ as Package,
  H as homeService,
  hC as Checkbox,
  cx as FileJson2,
  cX as HardDrive,
  j8 as LocalFolderIcon,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { WorkflowCompatibilityComparison } from "./compatibility-comparison.jsx";
import { useComfyUiLicenseAcceptance } from "./license-acceptance.js";
import { comfyUiLicenseKey } from "./workflow-card-helpers.js";
import { workflowDisplayName } from "./workflow-mapping.js";
const EMPTY_ATTRIBUTIONS = [];
const EMPTY_MODEL_DEPENDENCIES = [];
export function WorkflowDownloadConfirmDialog({ workflow, onOpenChange, onConfirm }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [snapshot, setSnapshot] = reactExports.useState(null);
  const [availabilitySnapshot, setAvailabilitySnapshot] = reactExports.useState(null);
  const [isDetecting, setIsDetecting] = reactExports.useState(false);
  const [selectedLicenseKeys, setSelectedLicenseKeys] = reactExports.useState(() => new Set());
  const [modelsDirectory, setModelsDirectory] = reactExports.useState("");
  const [isPickingDirectory, setIsPickingDirectory] = reactExports.useState(false);
  const [directoryError, setDirectoryError] = reactExports.useState(false);
  const [isSavingAcceptance, setIsSavingAcceptance] = reactExports.useState(false);
  const [acceptanceSaveFailed, setAcceptanceSaveFailed] = reactExports.useState(false);
  const [licenseValidationVisible, setLicenseValidationVisible] = reactExports.useState(false);
  const [licenseCardShaking, setLicenseCardShaking] = reactExports.useState(false);
  const licenseSectionRef = reactExports.useRef(null);
  const workflowId = workflow?.id;
  const dependencies =
    workflow?.source === "official"
      ? (workflow.modelDependencies ?? EMPTY_MODEL_DEPENDENCIES)
      : EMPTY_MODEL_DEPENDENCIES;
  const attributions =
    workflow?.source === "official"
      ? (workflow.attributions ?? EMPTY_ATTRIBUTIONS)
      : EMPTY_ATTRIBUTIONS;
  const {
    acceptanceScope,
    isHydrated: licenseStateHydrated,
    requiredLicenses,
    acceptedLicenseKeys,
    pendingLicenses,
    acceptLicenses,
  } = useComfyUiLicenseAcceptance(attributions);
  const fileCount = dependencies.length + 1;
  const acceptedLicenseKeysSnapshot = JSON.stringify([...acceptedLicenseKeys].sort());
  const allRequiredLicensesAccepted =
    licenseStateHydrated &&
    requiredLicenses.every((license) => selectedLicenseKeys.has(comfyUiLicenseKey(license)));
  const modelAvailability = availabilitySnapshot?.models ?? [];
  const availabilityByKey = new Map(
    modelAvailability.map((model) => [`${model.directory}/${model.name}`, model]),
  );
  const availableModelKeys = new Set(
    modelAvailability
      .filter((model) => model.available)
      .map((model) => `${model.directory}/${model.name}`),
  );
  const missingModelCount = dependencies.filter(
    (dependency) => !availableModelKeys.has(`${dependency.directory}/${dependency.name}`),
  ).length;
  const allModelsAvailable = availabilitySnapshot !== null && missingModelCount === 0;
  const canUseLocalResources = dependencies.length > 0 && allModelsAvailable;
  const discoveredModelDirectories = [
    ...new Set(
      modelAvailability
        .filter((model) => model.available && !model.registered && model.modelsDirectory)
        .map((model) => model.modelsDirectory),
    ),
  ];
  reactExports.useLayoutEffect(() => {
    setSelectedLicenseKeys(
      workflowId && acceptanceScope ? new Set(JSON.parse(acceptedLicenseKeysSnapshot)) : new Set(),
    );
  }, [acceptanceScope, acceptedLicenseKeysSnapshot, workflowId]);
  reactExports.useEffect(() => {
    if (!workflowId || !acceptanceScope) return;
    setIsSavingAcceptance(false);
    setAcceptanceSaveFailed(false);
    setLicenseValidationVisible(false);
    setLicenseCardShaking(false);
    setDirectoryError(false);
  }, [acceptanceScope, workflowId]);
  reactExports.useEffect(() => {
    if (!workflowId || !acceptanceScope) {
      setSnapshot(null);
      setAvailabilitySnapshot(null);
      setModelsDirectory("");
      setIsDetecting(false);
      return;
    }
    let disposed = false;
    setSnapshot(null);
    setAvailabilitySnapshot(null);
    setModelsDirectory("");
    setIsDetecting(true);
    void homeService.comfyUiModelDownload
      .getModelDirectoryState()
      .then(async (state) => {
        const availability = await homeService.comfyUiModelDownload.getModelAvailability(
          dependencies,
          {
            scanUserDisk: true,
          },
        );
        const matchedDirectories = [
          ...new Set(
            availability.models
              .filter((model) => model.available && model.modelsDirectory)
              .map((model) => model.modelsDirectory),
          ),
        ];
        const directory =
          dependencies.length > 0 &&
          availability.models.every((model) => model.available) &&
          matchedDirectories.length === 1
            ? matchedDirectories[0]
            : state.activeDirectory;
        return {
          directory,
          snapshot:
            await homeService.comfyUiModelDownload.getSystemCompatibilitySnapshot(directory),
          availability,
        };
      })
      .then((value) => {
        if (!disposed) {
          setModelsDirectory(value.directory);
          setSnapshot(value.snapshot);
          setAvailabilitySnapshot(value.availability);
        }
      })
      .catch(() => {
        if (!disposed) {
          setSnapshot(null);
          setDirectoryError(true);
        }
      })
      .finally(() => {
        if (!disposed) setIsDetecting(false);
      });
    return () => {
      disposed = true;
    };
  }, [workflowId, acceptanceScope, dependencies]);
  reactExports.useEffect(() => {
    if (!workflowId || !acceptanceScope) return;
    const expectedKeys = dependencies
      .map((model) => `${model.directory}/${model.name}`)
      .sort()
      .join("\0");
    const subscription = homeService.comfyUiModelDownload.onDidScanModelAvailability(
      (nextAvailability) => {
        const receivedKeys = nextAvailability.models
          .map((model) => `${model.directory}/${model.name}`)
          .sort()
          .join("\0");
        if (receivedKeys !== expectedKeys) return;
        setAvailabilitySnapshot(nextAvailability);
        const matchedDirectories = [
          ...new Set(
            nextAvailability.models
              .filter((model) => model.available && model.modelsDirectory)
              .map((model) => model.modelsDirectory),
          ),
        ];
        if (
          dependencies.length > 0 &&
          nextAvailability.models.every((model) => model.available) &&
          matchedDirectories.length === 1
        ) {
          const directory = matchedDirectories[0];
          setModelsDirectory(directory);
          void homeService.comfyUiModelDownload
            .getSystemCompatibilitySnapshot(directory)
            .then(setSnapshot)
            .catch(() => {});
        }
      },
    );
    return () => subscription.dispose();
  }, [workflowId, acceptanceScope, dependencies]);
  const handleToggleLicense = (licenseKey, checked) => {
    setSelectedLicenseKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(licenseKey);
      else next.delete(licenseKey);
      return next;
    });
    setAcceptanceSaveFailed(false);
    setLicenseValidationVisible(false);
    setLicenseCardShaking(false);
  };
  const handlePickDirectory = async () => {
    if (isPickingDirectory || isDetecting) return;
    const previousSnapshot = snapshot;
    let directoryRegistered = false;
    setIsPickingDirectory(true);
    setDirectoryError(false);
    try {
      const selected = await platform.fs.showOpenDialog?.({
        directory: true,
        multiple: false,
        title: t("workflows.downloadDialog.directoryPickerTitle"),
      });
      const directory = selected?.[0];
      if (!directory) return;
      setSnapshot(null);
      setAvailabilitySnapshot(null);
      setIsDetecting(true);
      const state = await homeService.comfyUiModelDownload.registerModelDirectory(directory);
      directoryRegistered = true;
      setModelsDirectory(state.activeDirectory);
      const [nextSnapshot, nextAvailability] = await Promise.all([
        homeService.comfyUiModelDownload.getSystemCompatibilitySnapshot(state.activeDirectory),
        homeService.comfyUiModelDownload.getModelAvailability(dependencies),
      ]);
      setSnapshot(nextSnapshot);
      setAvailabilitySnapshot(nextAvailability);
    } catch {
      setSnapshot(directoryRegistered ? null : previousSnapshot);
      setAvailabilitySnapshot(null);
      setDirectoryError(true);
    } finally {
      setIsDetecting(false);
      setIsPickingDirectory(false);
    }
  };
  const handleConfirm = async () => {
    if (!licenseStateHydrated || isSavingAcceptance || !modelsDirectory) return;
    if (!allRequiredLicensesAccepted) {
      setLicenseValidationVisible(true);
      setLicenseCardShaking(true);
      licenseSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      licenseSectionRef.current?.focus({
        preventScroll: true,
      });
      return;
    }
    setIsSavingAcceptance(true);
    setAcceptanceSaveFailed(false);
    const saved = await acceptLicenses(pendingLicenses);
    if (saved) onConfirm(modelsDirectory, discoveredModelDirectories, canUseLocalResources);
    else setAcceptanceSaveFailed(true);
    setIsSavingAcceptance(false);
  };
  return (
    <Dialog open={workflow !== null} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="flex w-[92dvw] max-w-[960px] max-h-[min(860px,88dvh)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="workflows-download-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border bg-popover px-6 py-5 pr-16">
          <DialogTitle className="text-base">
            {t("workflows.downloadDialog.title", {
              name: workflow ? workflowDisplayName(workflow) : "",
            })}
          </DialogTitle>
          <DialogDescription>{t("workflows.downloadDialog.description")}</DialogDescription>
        </DialogHeader>
        <div
          className="scrollbar-fade min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5 pr-5 [scrollbar-gutter:stable]"
          data-slot="workflows-download-dialog-body"
        >
          <WorkflowCompatibilityComparison
            recommendation={workflow?.source === "official" ? workflow.recommendation : void 0}
            snapshot={snapshot}
            loading={isDetecting}
          />
          {licenseStateHydrated && requiredLicenses.length ? (
            <section
              ref={licenseSectionRef}
              className="outline-none"
              tabIndex={-1}
              aria-labelledby="workflows-download-license-title"
              data-action-ui-id="workflows-download-license-confirmation"
            >
              <div className="mb-3 flex items-start gap-2">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <div>
                  <h3
                    id="workflows-download-license-title"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("workflows.downloadDialog.licenseTitle")}
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {t("workflows.downloadDialog.licenseHint")}
                  </p>
                </div>
              </div>
              <fieldset
                aria-labelledby="workflows-download-license-title"
                aria-invalid={licenseValidationVisible}
                aria-describedby={
                  licenseValidationVisible ? "workflows-download-license-required" : void 0
                }
                onAnimationEnd={() => setLicenseCardShaking(false)}
                className={`space-y-2 rounded-lg border px-3 py-3 ${licenseValidationVisible ? "border-destructive bg-destructive/10 ring-1 ring-destructive/20" : "border-border bg-muted/50"} ${licenseCardShaking ? "animate-shake" : ""}`}
              >
                {requiredLicenses.map((license, index) => {
                  const licenseKey = comfyUiLicenseKey(license);
                  const checkboxId = `workflow-license-${index}`;
                  return (
                    <div key={licenseKey} className="hilo-checkbox-label flex items-start">
                      <Checkbox
                        id={checkboxId}
                        checked={selectedLicenseKeys.has(licenseKey)}
                        aria-invalid={
                          licenseValidationVisible && !selectedLicenseKeys.has(licenseKey)
                        }
                        onCheckedChange={(checked) =>
                          handleToggleLicense(licenseKey, checked === true)
                        }
                        disabled={isSavingAcceptance}
                        data-action-ui-id={`workflows-license-accept-${license.id}`}
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={checkboxId}
                          className="block cursor-pointer text-xs leading-5 text-foreground"
                        >
                          {license.acceptanceText}
                        </label>
                        {license.notice ? (
                          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                            {license.notice}
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="mt-1 -ml-2 border-0 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            void openExternalUrl(platform, license.url, {
                              source: `workflows.download.license.${license.id}`,
                            })
                          }
                          data-action-ui-id={`workflows-download-license-${license.id}`}
                        >
                          {license.name}
                          <ExternalLink size={12} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </fieldset>
              {licenseValidationVisible ? (
                <p
                  id="workflows-download-license-required"
                  className="mt-2 text-[11px] text-destructive"
                  role="alert"
                >
                  {t("workflows.downloadDialog.licenseRequired")}
                </p>
              ) : null}
              {acceptanceSaveFailed ? (
                <p className="mt-2 text-[11px] text-destructive" role="alert">
                  {t("workflows.downloadDialog.licenseSaveFailed")}
                </p>
              ) : null}
            </section>
          ) : null}
          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {t("workflows.downloadDialog.fileList")}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground" role="status">
                  {availabilitySnapshot === null
                    ? t("workflows.downloadDialog.scanningLocalResources")
                    : allModelsAvailable
                      ? t("workflows.downloadDialog.allResourcesFound")
                      : availabilitySnapshot.scanComplete
                        ? t("workflows.downloadDialog.missingResources", {
                            count: missingModelCount,
                          })
                        : t("workflows.downloadDialog.partialScan", {
                            count: missingModelCount,
                          })}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {t("workflows.downloadDialog.fileCount", {
                  count: fileCount,
                })}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                <FileJson2 className="size-4 text-muted-foreground" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {workflow?.name ?? "workflow"}.json
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("workflows.downloadDialog.workflowFile")}
                  </p>
                </div>
              </div>
              {dependencies.map((dependency) => {
                const key = `${dependency.directory}/${dependency.name}`;
                const availability = availabilityByKey.get(key);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                  >
                    <Package className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {dependency.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("workflows.downloadDialog.modelFile", {
                          directory: dependency.directory,
                        })}
                      </p>
                      {availability?.modelsDirectory ? (
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {availability.modelsDirectory}
                          {!availability.registered
                            ? ` · ${t("workflows.downloadDialog.registerOnUse")}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 text-[11px] ${availableModelKeys.has(key) ? "text-foreground" : "text-muted-foreground"}`}
                      data-model-availability={
                        availabilitySnapshot === null
                          ? "scanning"
                          : availableModelKeys.has(key)
                            ? "available"
                            : "missing"
                      }
                    >
                      {availabilitySnapshot === null
                        ? t("workflows.downloadDialog.scanning")
                        : availableModelKeys.has(key)
                          ? t("workflows.downloadDialog.localResourceFound")
                          : t("workflows.downloadDialog.downloadRequired")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="flex gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
            <HardDrive className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
            <p>{t("workflows.downloadDialog.hint")}</p>
          </div>
        </div>
        <DialogFooter className="shrink-0 flex-row items-end justify-between gap-4 border-t border-border bg-popover px-6 py-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <label
                className="shrink-0 text-[11px] font-medium text-muted-foreground"
                htmlFor="workflow-model-download-directory"
              >
                {t("workflows.downloadDialog.directoryLabel")}
              </label>
              <Input
                id="workflow-model-download-directory"
                value={modelsDirectory}
                readOnly={true}
                className="min-w-0 flex-1 font-mono"
                aria-label={t("workflows.downloadDialog.directoryLabel")}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handlePickDirectory()}
                disabled={isPickingDirectory || isDetecting}
                data-action-ui-id="workflows-download-directory-picker"
              >
                <LocalFolderIcon className="size-4" />
                {isPickingDirectory
                  ? t("workflows.downloadDialog.directoryPicking")
                  : t("workflows.downloadDialog.directoryChange")}
              </Button>
            </div>
            {directoryError ? (
              <p className="text-[11px] text-destructive" role="alert">
                {t("workflows.downloadDialog.directoryChangeFailed")}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="shrink-0"
            onClick={() => void handleConfirm()}
            disabled={
              !licenseStateHydrated ||
              isSavingAcceptance ||
              isDetecting ||
              availabilitySnapshot === null ||
              isPickingDirectory ||
              !modelsDirectory
            }
            loading={isDetecting}
            data-action-ui-id="workflows-download-confirm"
          >
            {isDetecting
              ? t("workflows.downloadDialog.scanningDisk")
              : licenseStateHydrated
                ? canUseLocalResources
                  ? t("workflows.downloadDialog.useLocalResources")
                  : t("workflows.downloadDialog.confirm")
                : t("workflows.downloadDialog.checkingLicenses")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
