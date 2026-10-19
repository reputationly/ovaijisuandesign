import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { __jsx } from "../shared/jsx-runtime.js";
export function TokenIcon({
  size: size2 = 14
}) {
  return <CompositedSvg width={size2} height={size2} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M6.52105 2L7.25885 6.2093L4.80361 2.71115L2.71115 4.80361L6.2093 7.25885L2 6.52111V9.47895L6.2093 8.74115L2.71115 11.1964L4.80361 13.2889L7.25885 9.7907L6.52105 14H9.47889L8.74108 9.7907L11.1964 13.2889L13.2889 11.1964L9.7907 8.74115L14 9.47895V6.52111L9.7907 7.25885L13.2889 4.80361L11.1964 2.71115L8.74108 6.2093L9.47889 2H6.52105Z" />
    </CompositedSvg>;
}
export function CreditCostBadge({
  cost,
  className,
  compact: compact2 = false
}) {
  if (cost == null) return null;
  return <span data-slot="credit-cost-badge" className={`inline-flex items-center gap-1 whitespace-nowrap text-sm tracking-tight${compact2 ? " h-8 shrink-0 text-[13px] text-[var(--canvas-controls-text)]/70" : ""}${className ? ` ${className}` : ""}`}>
      <TokenIcon$2 />
      <span className={compact2 ? "pointer-events-none tabular-nums" : void 0} data-action-ui-id="image-edit.credit-cost">
        {cost}
      </span>
    </span>;
}