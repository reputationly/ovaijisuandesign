// hub-logo.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "./dialog-content.jsx";
import mascotUrl from "../brand/suanli-mascot.png";
export function HubLogo({
  size: size2 = 20,
  className,
  alt = "蒜狸小助手",
  winkOnHover: _winkOnHover,
  eyeTrackingScope: _eyeTrackingScope,
  style,
  ...rest
}) {
  return (
    <img
      src={mascotUrl}
      width={size2}
      height={size2}
      alt={alt}
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width: size2, height: size2, ...style }}
      {...rest}
    />
  );
}
