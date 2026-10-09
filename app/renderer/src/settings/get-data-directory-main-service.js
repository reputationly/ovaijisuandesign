// get-data-directory-main-service.js
import { services } from "../vendor-inline/vscode-base/graph.jsx";
import { IDataDirectoryMainService } from "../workspace/home-service.jsx";
let _service = null;
export function getDataDirectoryMainService() {
  if (!_service) {
    _service = services.get(IDataDirectoryMainService);
  }
  return _service;
}
export const DATA_DIRECTORY_STATUS_CHANGED_EVENT =
  "hilo:data-directory-status-changed";
