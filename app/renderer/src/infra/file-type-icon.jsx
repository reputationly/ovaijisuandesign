// file-type-icon.jsx
import { ARCHIVE_ZIPPER, BODY, FOLD, JPEG, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const normalizeLabel = (value) => {
  const raw2 = value?.trim().replace(/^\./, "").toUpperCase() ?? "";
  return /^[A-Z0-9][A-Z0-9_-]*$/.test(raw2) ? raw2 : "FILE";
};

export const FileTypeIcon = reactExports.forwardRef(function FileTypeIcon2(
  {
    category,
    recognition,
    typeLabel,
    readFailure = false,
    size: size2 = 32,
    decorative = false,
    accessibleLabel,
    className,
  },
  ref,
) {
  if (![14, 16, 24, 28, 32, 48, 64, 80, 99].includes(size2)) {
    throw new RangeError("FileTypeIcon requires a documented size preset");
  }
  const text2 = normalizeLabel(typeLabel);
  const visibleText = text2.length > 8 ? `${text2.slice(0, 7)}…` : text2;
  const status = readFailure
    ? "unreadable"
    : recognition === "known"
      ? "ready"
      : "unknown";
  const visualCategory = status === "ready" ? category : "neutral";
  if (!decorative && !accessibleLabel?.trim()) {
    throw new Error(
      "FileTypeIcon requires an i18n accessibleLabel when decorative is false",
    );
  }
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      className={["file-type-icon", className].filter(Boolean).join(" ")}
      data-slot="file-type-icon"
      data-category={visualCategory}
      data-status={status}
      width={size2}
      height={(size2 * 117) / 99}
      viewBox="0 0 99 117"
      fill="none"
      focusable="false"
      role={decorative ? void 0 : "img"}
      aria-hidden={decorative || void 0}
      aria-label={decorative ? void 0 : accessibleLabel}
    >
      <path
        className="file-type-icon__body"
        fillRule="evenodd"
        clipRule="evenodd"
        d={BODY}
      />
      <path
        className="file-type-icon__accent"
        fillRule="evenodd"
        clipRule="evenodd"
        d={FOLD}
      />
      {visualCategory === "archive" && (
        <path
          className="file-type-icon__accent file-type-icon__archive-zipper"
          d={ARCHIVE_ZIPPER}
          transform="translate(24 4)"
        />
      )}
      <rect
        className="file-type-icon__accent"
        y="55.754"
        width="85"
        height="34"
        rx="4"
      />
      {visibleText === "JPEG" ? (
        <path className="file-type-icon__label" d={JPEG} />
      ) : (
        <text
          className="file-type-icon__label file-type-icon__text"
          x="42.5"
          y="81.254"
          textAnchor="middle"
          fontSize={visibleText.length > 4 ? 20 : 24}
          textLength={Math.min(69, visibleText.length * 17)}
          lengthAdjust="spacingAndGlyphs"
        >
          {visibleText}
        </text>
      )}
      {status !== "ready" && (
        <g className="file-type-icon__badge">
          <circle cx="83" cy="100" r="11" />
          <path
            d={
              status === "unknown"
                ? "M79.5 97a3.5 3.5 0 0 1 7 0c0 2-3.5 2.2-3.5 4"
                : "M83 94.5v7"
            }
          />
          <circle className="file-type-icon__dot" cx="83" cy="105" r="1.15" />
        </g>
      )}
    </svg>
  );
});
