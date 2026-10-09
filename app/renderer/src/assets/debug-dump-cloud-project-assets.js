// debug-dump-cloud-project-assets.js
import { requestJson } from "./list-all-cloud-folders.js";
import { CloudNodeType } from "../generation/normalize-skill-detail-metadata.js";

export async function debugDumpCloudProjectAssets(projectId) {
  const calls = [];
  const errorText = (err) => ({
    error: err instanceof Error ? err.message : String(err),
  });
  const record2 = async (url2, context) => {
    const entry = {
      seq: calls.length + 1,
      method: "GET",
      url: url2,
      response: null,
    };
    if (context) entry.context = context;
    calls.push(entry);
    try {
      const data2 = await requestJson(url2);
      entry.response = data2;
      return data2;
    } catch (err) {
      entry.response = errorText(err);
      return void 0;
    }
  };
  const queue = [
    {
      id: "",
      path: "/",
    },
  ];
  while (queue.length > 0) {
    const current2 = queue.shift();
    if (!current2) break;
    let cursor = "";
    do {
      const params = new URLSearchParams({
        project_id: projectId,
        node_id: current2.id,
        page_size: "100",
      });
      if (cursor) params.set("cursor", cursor);
      const page = await record2(
        `/api/v1/cloud-folder/nodes?${params}`,
        current2.path,
      );
      if (!page) break;
      for (const node2 of Array.isArray(page.nodes) ? page.nodes : []) {
        if (
          node2 &&
          typeof node2.id === "string" &&
          node2.id &&
          Number(node2.type) === CloudNodeType.CLOUD_NODE_TYPE_FOLDER
        ) {
          queue.push({
            id: node2.id,
            path: `${current2.path}${node2.name}/`,
          });
        }
      }
      cursor =
        page.has_more === true && typeof page.next_cursor === "string"
          ? page.next_cursor
          : "";
    } while (cursor);
  }
  await record2(
    `/api/v1/cloud-folder/storage?${new URLSearchParams({
      project_id: projectId,
    })}`,
  );
  let reviewCursor = "";
  do {
    const params = new URLSearchParams({
      project_id: projectId,
      page_size: "100",
    });
    if (reviewCursor) params.set("cursor", reviewCursor);
    const page = await record2(`/api/v1/cloud-folder/review-nodes?${params}`);
    if (!page) break;
    reviewCursor =
      page.has_more === true && typeof page.next_cursor === "string"
        ? page.next_cursor
        : "";
  } while (reviewCursor);
  return {
    project_id: projectId,
    fetched_at: new Date().toISOString(),
    calls,
  };
}
