// instantiation-service.js
import { _util, createDecorator } from "./parse-custom-mcp-arguments.js";
import {
  _enableAllTracing,
  CyclicDependencyError,
  Graph,
  ServiceCollection,
  Trace,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  dispose,
  illegalState,
  isDisposable,
  SyncDescriptor,
} from "../vendor-inline/vscode-base/linked-list.js";

const IInstantiationService = createDecorator("instantiationService");

export class InstantiationService {
  constructor(
    _services = new ServiceCollection(),
    _strict = false,
    _parent,
    _enableTracing = _enableAllTracing,
  ) {
    this._services = _services;
    this._strict = _strict;
    this._parent = _parent;
    this._enableTracing = _enableTracing;
    this._services.set(IInstantiationService, this);
    this._globalGraph = _enableTracing
      ? (_parent?._globalGraph ?? new Graph((e2) => e2))
      : void 0;
  }
  _globalGraph;
  _globalGraphImplicitDependency;
  _isDisposed = false;
  _servicesToMaybeDispose = new Set();
  _children = new Set();
  dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      dispose(this._children);
      this._children.clear();
      for (const candidate of this._servicesToMaybeDispose) {
        if (isDisposable(candidate)) {
          candidate.dispose();
        }
      }
      this._servicesToMaybeDispose.clear();
    }
  }
  _throwIfDisposed() {
    if (this._isDisposed) {
      throw new Error("InstantiationService has been disposed");
    }
  }
  createChild(services2, store) {
    this._throwIfDisposed();
    const that = this;
    const result = new (class extends InstantiationService {
      dispose() {
        that._children.delete(result);
        super.dispose();
      }
    })(services2, this._strict, this, this._enableTracing);
    this._children.add(result);
    store?.add(result);
    return result;
  }
  invokeFunction(fn2, ...args) {
    this._throwIfDisposed();
    const _trace = Trace.traceInvocation(this._enableTracing, fn2);
    let _done = false;
    try {
      const accessor = {
        get: (id2) => {
          if (_done) {
            throw illegalState(
              "service accessor is only valid during the invocation of its target method",
            );
          }
          const result = this._getOrCreateServiceInstance(id2, _trace);
          if (!result) {
            this._throwIfStrict(
              `[invokeFunction] unknown service '${id2}'`,
              false,
            );
          }
          return result;
        },
      };
      return fn2(accessor, ...args);
    } finally {
      _done = true;
      _trace.stop();
    }
  }
  createInstance(ctorOrDescriptor, ...rest) {
    this._throwIfDisposed();
    let _trace;
    let result;
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
      result = this._createInstance(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(rest),
        _trace,
      );
    } else {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
      result = this._createInstance(ctorOrDescriptor, rest, _trace);
    }
    _trace.stop();
    return result;
  }
  _createInstance(ctor, args = [], _trace) {
    const serviceDependencies = _util
      .getServiceDependencies(ctor)
      .sort((a2, b3) => a2.index - b3.index);
    const serviceArgs = [];
    for (const dependency of serviceDependencies) {
      const service2 = this._getOrCreateServiceInstance(dependency.id, _trace);
      if (!service2) {
        this._throwIfStrict(
          `[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`,
          false,
        );
      }
      serviceArgs.push(service2);
    }
    const firstServiceArgPos =
      serviceDependencies.length > 0
        ? serviceDependencies[0].index
        : args.length;
    if (args.length !== firstServiceArgPos) {
      console.trace(
        `[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`,
      );
      const delta = firstServiceArgPos - args.length;
      if (delta > 0) {
        args = args.concat(new Array(delta));
      } else {
        args = args.slice(0, firstServiceArgPos);
      }
    }
    return Reflect.construct(ctor, args.concat(serviceArgs));
  }
  _setCreatedServiceInstance(id2, instance2) {
    if (this._services.get(id2) instanceof SyncDescriptor) {
      this._services.set(id2, instance2);
    } else if (this._parent) {
      this._parent._setCreatedServiceInstance(id2, instance2);
    } else {
      throw new Error("illegalState - setting UNKNOWN service instance");
    }
  }
  _getServiceInstanceOrDescriptor(id2) {
    const instanceOrDesc = this._services.get(id2);
    if (!instanceOrDesc && this._parent) {
      return this._parent._getServiceInstanceOrDescriptor(id2);
    } else {
      return instanceOrDesc;
    }
  }
  _getOrCreateServiceInstance(id2, _trace) {
    if (this._globalGraph && this._globalGraphImplicitDependency) {
      this._globalGraph.insertEdge(
        this._globalGraphImplicitDependency,
        String(id2),
      );
    }
    const thing = this._getServiceInstanceOrDescriptor(id2);
    if (thing instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(
        id2,
        thing,
        _trace.branch(id2, true),
      );
    } else {
      _trace.branch(id2, false);
      return thing;
    }
  }
  _activeInstantiations = new Set();
  _safeCreateAndCacheServiceInstance(id2, desc2, _trace) {
    if (this._activeInstantiations.has(id2)) {
      throw new Error(
        `illegal state - RECURSIVELY instantiating service '${id2}'`,
      );
    }
    this._activeInstantiations.add(id2);
    try {
      return this._createAndCacheServiceInstance(id2, desc2, _trace);
    } finally {
      this._activeInstantiations.delete(id2);
    }
  }
  _createAndCacheServiceInstance(id2, desc2, _trace) {
    const graph = new Graph((data2) => data2.id.toString());
    let cycleCount = 0;
    const stack = [
      {
        id: id2,
        desc: desc2,
      },
    ];
    while (stack.length) {
      const item = stack.pop();
      graph.lookupOrInsertNode(item);
      if (cycleCount++ > 1e3) {
        throw new CyclicDependencyError(graph);
      }
      for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(
          dependency.id,
        );
        if (!instanceOrDesc) {
          this._throwIfStrict(
            `[createInstance] ${id2} depends on ${dependency.id} which is NOT registered.`,
            true,
          );
        }
        if (instanceOrDesc instanceof SyncDescriptor) {
          const d2 = {
            id: dependency.id,
            desc: instanceOrDesc,
          };
          graph.insertEdge(item, d2);
          stack.push(d2);
        }
      }
    }
    while (true) {
      const roots = graph.roots();
      if (roots.length === 0) {
        if (!graph.isEmpty()) {
          throw new CyclicDependencyError(graph);
        }
        break;
      }
      for (const { data: data2 } of roots) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(data2.id);
        if (instanceOrDesc instanceof SyncDescriptor) {
          const instance2 = this._createServiceInstanceWithOwner(
            data2.id,
            data2.desc.ctor,
            data2.desc.staticArguments,
            data2.desc.supportsDelayedInstantiation,
            _trace,
          );
          this._setCreatedServiceInstance(data2.id, instance2);
        }
        graph.removeNode(data2);
      }
    }
    return this._getServiceInstanceOrDescriptor(id2);
  }
  _createServiceInstanceWithOwner(
    id2,
    ctor,
    args = [],
    supportsDelayedInstantiation,
    _trace,
  ) {
    if (this._services.get(id2) instanceof SyncDescriptor) {
      return this._createServiceInstance(
        id2,
        ctor,
        args,
        supportsDelayedInstantiation,
        _trace,
      );
    } else if (this._parent) {
      return this._parent._createServiceInstanceWithOwner(
        id2,
        ctor,
        args,
        supportsDelayedInstantiation,
        _trace,
      );
    } else {
      throw new Error(
        `illegalState - creating UNKNOWN service instance ${ctor.name}`,
      );
    }
  }
  _createServiceInstance(
    _id,
    ctor,
    args = [],
    _supportsDelayedInstantiation,
    _trace,
  ) {
    const result = this._createInstance(ctor, args, _trace);
    this._servicesToMaybeDispose.add(result);
    return result;
  }
  _throwIfStrict(msg, printWarning) {
    if (printWarning) {
      console.warn(msg);
    }
    if (this._strict) {
      throw new Error(msg);
    }
  }
}
