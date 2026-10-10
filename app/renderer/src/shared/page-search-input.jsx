// page-search-input.jsx
import { jsxRuntimeExports, Search, X$7 as X } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import { __jsx } from "./jsx-runtime.js";
function PageSearchInput({
  value,
  onValueChange,
  placeholder,
  ariaLabel = placeholder,
  clearLabel,
  inputActionId,
  clearActionId = `${inputActionId}-clear`,
}) {
  return (
    <div
      className="relative flex h-9 w-60 max-w-full shrink-0 items-center"
      data-slot="page-search-input"
    >
      <Icon
        icon={Search}
        tone="muted"
        size="sm"
        aria-hidden={true}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-9 pl-9 pr-9"
        data-action-ui-id={inputActionId}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={clearLabel}
          className="icon-muted-control absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          data-action-ui-id={clearActionId}
        >
          <Icon icon={X} tone="control" size="xs" aria-hidden={true} />
        </button>
      ) : null}
    </div>
  );
}
export { PageSearchInput };
