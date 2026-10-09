// sortable-queued-row.jsx
import {
  closestCenter,
  CSS$1,
  DndContext,
  jsxRuntimeExports,
  KeyboardSensor,
  Loader2,
  PointerSensor,
  reactExports,
  SortableContext,
  sortableKeyboardCoordinates,
  useSensor,
  useSensors,
  useSortable,
  useTranslation,
  verticalListSortingStrategy,
} from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CornerDownRight,
  Paperclip,
  Trash2,
} from "../media-editing/package.jsx";
import { Button$1, TooltipContent } from "../infra/dialog-content.jsx";
import { PencilIcon } from "../workspace/home-service.jsx";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import { applyQueuedMessageScrollRequest } from "../workspace/resolve-retry-message-payload.jsx";

const restrictToVerticalAxis = ({ transform: transform2 }) => ({
  ...transform2,
  x: 0,
});

const restrictToParentElement = ({
  transform: transform2,
  draggingNodeRect,
  containerNodeRect,
}) => {
  if (!draggingNodeRect || !containerNodeRect) return transform2;
  const next2 = {
    ...transform2,
  };
  if (draggingNodeRect.top + next2.y < containerNodeRect.top) {
    next2.y = containerNodeRect.top - draggingNodeRect.top;
  }
  if (draggingNodeRect.bottom + next2.y > containerNodeRect.bottom) {
    next2.y = containerNodeRect.bottom - draggingNodeRect.bottom;
  }
  return next2;
};

function SortableQueuedRow({
  id: id2,
  message: message2,
  index: index2,
  draggable,
  onEdit,
  onDelete,
  onSendNow,
  t: t2,
}) {
  const {
    attributes,
    listeners: listeners2,
    setNodeRef,
    transform: transform2,
    transition: transition2,
    isDragging,
  } = useSortable({
    id: id2,
  });
  const style2 = {
    transform: CSS$1.Transform.toString(transform2),
    transition: transition2,
    opacity: isDragging ? 0.9 : 1,
    // 提高拖拽时的层级,避免被相邻行覆盖
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };
  const displayText = message2.text
    ? redactForCurrentRegion(message2.text)
    : t2("chat.queue.attachmentOnly");
  return (
    <div
      ref={setNodeRef}
      data-queued-client-message-id={message2.clientMessageId}
      style={style2}
      className={`group/queued-row relative flex h-8 items-center gap-1 rounded-md pr-0.5 text-xs text-muted-foreground ${isDragging ? "bg-foreground/5" : ""}`}
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners2}
          className="absolute -left-3 top-1/2 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground/40 transition-colors group-hover/queued-row:text-foreground/70 hover:bg-transparent hover:text-foreground/70 focus-visible:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 cursor-grab active:cursor-grabbing"
          aria-label={t2("chat.queue.dragToReorder", {
            defaultValue: "Drag to reorder",
          })}
        >
          <span
            className="grid -translate-x-0.5 grid-cols-2 gap-0.5"
            aria-hidden={true}
          >
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
          </span>
        </button>
      )}
      <span className="w-4 text-right tabular-nums shrink-0">{index2 + 1}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">
        {displayText}
      </span>
      {(message2.attachments?.length ?? 0) > 0 && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap shrink-0 mr-1">
          <Paperclip className="size-3" />
          {message2.attachments?.length}
        </span>
      )}
      <div className="flex h-7 w-36 shrink-0 items-center justify-end gap-1">
        {message2.status === "sending" ? (
          // 瞬态状态原位替换动作区；固定 action rail 宽度避免发送时正文突然回流。
          <span className="inline-flex h-7 items-center gap-1 whitespace-nowrap pl-1.5 pr-2 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t2("chat.queue.sending")}
          </span>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-0.5 rounded-md pl-1.5 pr-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    aria-label={t2("chat.queue.sendNow")}
                    data-action-ui-id="chat-queued-message-send-now"
                    onClick={() => onSendNow(message2)}
                  >
                    <Icon icon={CornerDownRight} size="sm" aria-hidden={true} />
                    {message2.reviewPaused
                      ? t2("common.retry")
                      : t2("chat.queue.sendNow")}
                  </Button$1>
                }
              />
              <TooltipContent side="top">
                {t2(
                  "chat.queue.sendNowTooltip",
                  "Stop the current response and send immediately",
                )}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 -ml-1 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    aria-label={t2("chat.queue.edit")}
                    data-action-ui-id="chat-queued-message-edit"
                    onClick={() => onEdit(message2)}
                  >
                    <PencilIcon className="size-3" />
                  </Button$1>
                }
              />
              <TooltipContent side="top">
                {t2("chat.queue.edit")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 -ml-1 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-destructive"
                    aria-label={t2("chat.queue.delete")}
                    data-action-ui-id="chat-queued-message-delete"
                    onClick={() => onDelete(message2)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </Button$1>
                }
              />
              <TooltipContent side="top">
                {t2("chat.queue.delete")}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}

