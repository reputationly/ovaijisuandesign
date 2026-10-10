// asset-center.js
import { AssetCenterPage } from "../assets/asset-center-page.jsx";
import { normalizeWorkspaceId } from "../settings/use-active-runtime.js";
function validateAssetCenterSearch(search) {
  const result = {};
  if (search.action === "create") result.action = "create";
  const returnWorkspaceId = normalizeWorkspaceId(search.returnWorkspaceId);
  if (returnWorkspaceId) result.returnWorkspaceId = returnWorkspaceId;
  return result;
}
const SplitComponent = AssetCenterPage;
export { SplitComponent as component, validateAssetCenterSearch };
