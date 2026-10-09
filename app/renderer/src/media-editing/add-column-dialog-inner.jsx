// add-column-dialog-inner.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Dialog$1 } from "../canvas/separator.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import {
  Select$2,
  SelectContent$1,
  SelectItem$1,
  SelectTrigger$1,
  SelectValue$1,
} from "../generation/select-content.jsx";
import {
  DialogContent$1,
  DialogFooter$1,
  DialogHeader$1,
  DialogTitle$1,
} from "./use-preview-text.jsx";
import { Input$1, Label$1 } from "./input.jsx";

const TYPE_OPTIONS$4 = [
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
        TYPE_OPTIONS$4.map((opt) => [
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
    <Dialog$1 open={true} onOpenChange={handleOpenChange}>
      <DialogContent$1
        className="gap-4 sm:max-w-[360px]"
        onKeyDown={(e2) => e2.stopPropagation()}
      >
        <DialogHeader$1>
          <DialogTitle$1>
            {t2("canvas.table.addColumn", "Add column")}
          </DialogTitle$1>
        </DialogHeader$1>
        <div className="flex flex-col gap-1.5">
          <Label$1 htmlFor="add-col-title" className="text-muted-foreground">
            {t2("canvas.table.fieldName", "Title")}
          </Label$1>
          <Input$1
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
          <Label$1 className="text-muted-foreground">
            {t2("canvas.table.fieldType", "Type")}
          </Label$1>
          <Select$2
            value={type2}
            items={typeLabels}
            onValueChange={(value) => {
              if (value != null) setType(value);
            }}
          >
            <SelectTrigger$1>
              <SelectValue$1 />
            </SelectTrigger$1>
            <SelectContent$1>
              {TYPE_OPTIONS$4.map((opt) => (
                <SelectItem$1 key={opt.value} value={opt.value}>
                  {t2(opt.labelKey, opt.defaultLabel)}
                </SelectItem$1>
              ))}
            </SelectContent$1>
          </Select$2>
        </div>
        <DialogFooter$1>
          <Button$2 variant="ghost" onClick={onClose}>
            {t2("common.cancel", "Cancel")}
          </Button$2>
          <Button$2 onClick={handleSubmit}>
            {t2("common.confirm", "Add")}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}

export const AddColumnDialog = reactExports.memo(AddColumnDialogInner);
