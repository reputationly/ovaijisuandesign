import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Injectable, Module, NotFoundException, Param, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { GatewayConfig } from "../config/gateway-config.js";

const DESCRIPTION_MAX = 500;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

type Ticket = {
  ticket_id: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  body: Record<string, unknown>;
};

/**
 * 反馈单记在数据根。没有云端账号时，提交方仍然能拿到稳定的 ticket_id，同一幂等键不会开第二张单。
 */
@Injectable()
export class FeedbackService {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(@Inject(GatewayConfig) private readonly cfg: GatewayConfig) {}

  async upload(file: { buffer: Buffer; originalname: string; mimetype?: string; size: number }) {
    const id = randomUUID();
    const safeName = path.basename(file.originalname).replace(/[^\w.\-]+/g, "_").slice(0, 120) || "attachment";
    const relative = path.join("feedback", "attachments", id, safeName);
    const absolute = path.join(this.cfg.hubDir, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.buffer);
    return { url: relative.split(path.sep).join("/"), name: file.originalname, mimeType: file.mimetype || "application/octet-stream", size: file.size };
  }

  async create(body: Record<string, unknown>) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description || description.length > DESCRIPTION_MAX) throw new BadRequestException("description must be 1–500 characters");
    const idempotency = typeof body.idempotency_key === "string" && body.idempotency_key.trim() ? body.idempotency_key.trim() : randomUUID();
    return this.enqueue(async () => {
      const tickets = await this.read();
      const existing = tickets.find((ticket) => ticket.idempotency_key === idempotency);
      if (existing) return { ticket_id: existing.ticket_id };
      const now = new Date().toISOString();
      const ticket: Ticket = {
        ticket_id: `fb_${createHash("sha256").update(idempotency).digest("hex").slice(0, 16)}`,
        idempotency_key: idempotency,
        created_at: now,
        updated_at: now,
        body: { ...body, description, idempotency_key: idempotency },
      };
      tickets.push(ticket);
      await this.write(tickets);
      return { ticket_id: ticket.ticket_id };
    });
  }

  async list(page = 1, pageSize = 20) {
    const tickets = await this.read();
    const start = Math.max(0, (page - 1) * pageSize);
    return { items: tickets.slice(start, start + pageSize).map(present), total: tickets.length, page, page_size: pageSize };
  }

  async get(ticketId: string) {
    const ticket = (await this.read()).find((item) => item.ticket_id === ticketId);
    if (!ticket) throw new NotFoundException("Feedback ticket not found");
    return present(ticket);
  }

  async update(ticketId: string, patch: Record<string, unknown>) {
    return this.enqueue(async () => {
      const tickets = await this.read();
      const ticket = tickets.find((item) => item.ticket_id === ticketId);
      if (!ticket) throw new NotFoundException("Feedback ticket not found");
      if (typeof patch.description === "string") {
        const description = patch.description.trim();
        if (!description || description.length > DESCRIPTION_MAX) throw new BadRequestException("description must be 1–500 characters");
        ticket.body.description = description;
      }
      for (const key of ["classification_status", "severity", "module", "type"]) {
        if (patch[key] !== undefined) ticket.body[key] = patch[key];
      }
      ticket.updated_at = new Date().toISOString();
      await this.write(tickets);
      return present(ticket);
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.chain.then(operation, operation);
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  private file(): string {
    return path.join(this.cfg.hubDir, "feedback", "tickets.json");
  }

  private async read(): Promise<Ticket[]> {
    try {
      const parsed = JSON.parse(await readFile(this.file(), "utf8")) as unknown;
      return Array.isArray(parsed) ? parsed as Ticket[] : [];
    } catch {
      return [];
    }
  }

  private async write(tickets: Ticket[]): Promise<void> {
    const file = this.file();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(tickets), "utf8");
  }
}

function present(ticket: Ticket) {
  return { ticket_id: ticket.ticket_id, created_at: ticket.created_at, updated_at: ticket.updated_at, ...ticket.body };
}

@Controller("api/feedback")
export class FeedbackController {
  constructor(@Inject(FeedbackService) private readonly feedback: FeedbackService) {}

  @Post("upload-attachment")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: ATTACHMENT_MAX_BYTES } }))
  upload(@UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype?: string; size: number }) {
    if (!file) throw new BadRequestException('No file provided. Send multipart/form-data with a "file" field.');
    return this.feedback.upload(file);
  }

  @Post()
  @HttpCode(200)
  create(@Body() body: Record<string, unknown>) {
    return this.feedback.create(body ?? {});
  }

  @Get()
  list(@Query("page") page?: string, @Query("page_size") pageSize?: string) {
    return this.feedback.list(numberOr(page, 1), numberOr(pageSize, 20));
  }

  @Get(":ticketId")
  get(@Param("ticketId") ticketId: string) {
    return this.feedback.get(ticketId);
  }

  @Put(":ticketId")
  update(@Param("ticketId") ticketId: string, @Body() body: Record<string, unknown>) {
    return this.feedback.update(ticketId, body ?? {});
  }
}

function numberOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({ controllers: [FeedbackController], providers: [FeedbackService] })
export class FeedbackModule {}
