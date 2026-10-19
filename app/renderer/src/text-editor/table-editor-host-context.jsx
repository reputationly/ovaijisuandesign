import { default as reactExports } from "react";
export const TableEditorHostContext = reactExports.createContext({});

export const TableEditorHostProvider = TableEditorHostContext.Provider;

export function useTableEditorActive() {
  return reactExports.useContext(TableEditorHostContext).active ?? true;
}
