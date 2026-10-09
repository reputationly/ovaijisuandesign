// gateway-fetch.js
import { getBaseUrl } from "./gateway-http-error.jsx";
import { gatewayFetchFromBase } from "./perform-gateway-fetch.js";

export async function gatewayFetch(path2, options) {
  return gatewayFetchFromBase(getBaseUrl(), path2, options);
}