export function QueuedUserMessageList({
  messages: messages2,
  scrollRequest,
  onEdit,
  onDelete,
  onSendNow,
  onReorder,
}) {
  const { t: t2 } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const itemIds = reactExports.useMemo(
    () => messages2.map((m3) => m3.queueId ?? m3.clientMessageId),
    [messages2],
  );
  const queuedMessageScrollRef = reactExports.useRef(null);
  const [canScrollUp, setCanScrollUp] = reactExports.useState(false);
  const [canScrollDown, setCanScrollDown] = reactExports.useState(false);
  const syncQueuedMessageScroll = reactExports.useCallback(() => {
    const el = queuedMessageScrollRef.current;
    if (!el) return;
    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop < maxScrollTop - 1);
  }, []);
  reactExports.useLayoutEffect(() => {
    if (messages2.length === 0) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    const el = queuedMessageScrollRef.current;
    if (!el) return;
    syncQueuedMessageScroll();
    if (typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(syncQueuedMessageScroll);
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [messages2.length, syncQueuedMessageScroll]);
  reactExports.useLayoutEffect(() => {
    if (!scrollRequest) return;
    const el = queuedMessageScrollRef.current;
    if (!el) return;
    applyQueuedMessageScrollRequest(el, scrollRequest);
    syncQueuedMessageScroll();
  }, [scrollRequest, syncQueuedMessageScroll]);
  const handleDragEnd = reactExports.useCallback(
    (event) => {
      const { active: active2, over } = event;
      if (!over || active2.id === over.id) return;
      const sourceIndex = itemIds.indexOf(active2.id);
      const targetIndex = itemIds.indexOf(over.id);
      if (sourceIndex === -1 || targetIndex === -1) return;
      onReorder(sourceIndex, targetIndex);
    },
    [itemIds, onReorder],
  );
  if (messages2.length === 0) return null;
  const isDraggable = messages2.length >= 2;
  return (
    <div className="-mb-3 mx-3 overflow-hidden rounded-xl border border-border bg-card pl-3 pr-1 pt-1 pb-4 relative z-0">
      <div
        ref={queuedMessageScrollRef}
        onScroll={syncQueuedMessageScroll}
        data-action-ui-id="chat-queued-message-list"
        className="-ml-3 max-h-[min(9rem,calc(24vh-1.25rem-2px))] overflow-y-auto pl-3 scrollbar-none"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {messages2.map((message2, index2) => (
              <SortableQueuedRow
                key={message2.queueId ?? message2.clientMessageId}
                id={message2.queueId ?? message2.clientMessageId}
                message={message2}
                index={index2}
                draggable={isDraggable}
                onEdit={onEdit}
                onDelete={onDelete}
                onSendNow={onSendNow}
                t={t2}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {canScrollUp && (
        <div
          className="pointer-events-none absolute inset-x-px top-1 z-20 h-6 bg-gradient-to-b from-card via-card/80 to-transparent"
          data-action-ui-id="chat-queued-message-top-fade"
          aria-hidden="true"
        />
      )}
      {canScrollDown && (
        <div
          className="pointer-events-none absolute inset-x-px bottom-3 z-20 h-6 bg-gradient-to-b from-transparent via-card/80 to-card"
          data-action-ui-id="chat-queued-message-bottom-fade"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
