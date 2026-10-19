/**
 * v3 画布的资源命令构造器 —— 从产物主包取回（第 83 轮）。
 *
 * 三个枚举都来自协议包 `project-v3/command`（我们树里已有源码），这里只补把
 * 「界面意图」翻译成「协议命令」的那一层。
 */
import {
  ProjectActor,
  ProjectResourceCommandType,
  ProjectResourceUpdateKind,
} from "../../../packages/protocol/src/project-v3/command.ts";

export function createResourceCurrentVersionCommand(input) {
  return {
    commandId: input.commandId,
    actor: ProjectActor.HUMAN,
    command: {
      type: ProjectResourceCommandType.UPDATE,
      resourceId: input.resourceId,
      payload: {
        kind: ProjectResourceUpdateKind.CURRENT_VERSION,
        versionId: input.versionId,
        expectedCurrentVersionId: input.expectedCurrentVersionId,
      },
    },
  };
}
