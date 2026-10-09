// 运营后台的数据与规则：运营工作流 hook、权限、发布校验与批量发布组装。
import {
  r as reactExports,
  l as gatewayFetch,
  m as API_PATHS,
  mY as normalizeSkillCategoriesResponse,
} from "../../main.jsx";
async function readJson(response) {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `HTTP ${response.status}`);
  }
  return await response.json();
}
export function useOperatorWorkflow() {
  const [submissions, setSubmissions] = reactExports.useState([]);
  const [publishedSubmissions, setPublishedSubmissions] = reactExports.useState([]);
  const [categories, setCategories] = reactExports.useState([]);
  const [reviewers, setReviewers] = reactExports.useState([]);
  const categoriesRef = reactExports.useRef([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [total, setTotal] = reactExports.useState(0);
  const [pendingTotal, setPendingTotal] = reactExports.useState(0);
  const [approvedTotal, setApprovedTotal] = reactExports.useState(0);
  const submissionsRequestRef = reactExports.useRef(0);
  const fetchSubmissions = reactExports.useCallback(async (filters = {}) => {
    const request = ++submissionsRequestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.submissionType) params.set("submission_type", filters.submissionType);
      if (filters.submitterUid) params.set("submitter_uid", filters.submitterUid);
      if (filters.submitterName) params.set("submitter_name", filters.submitterName);
      if (filters.reviewerUid) params.set("reviewer_uid", filters.reviewerUid);
      if (filters.reviewStatus) params.set("review_status", filters.reviewStatus);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize) params.set("page_size", String(filters.pageSize));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const data = await readJson(
        await gatewayFetch(`${API_PATHS.marketOperatorSubmissions}${suffix}`),
      );
      if (request !== submissionsRequestRef.current) return;
      setSubmissions(data.submissions ?? []);
      setTotal(data.total ?? 0);
      setPendingTotal(data.pending_total ?? 0);
      setApprovedTotal(data.approved_total ?? 0);
      setReviewers(data.reviewers ?? []);
    } finally {
      if (request === submissionsRequestRef.current) setLoading(false);
    }
  }, []);
  const fetchPublishedSubmissions = reactExports.useCallback(async () => {
    const data = await readJson(
      await gatewayFetch(`${API_PATHS.marketOperatorSubmissions}?status=published&page_size=100`),
    );
    setPublishedSubmissions(data.submissions ?? []);
  }, []);
  const updateSubmission = reactExports.useCallback(async (submissionId, body) => {
    const data = await readJson(
      await gatewayFetch(API_PATHS.marketOperatorSubmission(submissionId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
    return data.ok;
  }, []);
  const batchApprove = reactExports.useCallback(async (submissionIds) => {
    return readJson(
      await gatewayFetch(API_PATHS.marketOperatorBatchApprove, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submission_ids: submissionIds,
        }),
      }),
    );
  }, []);
  const stagePackage = reactExports.useCallback(async (submissionId) => {
    return readJson(
      await gatewayFetch(API_PATHS.marketOperatorSubmissionPackage(submissionId), {
        method: "POST",
      }),
    );
  }, []);
  const uploadPackage = reactExports.useCallback(async (submissionId, skillName, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const query = new URLSearchParams({
      skill_name: skillName,
    });
    const data = await readJson(
      await gatewayFetch(
        `${API_PATHS.marketOperatorSubmissionPackageUpload(submissionId)}?${query}`,
        {
          method: "POST",
          body: formData,
          timeoutMs: 10 * 60 * 1e3,
        },
      ),
    );
    return data.object_key;
  }, []);
  const fetchCategories = reactExports.useCallback(async () => {
    const response = await gatewayFetch(`${API_PATHS.marketOperatorCategories}?tag_type=all`);
    if (!response.ok) {
      throw new Error((await response.text().catch(() => "")) || `HTTP ${response.status}`);
    }
    const nextCategories = normalizeSkillCategoriesResponse(await response.json());
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
  }, []);
  const saveCategories = reactExports.useCallback(async (transform = (items) => items) => {
    const items = transform(categoriesRef.current);
    const data = await readJson(
      await gatewayFetch(API_PATHS.marketOperatorCategories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories: items,
        }),
      }),
    );
    return data.ok;
  }, []);
  const updateCategory = reactExports.useCallback((tagType, code, patch) => {
    const nextCategories = categoriesRef.current.map((category) =>
      category.tag_type === tagType && category.category === code
        ? {
            ...category,
            ...patch,
          }
        : category,
    );
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
  }, []);
  const addCategory = reactExports.useCallback((item) => {
    const nextCategories = [...categoriesRef.current, item];
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
  }, []);
  const publish = reactExports.useCallback(async (publications) => {
    const data = await readJson(
      await gatewayFetch(API_PATHS.marketOperatorPublish, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publications,
        }),
      }),
    );
    return data;
  }, []);
  return {
    submissions,
    publishedSubmissions,
    categories,
    reviewers,
    loading,
    total,
    pendingTotal,
    approvedTotal,
    fetchSubmissions,
    fetchPublishedSubmissions,
    updateSubmission,
    batchApprove,
    stagePackage,
    uploadPackage,
    fetchCategories,
    saveCategories,
    updateCategory,
    addCategory,
    publish,
  };
}
export const publicationSections = {
  "official-featured": "skills.market.officialFeatured",
  community: "skills.market.communityFeatured",
  official: "skills.market.otherSkills",
};
export class BatchPublicationValidationError extends Error {
  constructor(submissionIds, reason) {
    super(`Invalid publication categories: ${submissionIds.join(", ")}`);
    this.submissionIds = submissionIds;
    this.reason = reason;
    this.name = "BatchPublicationValidationError";
  }
}
export function publicationValidationMessage(details) {
  if (!details || typeof details !== "object" || !("reason" in details)) return void 0;
  switch (details.reason) {
    case "at least one category is required":
      return "skills.operation.publishCategoryRequired";
    case "categories contains an invalid value":
      return "skills.operation.publishCategoryInvalid";
    case "category_weights must match categories":
      return "skills.operation.publishCategoryWeightsInvalid";
    default:
      return void 0;
  }
}
export function buildBatchPublications(selected, drafts, section, enabledCategories) {
  const missing = selected.filter((id) => drafts[id]?.categories.length === 0);
  if (missing.length > 0) throw new BatchPublicationValidationError(missing, "missing-category");
  if (enabledCategories) {
    const invalid = selected.filter((id) =>
      drafts[id]?.categories.some((category) => !enabledCategories.includes(category)),
    );
    if (invalid.length > 0) throw new BatchPublicationValidationError(invalid, "invalid-category");
  }
  return selected.map((submissionId) => {
    const draft = drafts[submissionId];
    if (!draft) throw new Error(`Missing publication draft: ${submissionId}`);
    return {
      ...draft,
      submission_id: submissionId,
      display_section: section,
    };
  });
}
export function useOperator() {
  const [isOperator, setIsOperator] = reactExports.useState(false);
  const [role, setRole] = reactExports.useState("none");
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const checkedRef = reactExports.useRef(false);
  const check = reactExports.useCallback(async () => {
    try {
      const res = await gatewayFetch(API_PATHS.marketCheckOperator);
      const data = await res.json();
      setIsOperator(data.is_operator);
      setRole(data.role === "advanced" || data.role === "reviewer" ? data.role : "none");
    } catch {
      setIsOperator(false);
      setRole("none");
    } finally {
      setIsLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    check();
  }, [check]);
  return {
    isOperator,
    role,
    isLoading,
  };
}
