// changelog-detail-dialog.jsx
import { CircleArrowUp, reactExports, useTranslation, X$7 } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DialogClose } from "../infra/gateway-http-error.jsx";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";

export function ChangelogDetailDialog({
  item,
  onClose,
  onUpdate,
  imageUrl,
  onImageError,
}) {
  const { t: t2 } = useTranslation();
  const [imageVisible, setImageVisible] = reactExports.useState(
    Boolean(imageUrl),
  );
  reactExports.useEffect(() => {
    setImageVisible(Boolean(imageUrl));
  }, [imageUrl]);
  const closeButton = (
    <DialogClose
      render={
        <Button$1
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-2 right-2 z-10 rounded-full bg-black/45 text-white hover:bg-black/60 hover:text-white active:!translate-y-0 focus-visible:ring-white/80"
          data-action-ui-id="update.details.close"
        />
      }
    >
      <X$7 className="size-3" strokeWidth={1.8} />
      <span className="sr-only">{t2("common.close")}</span>
    </DialogClose>
  );
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[min(80vh,720px)] overflow-y-auto sm:max-w-md"
        showCloseButton={false}
      >
        {item && imageVisible && imageUrl ? (
          <div
            className="relative -mx-1 -mt-1 w-[calc(100%+0.5rem)] overflow-hidden rounded-lg bg-muted"
            data-action-ui-id="update.details.media"
          >
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="block h-auto w-full"
              loading="lazy"
              onError={onImageError ?? (() => setImageVisible(false))}
            />
            {closeButton}
          </div>
        ) : (
          closeButton
        )}
        <DialogHeader>
          <DialogTitle>{item ? item.version : ""}</DialogTitle>
          <DialogDescription>{item ? item.subtitle : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2 text-sm text-foreground">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t2("home.changelog")}
            </span>
            <ul className="flex flex-col gap-1 text-xs text-foreground/80">
              {item?.changelog.map((text2) => (
                <li key={text2}>
                  {"- "}
                  {text2}
                </li>
              ))}
            </ul>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{item?.date}</span>
            <span className="inline-flex rounded-sm bg-muted px-2 py-0.5 font-medium">
              {item ? item.badge : ""}
            </span>
          </div>
          {onUpdate && (
            <Button$1
              type="button"
              size="lg"
              className="w-full rounded-md"
              onClick={() => {
                onClose();
                onUpdate();
              }}
              data-action-ui-id="update.btn.installNow"
            >
              <CircleArrowUp
                data-icon="inline-start"
                className="size-4"
                strokeWidth={1.7}
              />
              {t2("update.btn.installNow")}
            </Button$1>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
