/**
 * 服务对象 ⇄ 频道。
 *
 * - `fromService`：名字形如 `onXxx` 的可枚举属性当事件（得是类字段，原型上的方法
 *   枚举不到），`onDynamicXxx` 是按参数产生事件的工厂；其余函数都能被远端调用。
 *   事件先缓冲，首个远端订阅者到来时补发。
 * - `toService`：远端的代理。`onXxx` 取属性即得事件，其余属性都是 async 方法，
 *   参数以数组整体传过去。
 */
import type { IChannel, IServerChannel } from "./channel.js";
import { bufferEvent, type DisposableStore, type Event } from "./events.js";

const EVENT_NAME = /^on[A-Z]/;
const DYNAMIC_EVENT_NAME = /^onDynamic[A-Z]/;

export function fromService<TContext = string>(service: object, disposables?: DisposableStore): IServerChannel<TContext> {
  const bag = service as Record<string, unknown>;
  const events = new Map<string, Event<unknown>>();
  for (const key in bag) {
    if (!EVENT_NAME.test(key) || DYNAMIC_EVENT_NAME.test(key)) continue;
    const value = bag[key];
    if (typeof value === "function") events.set(key, bufferEvent(value as Event<unknown>, disposables));
  }
  return {
    listen(_ctx, event, arg) {
      const known = events.get(event);
      if (known) return known;
      const factory = bag[event];
      if (DYNAMIC_EVENT_NAME.test(event) && typeof factory === "function") {
        return (factory as (a: unknown) => Event<unknown>).call(service, arg);
      }
      throw new Error(`Event not found: ${event}`);
    },
    async call(_ctx, command, args) {
      const fn = bag[command];
      if (typeof fn !== "function" || EVENT_NAME.test(command)) throw new Error(`Method not found: ${command}`);
      const list = Array.isArray(args) ? args : args === undefined ? [] : [args];
      return (fn as (...a: unknown[]) => unknown).apply(service, list);
    },
  };
}

/** 把远端频道包成一个服务。`T` 里的方法在这边都会变成返回 Promise。 */
export function toService<T extends object>(channel: IChannel): T {
  const cache = new Map<string, unknown>();
  return new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      // 被 await 或当作 thenable 探测时不能伪装成 Promise
      if (prop === "then") return undefined;
      const hit = cache.get(prop);
      if (hit) return hit;
      let value: unknown;
      if (DYNAMIC_EVENT_NAME.test(prop)) value = (arg: unknown) => channel.listen(prop, arg);
      else if (EVENT_NAME.test(prop)) value = channel.listen(prop);
      else value = (...args: unknown[]) => channel.call(prop, args);
      cache.set(prop, value);
      return value;
    },
  });
}
