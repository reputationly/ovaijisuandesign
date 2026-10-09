// 运营后台的批量发布弹窗。
import {
  h as useTranslation,
  r as reactExports,
  gj as DialogHeader,
  fM as Button,
  as as Dialog,
  at as DialogContent,
  g8 as DialogTitle,
  g9 as DialogDescription,
  kS as DialogFooter,
  iX as Label,
  iY as Select,
  iZ as SelectTrigger,
  i_ as SelectValue,
  i$ as SelectContent,
  j0 as SelectItem,
} from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { publicationSections } from "./operator.js";
export function BatchPublishDialog({ count, onClose, onPublish }) {
  const { t } = useTranslation();
  const [section, setSection] = reactExports.useState(null);
  const [publishing, setPublishing] = reactExports.useState(false);
  const inFlight = reactExports.useRef(false);
  const handlePublish = async () => {
    if (!section || count === 0 || inFlight.current) return;
    inFlight.current = true;
    setPublishing(true);
    try {
      if (await onPublish(section)) onClose();
    } finally {
      inFlight.current = false;
      setPublishing(false);
    }
  };
  return (
    <Dialog open={true} onOpenChange={(open) => !open && !inFlight.current && onClose()}>
      <DialogContent
        size="lg"
        className="rounded-xl"
        data-action-ui-id="operations-batch-publish-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("skills.operation.batchPublishTitle")}</DialogTitle>
          <DialogDescription>
            {t("skills.operation.batchPublishDescription", {
              count,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <Label htmlFor="batch-publish-section">{t("skills.operation.publishSection")}</Label>
          <Select
            value={section}
            disabled={publishing}
            onValueChange={(value) => {
              if (value && Object.hasOwn(publicationSections, value)) {
                setSection(value);
              }
            }}
          >
            <SelectTrigger
              id="batch-publish-section"
              className="w-full"
              data-action-ui-id="operations-batch-publish-section"
            >
              <SelectValue placeholder={t("skills.operation.publishSectionPlaceholder")}>
                {section
                  ? t(publicationSections[section])
                  : t("skills.operation.publishSectionPlaceholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(publicationSections).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {t(label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("skills.operation.publishOrderHint")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={publishing} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!section || count === 0 || publishing}
            onClick={() => void handlePublish()}
            data-action-ui-id="operations-batch-publish-confirm"
          >
            {t("skills.operation.confirmPublish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
