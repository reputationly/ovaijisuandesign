// minimal-forced-fallback.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports } from "../vendor.js";

const MinimalForcedFallback = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--modal-mask-bg)",
    }}
    role="alertdialog"
    aria-modal="true"
  >
    <div
      style={{
        background: "var(--elevated-surface)",
        border:
          "var(--elevated-border-width) solid var(--elevated-border-color)",
        padding: 32,
        maxWidth: 400,
        textAlign: "center",
        color: "var(--foreground)",
      }}
    >
      <p
        style={{
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Update Required
      </p>
      <p
        style={{
          fontSize: 13,
          marginTop: 8,
          opacity: 0.7,
        }}
      >
        Please restart the application to continue.
      </p>
      <button
        type="button"
        style={{
          marginTop: 16,
          padding: "8px 24px",
          fontSize: 13,
          cursor: "pointer",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "inherit",
        }}
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  </div>
);

export class UpdaterErrorBoundary extends reactExports.Component {
  state = {
    hasError: false,
  };
  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }
  componentDidCatch(error) {
    console.error("[UpdaterRoot] Render error, degrading gracefully:", error);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.forcedMode) {
        return <MinimalForcedFallback />;
      }
      return null;
    }
    return this.props.children;
  }
}
