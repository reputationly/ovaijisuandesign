import { default as reactExports } from "react";
export const NodeIdContext = reactExports.createContext(null);

export const useNodeId = () => {
  const nodeId = reactExports.useContext(NodeIdContext);
  return nodeId;
};
