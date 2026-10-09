// 创作者计划表单的通用部件：必填标记、分区、字段、安装包与素材选择器。
import { e as Icon, fM as Button, X, cq as FileArchive, iX as Label } from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
function RequiredMark() {
  return <span className="ml-1 text-destructive">*</span>;
}
export function FormSection({ title, description, children }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="font-heading text-xs font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
export function Field$1({ label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
export function PackagePicker({
  inputRef,
  fileName,
  loading,
  title,
  hint,
  actionId,
  onFile,
  error,
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".zip,.tar.gz,application/zip,application/gzip"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-24 w-full border-dashed"
        loading={loading}
        data-action-ui-id={actionId}
        onClick={() => inputRef.current?.click()}
      >
        <Icon icon={FileArchive} size="lg" />
        <span className="flex flex-col items-start gap-1">
          <span>{fileName || title}</span>
          <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
        </span>
      </Button>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
export function AssetPicker({
  title,
  hint,
  icon,
  fileName,
  preview,
  inputRef,
  accept,
  onFile,
  onClear,
  actionId,
  clearLabel,
  clearable,
  required,
  error,
  onPreviewError,
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="relative h-28 w-full overflow-hidden border-dashed"
        onClick={() => inputRef.current?.click()}
        data-action-ui-id={actionId}
        aria-invalid={!!error}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={onPreviewError}
          />
        ) : (
          <Icon icon={icon} size="lg" />
        )}
        {!preview && (
          <span className="flex flex-col items-start gap-1">
            <span>{fileName || title}</span>
            <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
          </span>
        )}
      </Button>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {fileName && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{fileName}</span>
          {clearable && (
            <Button type="button" variant="ghost" size="icon-xs" onClick={onClear}>
              <Icon icon={X} size="xs" />
              <span className="sr-only">{clearLabel}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
