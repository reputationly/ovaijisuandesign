/**
 * 事件与释放的最小原语。主进程和渲染层各放一份（渲染层那份由测试比对必须一致），
 * 不依赖 Node 或 DOM。
 */

export interface IDisposable {
  dispose(): void;
}

/** 订阅函数：传监听器，返回取消订阅的句柄。 */
export type Event<T> = (listener: (e: T) => unknown) => IDisposable;

export function toDisposable(fn: () => void): IDisposable {
  let done = false;
  return {
    dispose() {
      if (done) return;
      done = true;
      fn();
    },
  };
}

export class DisposableStore implements IDisposable {
  private items = new Set<IDisposable>();
  private disposed = false;

  get isDisposed(): boolean {
    return this.disposed;
  }

  add<D extends IDisposable>(d: D): D {
    // 已经释放过的集合再收东西就当场释放，免得泄漏
    if (this.disposed) d.dispose();
    else this.items.add(d);
    return d;
  }

  delete(d: IDisposable): void {
    this.items.delete(d);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const all = [...this.items];
    this.items.clear();
    for (const d of all) {
      try {
        d.dispose();
      } catch {
        // 一个释放失败不该拦住其余的
      }
    }
  }
}

export interface EmitterHooks {
  onFirstListener?: () => void;
  onLastListener?: () => void;
}

export class Emitter<T> implements IDisposable {
  private listeners: Array<(e: T) => unknown> = [];
  private disposed = false;
  private readonly hooks: EmitterHooks;
  readonly event: Event<T>;

  constructor(hooks: EmitterHooks = {}) {
    this.hooks = hooks;
    this.event = (listener) => {
      if (this.disposed) return toDisposable(() => {});
      const first = this.listeners.length === 0;
      // 复制一份再改：派发途中增删监听器不影响本轮
      this.listeners = [...this.listeners, listener];
      if (first) this.hooks.onFirstListener?.();
      return toDisposable(() => {
        const idx = this.listeners.indexOf(listener);
        if (idx < 0) return;
        this.listeners = this.listeners.filter((_, i) => i !== idx);
        if (this.listeners.length === 0 && !this.disposed) this.hooks.onLastListener?.();
      });
    };
  }

  get hasListeners(): boolean {
    return this.listeners.length > 0;
  }

  fire(value: T): void {
    for (const l of this.listeners) {
      try {
        l(value);
      } catch (err) {
        // 监听器抛错只记下来，不打断其他监听器
        console.error("event listener failed", err);
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners = [];
  }
}

/**
 * 首个监听器出现之前发生的事件先攒着，挂上第一个监听器时补发给它，之后直通。
 * 服务在渲染层订阅之前就可能发事件（比如启动时的状态变化），不攒会丢。
 */
export function bufferEvent<T>(source: Event<T>, disposables?: DisposableStore): Event<T> {
  let pending: T[] | undefined = [];
  const out = new Emitter<T>();
  const sub = source((e) => {
    if (pending) pending.push(e);
    else out.fire(e);
  });
  disposables?.add(sub);
  disposables?.add(out);
  return (listener) => {
    const sub = out.event(listener);
    if (pending) {
      const queued = pending;
      pending = undefined;
      for (const e of queued) out.fire(e);
    }
    return sub;
  };
}

export function onceEvent<T>(source: Event<T>): Event<T> {
  return (listener) => {
    let fired = false;
    const sub: IDisposable = source((e) => {
      if (fired) return;
      fired = true;
      sub?.dispose();
      listener(e);
    });
    if (fired) sub.dispose();
    return sub;
  };
}
