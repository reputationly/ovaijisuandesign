import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class VoiceCloneDto {
  @IsString() @IsNotEmpty() audio_path!: string;
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
