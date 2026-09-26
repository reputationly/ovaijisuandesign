import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from "class-validator";
import { Body, Controller, Get, Logger, Module, NotFoundException, Param, Post } from "@nestjs/common";

import { capabilityUnavailable } from "../common/capability.js";

export const MAX_DAG_CONCURRENCY = 5;

export class RunDagDto {
  @IsString() @IsNotEmpty() dag_id!: string;
  @IsObject() @Type(() => Object) inputs!: Record<string, unknown>;
  @IsArray() @IsString({ each: true }) asset_keys!: string[];
  @IsOptional() @IsString() session_id?: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() placeholder_id?: string;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_DAG_CONCURRENCY) concurrency?: number;
}

/**
 * 云端工作流（DAG）的提交与查询。
 *
 * `dag_id` 指的是云端预先编排好的一条工作流（插件里的分镜、多宫格之类），执行完全在云端；
 * 我们的平台只有单个模型的接口，没有工作流引擎，也没有这些工作流的定义，本机没法等价地跑。
 * 所以请求照常校验（参数写错仍是 400，调用方能看出是自己的问题），通过后回"能力不可用"；
 * 查询一律 404 —— 这里从来不会产生 run。
 */
@Controller()
export class DagController {
  private readonly log = new Logger("Dag");

  @Post("api/dag/run")
  runDag(@Body() body: RunDagDto) {
    this.log.warn(`dag run 不可用 dag_id=${body.dag_id}`);
    throw capabilityUnavailable("DAG workflow", "当前平台不支持云端工作流", "the configured platform has no workflow (DAG) engine");
  }

  @Post("api/dag/run-and-watch")
  runDagAndWatch(@Body() body: RunDagDto) {
    this.log.warn(`dag run-and-watch 不可用 dag_id=${body.dag_id} concurrency=${body.concurrency ?? 1}`);
    throw capabilityUnavailable("DAG workflow", "当前平台不支持云端工作流", "the configured platform has no workflow (DAG) engine");
  }

  @Get("api/dag/run/:runId")
  queryDagRun(@Param("runId") runId: string) {
    throw new NotFoundException(`DAG run not found: ${runId}`);
  }
}

@Module({ controllers: [DagController] })
export class DagModule {}
