import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { Loader2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
export function Spinner({ className, ...props }) {
  const { t: t2 } = useTranslation();
  return (
    <Loader2Icon
      role="status"
      aria-label={t2("a11y.loading")}
      className={cn$5("size-4 animate-spin", className)}
      {...props}
    />
  );
}
