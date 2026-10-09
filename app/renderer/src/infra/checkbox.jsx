// checkbox.jsx
import { CheckboxRoot, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$5 } from "./dialog-content.jsx";

export function Checkbox({
  className,
  shape = "square",
  size: size2 = "md",
  appearance = "default",
  label,
  description,
  error,
  id: providedId,
  inputRef,
  form,
  onCheckedChange,
  onClick,
  indeterminate,
  ...props
}) {
  const generatedId = reactExports.useId();
  const id2 = providedId ?? `checkbox-${generatedId}`;
  const gradientId = `checkbox-gradient-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const handleInputRef = reactExports.useCallback(
    (node2) => {
      if (node2) {
        if (form) node2.setAttribute("form", form);
        else node2.removeAttribute("form");
      }
      if (typeof inputRef === "function") return inputRef(node2);
      if (inputRef) inputRef.current = node2;
    },
    [inputRef, form],
  );
  const describedBy =
    [
      props["aria-describedby"],
      description && `${id2}-description`,
      error && `${id2}-error`,
    ]
      .filter(Boolean)
      .join(" ") || void 0;
  const control = (
    <CheckboxRoot
      {...props}
      id={id2}
      inputRef={handleInputRef}
      indeterminate={indeterminate}
      onCheckedChange={(checked, details) =>
        onCheckedChange?.(indeterminate ? true : checked, details)
      }
      onClick={(event) => {
        const wasDefaultPrevented = event.defaultPrevented;
        onClick?.(event);
        if (!wasDefaultPrevented && event.defaultPrevented)
          event.preventBaseUIHandler();
      }}
      data-slot="checkbox"
      data-shape={shape}
      data-size={size2}
      data-appearance={appearance}
      aria-invalid={error ? true : props["aria-invalid"]}
      aria-describedby={describedBy}
      className={(state2) =>
        cn$5(
          "peer hilo-checkbox",
          typeof className === "function" ? className(state2) : className,
        )
      }
    >
      <svg
        className="hilo-checkbox__visual"
        viewBox="0 0 20 20"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop className="hilo-checkbox__stop-start" />
            <stop offset="1" className="hilo-checkbox__stop-end" />
          </linearGradient>
        </defs>
        <path
          className="hilo-checkbox__surface hilo-checkbox__square"
          d="M7.3 19H12.7C17.2 19 19 17.2 19 12.7V7.3C19 2.8 17.2 1 12.7 1H7.3C2.8 1 1 2.8 1 7.3V12.7C1 17.2 2.8 19 7.3 19Z"
        />
        <circle
          className="hilo-checkbox__surface hilo-checkbox__circle"
          cx="10"
          cy="10"
          r="9"
        />
        <circle
          className="hilo-checkbox__gradient hilo-checkbox__circle"
          cx="10"
          cy="10"
          r="9"
          fill={`url(#${gradientId})`}
        />
        <path
          className="hilo-checkbox__check"
          d="M5.75 10.25L8.6 13.1L14.25 7.45"
          pathLength="1"
        />
        <path className="hilo-checkbox__mixed" d="M6 10H14" />
      </svg>
    </CheckboxRoot>
  );
  if (!label && !description && !error) return control;
  return (
    <span
      className="hilo-checkbox-field"
      data-size={size2}
      data-disabled={props.disabled || void 0}
    >
      {control}
      <span className="hilo-checkbox-field__copy">
        {label && <label htmlFor={id2}>{label}</label>}
        {description && (
          <span
            className="hilo-checkbox-field__description"
            id={`${id2}-description`}
          >
            {description}
          </span>
        )}
        {error && (
          <span className="hilo-checkbox-field__error" id={`${id2}-error`}>
            {error}
          </span>
        )}
      </span>
    </span>
  );
}
