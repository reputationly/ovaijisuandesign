// catalog-page-heading.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";

export function CatalogPageHeading({
  title,
  description,
  level = 1,
  variant = "page",
  className,
}) {
  const Heading2 = level === 1 ? "h1" : "h2";
  const page = variant === "page";
  return (
    <div
      className={cn$2("min-w-0", className)}
      data-slot="catalog-page-heading"
    >
      <Heading2
        className={cn$2(
          "font-heading font-medium tracking-[0.02em] text-foreground",
          page ? "text-[20px] leading-tight" : "text-lg",
        )}
      >
        {title}
      </Heading2>
      <p
        className={cn$2(
          "text-[15px] leading-5 text-[var(--catalog-page-subtitle-foreground)]",
          page ? "mt-2" : "mt-1",
        )}
        data-slot="catalog-page-subtitle"
      >
        {description}
      </p>
    </div>
  );
}
