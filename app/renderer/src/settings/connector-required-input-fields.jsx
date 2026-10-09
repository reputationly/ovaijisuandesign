// connector-required-input-fields.jsx
import { homeService } from "../workspace/home-service.jsx";
import {
  jsxRuntimeExports,
  localizedI18nText,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";

export function isRequiredInputSatisfied(
  input,
  value,
  normalize2 = (raw2) => raw2.trim(),
) {
  const normalized = normalize2(value);
  if (normalized.length === 0) return false;
  if (!input.pattern) return true;
  try {
    return new RegExp(input.pattern).test(normalized);
  } catch {
    return false;
  }
}

export function ConnectorRequiredInputFields({
  connectorId,
  requiredInputs,
  values: values3,
  disabled: disabled2,
  normalize: normalize2,
  onChange,
}) {
  const { t: t2, i18n } = useTranslation();
  const language2 = i18n?.language ?? "en";
  return (
    <>
      {requiredInputs.map((field) => {
        const value = values3[field.key] ?? "";
        const invalid2 =
          value.trim().length > 0 &&
          !isRequiredInputSatisfied(field, value, normalize2);
        const fieldId = `connectors-${connectorId}-${field.key}`;
        return (
          <div key={field.key}>
            <Label
              htmlFor={fieldId}
              className="text-sm font-medium text-foreground"
            >
              {localizedI18nText(field.label, language2)}
            </Label>
            <Input3
              id={fieldId}
              type="text"
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
              disabled={disabled2}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={invalid2}
              aria-required="true"
              {...(field.placeholder
                ? {
                    placeholder: field.placeholder,
                  }
                : {})}
              className="mt-1.5 h-10 rounded-lg bg-card"
              data-action-ui-id={fieldId}
            />
            {invalid2 ? (
              <p role="alert" className="mt-1.5 text-xs text-destructive">
                {field.patternMessage
                  ? localizedI18nText(field.patternMessage, language2)
                  : t2("connectors.oauth.invalidInput")}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export async function installStagedConnector(connectorId, serverName) {
  const install = await homeService.connector.install(connectorId);
  if (!install.ok)
    return {
      ok: false,
      code: install.code,
    };
  const servers = await homeService.customMcp.list().catch(() => []);
  const installed = servers.find(
    (server) =>
      server.name.toLowerCase() === serverName.toLowerCase() &&
      server.transport === "stdio",
  );
  return {
    ok: true,
    result: {
      ok: true,
      server: installed ?? {
        name: serverName,
        enabled: true,
        transport: "stdio",
        runtimeState: "connected",
      },
      runtime: {
        state: installed?.runtimeState ?? "connected",
        connectedRuntimes: 0,
        failedRuntimes: 0,
      },
    },
  };
}
