// 运营后台的列表数据 hook。
import { r as reactExports, l as gatewayFetch, m as API_PATHS } from "../../main.jsx";
export function useOperations() {
  const [operations, setOperations] = reactExports.useState([]);
  const [loadingOps, setLoadingOps] = reactExports.useState(false);
  const fetchOperations = reactExports.useCallback(async () => {
    setLoadingOps(true);
    try {
      const res = await gatewayFetch(API_PATHS.marketOperations);
      const data = await res.json();
      setOperations(data.operations ?? []);
    } catch {
      setOperations([]);
    } finally {
      setLoadingOps(false);
    }
  }, []);
  const batchSave = reactExports.useCallback(
    async (req) => {
      try {
        const res = await gatewayFetch(API_PATHS.marketBatchSaveOperations, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(req),
        });
        const data = await res.json();
        if (data.success) {
          await fetchOperations();
        }
        return {
          success: data.success,
          conflicts: data.conflicts ?? [],
        };
      } catch {
        return {
          success: false,
          conflicts: [],
        };
      }
    },
    [fetchOperations],
  );
  const deleteOperation = reactExports.useCallback(
    async (skillName) => {
      try {
        await gatewayFetch(API_PATHS.marketDeleteOperation(skillName), {
          method: "DELETE",
        });
        await fetchOperations();
        return true;
      } catch {
        return false;
      }
    },
    [fetchOperations],
  );
  return {
    operations,
    loadingOps,
    fetchOperations,
    batchSave,
    deleteOperation,
  };
}
