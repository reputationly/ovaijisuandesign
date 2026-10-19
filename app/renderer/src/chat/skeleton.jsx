import { __jsx } from "../shared/jsx-runtime.js";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
export function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn$5("animate-pulse rounded-full bg-muted", className)} {...props} />;
}
