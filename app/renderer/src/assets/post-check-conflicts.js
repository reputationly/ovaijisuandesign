// post-check-conflicts.js
import { API_PATHS } from "../vendor.js";

export async function postCheckConflicts(gatewayFetch2, body2) {
  const res = await gatewayFetch2(API_PATHS.checkConflicts, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  });
  if (!res.ok) {
    throw new Error(`checkConflicts failed: ${res.status} ${res.statusText}`);
  }
  let parsed;
  try {
    parsed = await res.json();
  } catch (err) {
    throw new Error(
      `checkConflicts response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const conflicts = parsed.conflicts;
  return {
    ok: true,
    conflicts: Array.isArray(conflicts) ? conflicts : [],
  };
}

export const activeToastIds = [];
