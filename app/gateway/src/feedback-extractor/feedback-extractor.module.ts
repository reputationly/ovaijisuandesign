import { Module } from "@nestjs/common";

import { FeedbackExtractorController } from "./feedback-extractor.controller.js";

@Module({ controllers: [FeedbackExtractorController] })
export class FeedbackExtractorModule {}
