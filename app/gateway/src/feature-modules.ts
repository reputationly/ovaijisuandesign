import { Module } from "@nestjs/common";

import { TextVersionModule } from "./text-version/text-version.module.js";

/**
 * 版本历史、记忆、会话导出、诊断等独立功能模块的汇总。单独成一个模块，根模块只多一行 import，
 * 并行开发的其他模块改根模块时不容易撞车。
 */
@Module({ imports: [TextVersionModule] })
export class FeatureModules {}
