// get-data-directory-main-service.js
import { services } from "../vendor-inline/vscode-base/graph.jsx";
import { IDataDirectoryMainService } from "../workspace/home-service.jsx";

let _service$3 = null;

export function getDataDirectoryMainService() {
  if (!_service$3) {
    _service$3 = services.get(IDataDirectoryMainService);
  }
  return _service$3;
}

export const DATA_DIRECTORY_STATUS_CHANGED_EVENT =
  "hilo:data-directory-status-changed";
