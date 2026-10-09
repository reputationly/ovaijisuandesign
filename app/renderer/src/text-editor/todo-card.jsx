// todo-card.jsx
import { CompositedSvg, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";

const TODO_STATUS_ICON = {
  completed: "✅",
  in_progress: "⏳",
  pending: "⬜",
  cancelled: "❌",
};

function parseTodos(args) {
  if (!args) return [];
  try {
    const parsed = JSON.parse(args);
    const todos = parsed?.todos ?? parsed;
    if (!Array.isArray(todos)) return [];
    return todos.filter(
      (item) =>
        typeof item?.content === "string" &&
        typeof item?.status === "string" &&
        typeof item?.priority === "string",
    );
  } catch {}
  return [];
}

export function TodoCard({ msg }) {
  const { t: t2 } = useTranslation();
  const todos = reactExports.useMemo(
    () => parseTodos(msg.toolArgs ?? msg.url),
    [msg.toolArgs, msg.url],
  );
  const completed = todos.filter((todo) => todo.status === "completed").length;
  const pct =
    todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;
  return (
    <div className="min-w-0 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-body-14">
        <span className="font-medium text-muted-foreground shrink-0">
          {t2("chat.todoList")}
        </span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden max-w-20">
            <div
              className="h-full bg-foreground/50 rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
              }}
            />
          </div>
          <span className="text-caption-11 text-muted-foreground shrink-0">
            {completed}/{todos.length}
          </span>
        </div>
      </div>
      {todos.length > 0 && (
        <div className="flex items-start gap-1 w-full min-w-0">
          <span className="shrink-0 size-6 flex items-center justify-center text-tertiary">
            <CompositedSvg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-current"
            >
              <path
                d="M10 0V10C10 11.1046 10.8954 12 12 12H22"
                stroke="currentColor"
              />
            </CompositedSvg>
          </span>
          <div className="flex-1 min-w-0 flex flex-col gap-2 text-body-14">
            {todos.map((todo) => (
              <div key={todo.content} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {TODO_STATUS_ICON[todo.status] ?? TODO_STATUS_ICON.pending}
                </span>
                <span
                  className={`flex-1 text-muted-foreground ${todo.status === "completed" ? "line-through" : ""}`}
                >
                  {redactForCurrentRegion(todo.content)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
