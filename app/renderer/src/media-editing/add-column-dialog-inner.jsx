// add-column-dialog-inner.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Dialog } from "../canvas/separator.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../generation/select-content.jsx";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./use-preview-text.jsx";
import { Input, Label } from "./input.jsx";
const TYPE_OPTIONS = [
  {
    value: "text",
    labelKey: "canvas.table.field.text",
    defaultLabel: "Text",
  },
  {
    value: "number",
    labelKey: "canvas.table.field.number",
    defaultLabel: "Number",
  },
  {
    value: "attachment",
    labelKey: "canvas.table.field.attachment",
    defaultLabel: "Attachment",
  },
];
function AddColumnDialogInner({ onCommit, onClose }) {
  const { t } = useTranslation();
  const [title, setTitle] = reactExports.useState("");
  const [type, setType] = reactExports.useState("text");
  const inputRef = reactExports.useRef(null);
  const typeLabels = reactExports.useMemo(
    () =>
      Object.fromEntries(
        TYPE_OPTIONS.map((option) => [
          option.value,
          t(option.labelKey, option.defaultLabel),
        ]),
      ),
    [t],
  );
  reactExports.useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const handleSubmit = reactExports.useCallback(() => {
    const trimmed =
      title.trim() || t("canvas.table.untitledColumn", "Untitled");
    onCommit({
      title: trimmed,
      type,
    });
  }, [title, type, onCommit, t]);
  const handleOpenChange = reactExports.useCallback(
    (open) => {
      if (!open) onClose();
    },
    [onClose],
  );
  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gap-4 sm:max-w-[360px]"
        onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {t("canvas.table.addColumn", "Add column")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-col-title" className="text-muted-foreground">
            {t("canvas.table.fieldName", "Title")}
          </Label>
          <Input
            id="add-col-title"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Enter") {
                keyEvent.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t(
              "canvas.table.fieldNamePlaceholder",
              "Enter field title",
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">
            {t("canvas.table.fieldType", "Type")}
          </Label>
          <Select
            value={type}
            items={typeLabels}
            onValueChange={(value) => {
              if (value != null) setType(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit}>{t("common.confirm", "Add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export const AddColumnDialog = reactExports.memo(AddColumnDialogInner);
