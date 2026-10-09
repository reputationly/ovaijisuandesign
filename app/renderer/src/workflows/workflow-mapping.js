// 工作流接口数据的整理：校验字段、归一化授权/署名/推荐/模型依赖，并生成列表项。纯函数。
export function isInstalledFeaturedWorkflow(workflow) {
  return workflow.source === "user" && "featuredWorkflow" in workflow;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asHttpsUrl(value) {
  const text = asString(value);
  if (!text) return void 0;
  try {
    return new URL(text).protocol === "https:" ? text : void 0;
  } catch {
    return void 0;
  }
}
const ATTRIBUTION_ROLES = new Set([
  "workflow_curation",
  "workflow_reference",
  "base_model",
  "component_model",
  "model_packaging",
  "community_extension",
  "official_service",
]);
const ATTRIBUTION_SOURCE_KINDS = new Set(["minimax_official", "hub_curated", "third_party"]);
function mapAttributionLicense(value) {
  const record = asRecord(value);
  const id = asString(record?.id);
  const name = asString(record?.name);
  const revision = asString(record?.revision);
  const url = asHttpsUrl(record?.url);
  const notice = record?.notice === void 0 ? void 0 : asString(record.notice);
  const acceptanceRequired = record?.acceptanceRequired;
  const acceptanceText =
    record?.acceptanceText === void 0 ? void 0 : asString(record.acceptanceText);
  if (
    !id ||
    !name ||
    !revision ||
    !url ||
    typeof acceptanceRequired !== "boolean" ||
    (record?.notice !== void 0 && !notice) ||
    (record?.acceptanceText !== void 0 && !acceptanceText) ||
    (acceptanceRequired && !acceptanceText) ||
    (!acceptanceRequired && acceptanceText)
  ) {
    return null;
  }
  return {
    id,
    name,
    revision,
    url,
    ...(notice
      ? {
          notice,
        }
      : {}),
    acceptanceRequired,
    ...(acceptanceText
      ? {
          acceptanceText,
        }
      : {}),
  };
}
function mapAttributions(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value)) return null;
  const attributions = [];
  const ids = new Set();
  for (const valueItem of value) {
    const item = asRecord(valueItem);
    const id = asString(item?.id);
    const role = item?.role;
    const sourceKind = item?.sourceKind;
    const name = asString(item?.name);
    const url = item?.url === void 0 ? void 0 : asHttpsUrl(item.url);
    const modified = item?.modified;
    const licenses =
      item?.licenses === void 0
        ? []
        : Array.isArray(item.licenses)
          ? item.licenses.map(mapAttributionLicense)
          : null;
    if (
      !id ||
      ids.has(id) ||
      !ATTRIBUTION_ROLES.has(role) ||
      !ATTRIBUTION_SOURCE_KINDS.has(sourceKind) ||
      !name ||
      (item?.url !== void 0 && !url) ||
      typeof modified !== "boolean" ||
      !licenses ||
      licenses.some((license) => license === null)
    ) {
      return null;
    }
    ids.add(id);
    attributions.push({
      id,
      role,
      sourceKind,
      name,
      ...(url
        ? {
            url,
          }
        : {}),
      modified,
      ...(licenses.length
        ? {
            licenses,
          }
        : {}),
    });
  }
  return attributions;
}
function asPositiveSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
}
function mapRecommendation(value) {
  const record = asRecord(value);
  const systemMemoryBytes = asPositiveSafeInteger(record?.systemMemoryBytes);
  const freeStorageBytes = asPositiveSafeInteger(record?.freeStorageBytes);
  if (
    systemMemoryBytes === void 0 ||
    freeStorageBytes === void 0 ||
    !Array.isArray(record?.platforms) ||
    record.platforms.length === 0
  ) {
    return null;
  }
  const operatingSystems = new Set();
  const platforms = record.platforms.flatMap((item) => {
    const platform = asRecord(item);
    if (!platform) return [];
    const os = platform.os;
    if ((os !== "darwin" && os !== "win32" && os !== "linux") || operatingSystems.has(os)) {
      return [];
    }
    if (!Array.isArray(platform.architectures) || platform.architectures.length === 0) return [];
    const architectures = platform.architectures.filter(
      (architecture) => architecture === "arm64" || architecture === "x64",
    );
    if (
      architectures.length !== platform.architectures.length ||
      new Set(architectures).size !== architectures.length
    ) {
      return [];
    }
    const gpu = asRecord(platform.gpu);
    if (!gpu) return [];
    const mode = gpu.mode;
    if (mode !== "any" && mode !== "dedicated" && mode !== "unified" && mode !== "not_required") {
      return [];
    }
    const minimumMemoryBytes = asPositiveSafeInteger(gpu.minimumMemoryBytes);
    const vendor = gpu.vendor;
    const validVendor =
      vendor === void 0 ||
      vendor === "nvidia" ||
      vendor === "amd" ||
      vendor === "intel" ||
      vendor === "apple";
    if (
      !validVendor ||
      ((mode === "dedicated" || mode === "unified") && minimumMemoryBytes === void 0) ||
      ((mode === "any" || mode === "not_required") &&
        (gpu.minimumMemoryBytes !== void 0 || vendor !== void 0))
    ) {
      return [];
    }
    const minVersion = asString(platform.minVersion);
    if (platform.minVersion !== void 0 && !minVersion) return [];
    if (minVersion && !/^\d+(?:\.\d+){0,3}$/.test(minVersion)) return [];
    operatingSystems.add(os);
    return [
      {
        os,
        architectures,
        ...(minVersion
          ? {
              minVersion,
            }
          : {}),
        gpu: {
          mode,
          ...(minimumMemoryBytes !== void 0
            ? {
                minimumMemoryBytes,
              }
            : {}),
          ...(vendor
            ? {
                vendor,
              }
            : {}),
        },
      },
    ];
  });
  return platforms.length === record.platforms.length
    ? {
        systemMemoryBytes,
        freeStorageBytes,
        platforms,
      }
    : null;
}
function mapModelDependencies(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value)) return null;
  const dependencies = [];
  for (const item of value) {
    const record = asRecord(item);
    const name = asString(record?.name);
    const directory = asString(record?.directory);
    if (!name || !directory) return null;
    dependencies.push({
      name,
      directory,
      ...(asString(record?.url)
        ? {
            url: asString(record?.url),
          }
        : {}),
      ...(asString(record?.hash)
        ? {
            hash: asString(record?.hash),
          }
        : {}),
      ...(asString(record?.hash_type)
        ? {
            hash_type: asString(record?.hash_type),
          }
        : {}),
    });
  }
  return dependencies;
}
function mapWorkflowItem(value, source) {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id) ?? asString(record.name);
  const name = asString(record.name) ?? (source === "official" ? id : void 0);
  if (!id || !name) return null;
  const base = {
    id,
    name,
    ...(asString(record.displayName) || asString(record.title)
      ? {
          displayName: asString(record.displayName) ?? asString(record.title),
        }
      : {}),
    ...(typeof record.shortDesc === "string" || typeof record.short_desc === "string"
      ? {
          shortDesc:
            typeof record.shortDesc === "string"
              ? record.shortDesc.trim()
              : record.short_desc.trim(),
        }
      : {}),
    tags: asStringArray(record.tags),
    ...(asStringArray(record.tagIds).length || asStringArray(record.tag_ids).length
      ? {
          tagIds: asStringArray(record.tagIds).length
            ? asStringArray(record.tagIds)
            : asStringArray(record.tag_ids),
        }
      : {}),
    ...(asString(record.coverUrl)
      ? {
          coverUrl: asString(record.coverUrl),
        }
      : {}),
    ...(asString(record.author)
      ? {
          author: asString(record.author),
        }
      : {}),
    ...((asNumber(record.nodeCount) ?? asNumber(record.node_count)) !== void 0
      ? {
          nodeCount: asNumber(record.nodeCount) ?? asNumber(record.node_count),
        }
      : {}),
    ...((asNumber(record.linkCount) ?? asNumber(record.link_count)) !== void 0
      ? {
          linkCount: asNumber(record.linkCount) ?? asNumber(record.link_count),
        }
      : {}),
    ...(asStringArray(record.nodeTypes).length || asStringArray(record.node_types).length
      ? {
          nodeTypes: asStringArray(record.nodeTypes).length
            ? asStringArray(record.nodeTypes)
            : asStringArray(record.node_types),
        }
      : {}),
    ...(asStringArray(record.groups).length
      ? {
          groups: asStringArray(record.groups),
        }
      : {}),
    ...(asStringArray(record.models).length
      ? {
          models: asStringArray(record.models),
        }
      : {}),
    ...((asNumber(record.fileSize) ?? asNumber(record.size_bytes)) !== void 0
      ? {
          fileSize: asNumber(record.fileSize) ?? asNumber(record.size_bytes),
        }
      : {}),
    ...((asNumber(record.updatedAt) ?? asNumber(record.modified_at)) !== void 0
      ? {
          updatedAt: asNumber(record.updatedAt) ?? asNumber(record.modified_at),
        }
      : {}),
  };
  if (source === "official") {
    const shortDesc = asString(record.shortDesc);
    const longDesc = asString(record.longDesc);
    const attributions = mapAttributions(record.attributions);
    if (!shortDesc || !longDesc) return null;
    const detailMediaUrl = asString(record.detailMediaUrl);
    if (record.detailMediaUrl !== void 0 && !detailMediaUrl) return null;
    const modelDependencies = mapModelDependencies(
      record.modelDependencies ?? record.model_dependencies,
    );
    const recommendation = mapRecommendation(record.recommendation);
    if (modelDependencies === null || !recommendation || !attributions) return null;
    return {
      ...base,
      shortDesc,
      longDesc,
      ...(attributions.length
        ? {
            attributions,
          }
        : {}),
      ...(detailMediaUrl
        ? {
            detailMediaUrl,
          }
        : {}),
      source: "official",
      ...(modelDependencies.length
        ? {
            modelDependencies,
          }
        : {}),
      recommendation,
      ...(asString(record.downloadUrl)
        ? {
            downloadUrl: asString(record.downloadUrl),
          }
        : {}),
      ...(asString(record.hash)
        ? {
            hash: asString(record.hash),
          }
        : {}),
      ...(typeof record.installed === "boolean"
        ? {
            installed: record.installed,
          }
        : {}),
    };
  }
  const path = asString(record.path) ?? `${name}.json`;
  const featuredWorkflow = mapWorkflowItem(
    record.featuredWorkflow ?? record.featured_workflow,
    "official",
  );
  return path
    ? {
        ...base,
        source: "user",
        path,
        ...(typeof record.agent_enabled === "boolean"
          ? {
              agentEnabled: record.agent_enabled,
            }
          : {}),
        ...(featuredWorkflow?.source === "official"
          ? {
              featuredWorkflow,
            }
          : {}),
      }
    : null;
}
export function mapComfyWorkflowListResponse(payload, source) {
  const record = asRecord(payload);
  const rawItems = record?.workflows;
  const workflows = Array.isArray(rawItems)
    ? rawItems.map((item) => mapWorkflowItem(item, source)).filter((item) => item !== null)
    : [];
  const total =
    typeof record?.total === "number" && Number.isFinite(record.total)
      ? record.total
      : workflows.length;
  return {
    workflows,
    total,
  };
}
export function workflowPresentation(workflow) {
  if (!isInstalledFeaturedWorkflow(workflow)) return workflow;
  return {
    ...workflow.featuredWorkflow,
    // Local display edits take precedence without changing the Featured snapshot.
    displayName: workflow.displayName ?? workflow.featuredWorkflow.displayName,
    shortDesc: workflow.shortDesc ?? workflow.featuredWorkflow.shortDesc,
  };
}
export function workflowDisplayName(workflow) {
  const presentation = workflowPresentation(workflow);
  return presentation.displayName?.trim() || presentation.name;
}
export function workflowMatchesSearch(workflow, search) {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return true;
  const presentation = workflowPresentation(workflow);
  return [
    workflow.name,
    presentation.displayName,
    presentation.shortDesc,
    presentation.longDesc,
    ...presentation.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}
