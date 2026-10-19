import { default as reactExports } from "react";
export const PortalContainerContext = reactExports.createContext(null);

export function usePortalContainer() {
  return reactExports.useContext(PortalContainerContext) ?? void 0;
}
