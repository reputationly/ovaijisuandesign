// use-hailuo03-video-trial.js
import {
  dedupedToast,
  reactExports,
  useMutation,
  useQuery,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import {
  claimHailuo03VideoTrial,
  EMPTY_HAILUO03_VIDEO_TRIAL_STATUS,
  fetchHailuo03VideoTrialStatus,
  HAILUO03_VIDEO_TRIAL_QUERY_KEY,
} from "../settings/normalize-hailuo03-video-trial-eligibility.js";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { pickUserMessage } from "../generation/normalize-skill-detail-metadata.js";
import { pickEditErrorMessage } from "../assets/use-canvas-model-registry-hydration.js";

export function useHailuo03VideoSuperResolutionSubmit({
  httpClient,
  canvasGenerationErrorToastId,
}) {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    async (nodeId, sourceVideoPath, providerTaskId) => {
      try {
        const resp = await httpClient.hailuo03VideoSuperResolution({
          video_path: sourceVideoPath,
          provider_task_id: providerTaskId,
          resolution: "2K",
          source_node_id: nodeId,
          filename: `sr-${nodeId}`,
        });
        if (!resp.ok) {
          dedupedToast.error(
            stripErrorHtml(
              pickUserMessage(resp, t2("canvas.superResolution.error")),
            ),
            {
              id: canvasGenerationErrorToastId,
            },
          );
        }
      } catch (err) {
        console.error("[canvas] hailuo03 video super-resolution failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, t2("canvas.superResolution.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
  );
}

export function useHailuo03VideoTrial() {
  const queryClient2 = useQueryClient();
  const statusQuery = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
    // 剩余次数展示在提交决策点上,任何触发时机都必须回源;缓存只用于
    // revalidate 完成前的即时渲染和失败兜底(queryFn 失败保留旧数据)。
    staleTime: 0,
  });
  const claimMutation = useMutation({
    mutationFn: claimHailuo03VideoTrial,
    onSuccess: (status) => {
      queryClient2.setQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY, status);
    },
  });
  const refresh = reactExports.useCallback(async () => {
    try {
      const status = await fetchHailuo03VideoTrialStatus();
      queryClient2.setQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY, status);
      return status;
    } catch {
      return (
        queryClient2.getQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY) ??
        EMPTY_HAILUO03_VIDEO_TRIAL_STATUS
      );
    }
  }, [queryClient2]);
  return {
    status: statusQuery.data ?? EMPTY_HAILUO03_VIDEO_TRIAL_STATUS,
    isLoading: statusQuery.isLoading,
    isFetching: statusQuery.isFetching,
    isClaiming: claimMutation.isPending,
    claim: claimMutation.mutateAsync,
    refresh,
  };
}
