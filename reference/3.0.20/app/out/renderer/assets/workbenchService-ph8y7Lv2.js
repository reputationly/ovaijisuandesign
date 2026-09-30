import { c as createDecorator, D as Disposable, i as instantiationService, I as IWorkspaceService, s as services, d as disposables, a as ILogService, b as IHiloApp } from "./index-CANVzzmD.js";
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = decorator(result) || result;
  return result;
};
var __decorateParam = (index, decorator) => (target, key) => decorator(target, key, index);
const IWorkbenchService = createDecorator("workbenchService");
let WorkbenchService = class extends Disposable {
  constructor(logService, hiloApp) {
    super();
    this.logService = logService;
    this.hiloApp = hiloApp;
    try {
      this.workspaceService = instantiationService.invokeFunction(
        (accessor) => accessor.get(IWorkspaceService)
      );
    } catch {
      this.workspaceService = null;
    }
  }
  workspaceService;
};
WorkbenchService = __decorateClass([
  __decorateParam(0, ILogService),
  __decorateParam(1, IHiloApp)
], WorkbenchService);
const workbenchService = instantiationService.createInstance(WorkbenchService);
services.set(IWorkbenchService, workbenchService);
disposables.add(workbenchService);
workbenchService.logService.info("Renderer DI initialized");
export {
  IWorkbenchService,
  WorkbenchService,
  workbenchService
};
