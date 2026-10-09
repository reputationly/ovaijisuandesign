// 工作流与本机配置的兼容性判断（系统、显卡、内存、版本），纯函数。
const ITEM_KEYS$1 = ["os", "memory", "gpu", "storage"];
const SYSTEM_MEMORY_REPORTING_TOLERANCE_MAX_BYTES = 512 * 1024 ** 2;
const SYSTEM_MEMORY_REPORTING_TOLERANCE_RATIO = 0.01;
const GPU_MEMORY_REPORTING_TOLERANCE_BYTES = 512 * 1024 ** 2;
export function evaluateWorkflowCompatibility(recommendation, snapshot) {
  if (!recommendation || !snapshot) return unknownEvaluation();
  const platformRequirement = recommendation.platforms.find(
    (candidate) => candidate.os === snapshot.os.platform,
  );
  const osStatus = evaluateOperatingSystem(platformRequirement, snapshot);
  const statuses = {
    os: osStatus,
    memory: compareSystemMemoryMinimum(
      snapshot.systemMemoryBytes,
      recommendation.systemMemoryBytes,
    ),
    gpu:
      osStatus === "unsupported"
        ? "notApplicable"
        : evaluateGpu(platformRequirement?.gpu, snapshot),
    storage: compareMinimum(snapshot.storage.freeBytes, recommendation.freeStorageBytes),
  };
  return {
    statuses,
    result: ITEM_KEYS$1.some(
      (key) => statuses[key] === "insufficient" || statuses[key] === "unsupported",
    )
      ? "insufficient"
      : ITEM_KEYS$1.some((key) => statuses[key] === "unknown")
        ? "review"
        : "likely",
  };
}
function unknownEvaluation() {
  return {
    statuses: {
      os: "unknown",
      memory: "unknown",
      gpu: "unknown",
      storage: "unknown",
    },
    result: "review",
  };
}
function evaluateOperatingSystem(requirement, snapshot) {
  if (!requirement) return "unsupported";
  if (!requirement.architectures.includes(snapshot.os.arch)) {
    return "unsupported";
  }
  if (!requirement.minVersion) return "meets";
  if (!snapshot.os.version) return "unknown";
  const comparison = compareVersions(snapshot.os.version, requirement.minVersion);
  return comparison === null ? "unknown" : comparison >= 0 ? "meets" : "insufficient";
}
function evaluateGpu(requirement, snapshot) {
  if (!requirement) return "unknown";
  if (requirement.mode === "not_required") return "notApplicable";
  if (requirement.mode === "any") return snapshot.gpus.length > 0 ? "meets" : "unknown";
  const modeCandidates = snapshot.gpus.filter((gpu) => gpu.memoryKind === requirement.mode);
  const candidates = requirement.vendor
    ? modeCandidates.filter((gpu) => detectedGpuVendor(gpu) === requirement.vendor)
    : modeCandidates;
  const threshold = requirement.minimumMemoryBytes;
  if (threshold === void 0) return "unknown";
  if (candidates.length === 0) {
    return requirement.vendor && modeCandidates.some((gpu) => detectedGpuVendor(gpu) !== void 0)
      ? "insufficient"
      : "unknown";
  }
  if (
    candidates.some(
      (gpu) =>
        gpu.memoryBytes !== void 0 &&
        gpu.memoryBytes + GPU_MEMORY_REPORTING_TOLERANCE_BYTES >= threshold,
    )
  ) {
    return "meets";
  }
  return candidates.every((gpu) => gpu.memoryBytes !== void 0) ? "insufficient" : "unknown";
}
function detectedGpuVendor(gpu) {
  if (gpu.source === "nvidia_smi") return "nvidia";
  const identity = `${gpu.vendor ?? ""} ${gpu.name}`.toLowerCase();
  if (/nvidia|geforce|quadro|tesla/.test(identity)) return "nvidia";
  if (/amd|radeon/.test(identity)) return "amd";
  if (/intel|\barc\b/.test(identity)) return "intel";
  if (/apple/.test(identity)) return "apple";
  return void 0;
}
function compareMinimum(actual, minimum) {
  if (actual === void 0) return "unknown";
  return actual >= minimum ? "meets" : "insufficient";
}
function compareSystemMemoryMinimum(actual, minimum) {
  if (actual === void 0) return "unknown";
  const tolerance = Math.min(
    SYSTEM_MEMORY_REPORTING_TOLERANCE_MAX_BYTES,
    Math.floor(minimum * SYSTEM_MEMORY_REPORTING_TOLERANCE_RATIO),
  );
  return actual + tolerance >= minimum ? "meets" : "insufficient";
}
function compareVersions(actual, minimum) {
  const actualParts = versionParts(actual);
  const minimumParts = versionParts(minimum);
  if (!actualParts || !minimumParts) return null;
  const length = Math.max(actualParts.length, minimumParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (actualParts[index] ?? 0) - (minimumParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
function versionParts(value) {
  const match = value.trim().match(/^\d+(?:\.\d+)*/);
  if (!match) return null;
  return match[0].split(".").map(Number);
}
const ITEM_KEYS = ["os", "memory", "gpu", "storage"];
export function buildCompatibilityRequirements(recommendation, t) {
  const unavailable = t("workflows.detail.compatibility.notConfigured");
  const values = recommendation
    ? {
        os: recommendation.platforms
          .map((platform) => {
            const os = operatingSystemName(platform.os, t);
            const architectures = platform.architectures.join(" / ");
            return platform.minVersion
              ? t("workflows.detail.compatibility.minimumOsVersion", {
                  os,
                  version: platform.minVersion,
                  architectures,
                })
              : t("workflows.detail.compatibility.minimumOs", {
                  os,
                  architectures,
                });
          })
          .join(" / "),
        memory: t("workflows.detail.compatibility.memoryValue", {
          size: formatGibibytes(recommendation.systemMemoryBytes),
        }),
        gpu: recommendation.platforms
          .map((platform) =>
            t("workflows.detail.compatibility.platformGpu", {
              os: operatingSystemName(platform.os, t),
              requirement: gpuRequirementValue(platform.gpu, t),
            }),
          )
          .join(" / "),
        storage: t("workflows.detail.compatibility.storageRequirement", {
          size: formatGibibytes(recommendation.freeStorageBytes),
        }),
      }
    : {
        os: unavailable,
        memory: unavailable,
        gpu: unavailable,
        storage: unavailable,
      };
  return ITEM_KEYS.map((key) => ({
    key,
    label: t(`workflows.downloadDialog.${key}`),
    value: values[key],
  }));
}
export function buildMachineValues(snapshot, loading, t) {
  if (loading) {
    const detecting = t("workflows.detail.compatibility.detecting");
    return {
      os: detecting,
      memory: detecting,
      gpu: detecting,
      storage: detecting,
    };
  }
  if (!snapshot) {
    const notDetected = t("workflows.detail.compatibility.notDetected");
    return {
      os: notDetected,
      memory: notDetected,
      gpu: notDetected,
      storage: notDetected,
    };
  }
  const osName = operatingSystemName(snapshot.os.platform, t);
  const cores = snapshot.cpuCores ?? "—";
  return {
    os: snapshot.os.version
      ? t("workflows.detail.compatibility.localOsVersion", {
          os: osName,
          version: snapshot.os.version,
          arch: snapshot.os.arch,
          cores,
        })
      : t("workflows.detail.compatibility.localOs", {
          os: osName,
          arch: snapshot.os.arch,
          cores,
        }),
    memory:
      snapshot.systemMemoryBytes === void 0
        ? t("workflows.detail.compatibility.notDetected")
        : t("workflows.detail.compatibility.memoryValue", {
            size: formatGibibytes(snapshot.systemMemoryBytes),
          }),
    gpu:
      snapshot.gpus.length === 0
        ? t("workflows.detail.compatibility.notDetected")
        : snapshot.gpus.map((gpu) => gpuSnapshotValue(gpu, t)).join(" / "),
    storage:
      snapshot.storage.freeBytes === void 0
        ? t("workflows.detail.compatibility.notDetected")
        : t("workflows.detail.compatibility.storageValue", {
            size: formatGibibytes(snapshot.storage.freeBytes),
          }),
  };
}
function gpuRequirementValue(gpu, t) {
  if (gpu.mode === "not_required") return t("workflows.detail.compatibility.gpu.notRequired");
  if (gpu.mode === "any") return t("workflows.detail.compatibility.gpu.anyRequirement");
  const requirement = t(`workflows.detail.compatibility.gpu.${gpu.mode}Requirement`, {
    size: formatGibibytes(gpu.minimumMemoryBytes ?? 0),
  });
  return gpu.vendor
    ? t("workflows.detail.compatibility.gpu.vendorRequirement", {
        vendor: t(`workflows.detail.compatibility.gpu.vendor.${gpu.vendor}`),
        requirement,
      })
    : requirement;
}
function gpuSnapshotValue(gpu, t) {
  if (gpu.memoryBytes === void 0) {
    return t("workflows.detail.compatibility.gpu.detectedValue", {
      gpu: gpu.name,
    });
  }
  return t(`workflows.detail.compatibility.gpu.${gpu.memoryKind}Value`, {
    gpu: gpu.name,
    size: formatGibibytes(gpu.memoryBytes),
    defaultValue: t("workflows.detail.compatibility.gpu.detectedValue", {
      gpu: gpu.name,
    }),
  });
}
function operatingSystemName(platform, t) {
  return t(`workflows.detail.compatibility.osName.${platform}`, {
    defaultValue: platform,
  });
}
function formatGibibytes(bytes) {
  const gibibytes = bytes / 1024 ** 3;
  return Number.isInteger(gibibytes) ? String(gibibytes) : gibibytes.toFixed(1);
}
