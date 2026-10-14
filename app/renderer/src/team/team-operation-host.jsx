// team-operation-host.jsx
import {
  instantiationService,
  ITeamDataInvalidationService,
  ITeamOperationService,
} from "../workspace/home-service.jsx";
import reactExports from "react";
import { useQueryClient } from "@tanstack/react-query";
import { __jsx } from "../shared/jsx-runtime.js";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import {
  creditQueryKeys,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";

function resolveServices(operationOverride, invalidationOverride) {
  try {
    return {
      operation:
        operationOverride ??
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ITeamOperationService),
        ),
      invalidation:
        invalidationOverride ??
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ITeamDataInvalidationService),
        ),
    };
  } catch {
    return {
      operation: operationOverride ?? null,
      invalidation: invalidationOverride ?? null,
    };
  }
}

export function TeamOperationHost({ operationService, invalidationService }) {
  const queryClient = useQueryClient();
  const {
    integrationEnabled,
    snapshot,
    activeScope,
  } = useTeamAccount();
  const [lastOperation, setLastOperation] = reactExports.useState(null);
  const services = reactExports.useMemo(
    () =>
      integrationEnabled
        ? resolveServices(operationService, invalidationService)
        : {
            operation: null,
            invalidation: null,
          },
    [integrationEnabled, invalidationService, operationService],
  );
  const identityKey = snapshot?.identityKey ?? null;
  reactExports.useEffect(() => {
    if (!integrationEnabled || !identityKey || !services.operation)
      return void 0;
    let disposed = false;
    const accept = (operation) => {
      if (!disposed && operation.identityKey === identityKey)
        setLastOperation(operation);
    };
    const subscription = services.operation.onDidChange(accept);
    void services.operation
      .getSnapshot(identityKey)
      .then((operations) => {
        if (!disposed && operations.length > 0) accept(operations.at(-1));
      })
      .catch(() => {});
    return () => {
      disposed = true;
      subscription.dispose();
      setLastOperation(null);
    };
  }, [identityKey, integrationEnabled, services.operation]);
  reactExports.useEffect(() => {
    if (!integrationEnabled || !identityKey || !services.invalidation)
      return void 0;
    const invalidateDomain = (domain, event) => {
      if (domain === "CONTEXTS") {
        return queryClient.invalidateQueries({
          queryKey: teamQueryKeys.contexts(identityKey),
        });
      }
      if (domain === "INVITATIONS") {
        return Promise.resolve();
      }
      if (domain === "CAPABILITIES") {
        return queryClient.invalidateQueries({
          queryKey: teamQueryKeys.userCapabilities(identityKey),
        });
      }
      if (event.groupId && event.groupId !== activeScope?.groupId) {
        return queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(identityKey) &&
            query.queryKey.includes(event.groupId),
        });
      }
      if (!activeScope) {
        return Promise.resolve();
      }
      if (domain === "TEAM_DETAIL") {
        return queryClient.invalidateQueries({
          queryKey: teamQueryKeys.detail(activeScope),
        });
      }
      if (domain === "MEMBERS") {
        return queryClient.invalidateQueries({
          queryKey: [...teamQueryKeys.membership(activeScope), "members"],
        });
      }
      if (domain === "INVITE_LINKS") {
        return queryClient.invalidateQueries({
          queryKey: [...teamQueryKeys.membership(activeScope), "invite-links"],
        });
      }
      if (domain === "QUOTA") {
        return queryClient.invalidateQueries({
          queryKey: teamQueryKeys.quota(activeScope),
        });
      }
      if (domain === "CREDIT_SUMMARY") {
        return queryClient.invalidateQueries({
          queryKey: creditQueryKeys.summary(activeScope),
        });
      }
      return queryClient.invalidateQueries({
        queryKey: [...creditQueryKeys.scope(activeScope), "transactions"],
      });
    };
    const subscription = services.invalidation.onDidInvalidate((event) => {
      if (event.identityKey !== identityKey) return;
      void Promise.all(
        event.domains.map((domain) => invalidateDomain(domain, event)),
      );
    });
    return () => subscription.dispose();
  }, [
    activeScope,
    identityKey,
    integrationEnabled,
    queryClient,
    services.invalidation,
  ]);
  if (!lastOperation) return null;
  return (
    <span
      className="sr-only"
      role="status"
      data-team-operation-status={lastOperation.status}
    >
      {lastOperation.type}
      {": "}
      {lastOperation.status}
    </span>
  );
}
