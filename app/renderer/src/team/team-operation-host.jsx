// team-operation-host.jsx
import {
  instantiationService,
  ITeamDataInvalidationService,
  ITeamOperationService,
} from "../workspace/home-service.jsx";
import { reactExports, useQueryClient } from "../vendor.js";
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
  const queryClient2 = useQueryClient();
  const {
    integrationEnabled,
    snapshot: snapshot2,
    activeScope,
  } = useTeamAccount();
  const [lastOperation, setLastOperation] = reactExports.useState(null);
  const services2 = reactExports.useMemo(
    () =>
      integrationEnabled
        ? resolveServices(operationService, invalidationService)
        : {
            operation: null,
            invalidation: null,
          },
    [integrationEnabled, invalidationService, operationService],
  );
  const identityKey = snapshot2?.identityKey ?? null;
  reactExports.useEffect(() => {
    if (!integrationEnabled || !identityKey || !services2.operation)
      return void 0;
    let disposed = false;
    const accept = (operation) => {
      if (!disposed && operation.identityKey === identityKey)
        setLastOperation(operation);
    };
    const subscription = services2.operation.onDidChange(accept);
    void services2.operation
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
  }, [identityKey, integrationEnabled, services2.operation]);
  reactExports.useEffect(() => {
    if (!integrationEnabled || !identityKey || !services2.invalidation)
      return void 0;
    const invalidateDomain = (domain2, event) => {
      if (domain2 === "CONTEXTS") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.contexts(identityKey),
        });
      }
      if (domain2 === "INVITATIONS") {
        return Promise.resolve();
      }
      if (domain2 === "CAPABILITIES") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.userCapabilities(identityKey),
        });
      }
      if (event.groupId && event.groupId !== activeScope?.groupId) {
        return queryClient2.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(identityKey) &&
            query.queryKey.includes(event.groupId),
        });
      }
      if (!activeScope) {
        return Promise.resolve();
      }
      if (domain2 === "TEAM_DETAIL") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.detail(activeScope),
        });
      }
      if (domain2 === "MEMBERS") {
        return queryClient2.invalidateQueries({
          queryKey: [...teamQueryKeys.membership(activeScope), "members"],
        });
      }
      if (domain2 === "INVITE_LINKS") {
        return queryClient2.invalidateQueries({
          queryKey: [...teamQueryKeys.membership(activeScope), "invite-links"],
        });
      }
      if (domain2 === "QUOTA") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.quota(activeScope),
        });
      }
      if (domain2 === "CREDIT_SUMMARY") {
        return queryClient2.invalidateQueries({
          queryKey: creditQueryKeys.summary(activeScope),
        });
      }
      return queryClient2.invalidateQueries({
        queryKey: [...creditQueryKeys.scope(activeScope), "transactions"],
      });
    };
    const subscription = services2.invalidation.onDidInvalidate((event) => {
      if (event.identityKey !== identityKey) return;
      void Promise.all(
        event.domains.map((domain2) => invalidateDomain(domain2, event)),
      );
    });
    return () => subscription.dispose();
  }, [
    activeScope,
    identityKey,
    integrationEnabled,
    queryClient2,
    services2.invalidation,
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
