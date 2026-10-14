// hub-logo.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { mergeTailwindClasses as cn } from "./dialog-content.jsx";
import mascotUrl from "../brand/suanli-mascot.png";
export function HubLogo({
  size = 20,
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
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
}
