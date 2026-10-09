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
  const { t: t2 } = useTranslation();
  const [title, setTitle] = reactExports.useState("");
  const [type2, setType] = reactExports.useState("text");
  const inputRef = reactExports.useRef(null);
  const typeLabels = reactExports.useMemo(
    () =>
      Object.fromEntries(
        TYPE_OPTIONS.map((opt) => [
          opt.value,
          t2(opt.labelKey, opt.defaultLabel),
        ]),
      ),
    [t2],
  );
  reactExports.useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const handleSubmit = reactExports.useCallback(() => {
    const trimmed =
      title.trim() || t2("canvas.table.untitledColumn", "Untitled");
    onCommit({
      title: trimmed,
      type: type2,
    });
  }, [title, type2, onCommit, t2]);
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
        onKeyDown={(e2) => e2.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {t2("canvas.table.addColumn", "Add column")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-col-title" className="text-muted-foreground">
            {t2("canvas.table.fieldName", "Title")}
          </Label>
          <Input
            id="add-col-title"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e2) => setTitle(e2.target.value)}
            onKeyDown={(e2) => {
              if (e2.key === "Enter") {
                e2.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t2(
              "canvas.table.fieldNamePlaceholder",
              "Enter field title",
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">
            {t2("canvas.table.fieldType", "Type")}
          </Label>
          <Select
            value={type2}
            items={typeLabels}
            onValueChange={(value) => {
              if (value != null) setType(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t2(opt.labelKey, opt.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t2("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit}>{t2("common.confirm", "Add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export const AddColumnDialog = reactExports.memo(AddColumnDialogInner);
