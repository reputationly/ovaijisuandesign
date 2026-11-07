import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class VoiceCloneDto {
  /** 工作区/绝对路径的参考音频（助手用）。与 audio_base64 二选一。 */
  @IsString() @IsOptional() @IsNotEmpty() audio_path?: string;
  /** 设置页上传/录音：直接把音频内容 base64 发上来，网关落临时文件后再登记。 */
  @IsString() @IsOptional() audio_base64?: string;
  @IsString() @IsOptional() filename?: string;
  @IsString() @IsOptional() prompt_audio_path?: string;
  @IsString() @IsOptional() prompt_text?: string;
  @IsString() @IsOptional() demo_text?: string;
  /** 试听用哪个模型。平台只有配置里的语音模型，这个字段只收不用。 */
  @IsString() @IsOptional() demo_model?: string;
  // 下面三个是上游克隆接口的开关。零样本合成直接用原始参考音频，没有对应的处理，只收不用。
  @IsBoolean() @IsOptional() need_noise_reduction?: boolean;
  @IsBoolean() @IsOptional() need_volume_normalization?: boolean;
  @IsBoolean() @IsOptional() aigc_watermark?: boolean;
}

export class VoiceDesignDto {
  @IsString() @IsNotEmpty() prompt!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) preview_text!: string;
  @IsString() @IsOptional() source_node_id?: string;
}

export class VoiceIsolationDto {
  @IsString() @IsNotEmpty() audio_path!: string;
  @IsString() @IsOptional() filename?: string;
  @IsString() @IsOptional() language?: string;
  @IsString() @IsOptional() source_node_id?: string;
}
