// 这份错误边界带 resetKeys，和已装的 react-error-boundary 不是同一份。
import { ErrorBoundary as C$5 } from "react-error-boundary";
import reactExports from "react";

const h$4 = reactExports.createContext(null),
  c$3 = {
    didCatch: false,
    error: null
  };
let m$4 = class m extends reactExports.Component {
  constructor(e2) {
    super(e2), this.resetErrorBoundary = this.resetErrorBoundary.bind(this), this.state = c$3;
  }
  static getDerivedStateFromError(e2) {
    return {
      didCatch: true,
      error: e2
    };
  }
  resetErrorBoundary(...e2) {
    const {
      error: t2
    } = this.state;
    t2 !== null && (this.props.onReset?.({
      args: e2,
      reason: "imperative-api"
    }), this.setState(c$3));
  }
  componentDidCatch(e2, t2) {
    this.props.onError?.(e2, t2);
  }
  componentDidUpdate(e2, t2) {
    const {
        didCatch: o2
      } = this.state,
      {
        resetKeys: s2
      } = this.props;
    o2 && t2.error !== null && C$5(e2.resetKeys, s2) && (this.props.onReset?.({
      next: s2,
      prev: e2.resetKeys,
      reason: "keys"
    }), this.setState(c$3));
  }
  render() {
    const {
        children: e2,
        fallbackRender: t2,
        FallbackComponent: o2,
        fallback: s2
      } = this.props,
      {
        didCatch: n2,
        error: a2
      } = this.state;
    let i2 = e2;
    if (n2) {
      const u4 = {
        error: a2,
        resetErrorBoundary: this.resetErrorBoundary
      };
      if (typeof t2 == "function") i2 = t2(u4);else if (o2) i2 = reactExports.createElement(o2, u4);else if (s2 !== void 0) i2 = s2;else throw a2;
    }
    return reactExports.createElement(h$4.Provider, {
      value: {
        didCatch: n2,
        error: a2,
        resetErrorBoundary: this.resetErrorBoundary
      }
    }, i2);
  }
};

export { m$4 as ResetErrorBoundary };
