// use-canvas-actions.js
import reactExports from "react";

export const CanvasActionsContext = reactExports.createContext(null);

export function useCanvasActions() {
  const ctx = reactExports.useContext(CanvasActionsContext);
  if (!ctx) {
    throw new Error(
      "useCanvasActions must be used within a CanvasActionsContext.Provider",
    );
  }
  return ctx;
}
