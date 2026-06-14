import { z } from "zod";

export const ttsStatusSchema = z.enum(["pending", "ready", "failed", "fallback"]);

export const ttsCreateRequestSchema = z.object({
  sessionId: z.string().min(1),
  turnId: z.string().min(1),
  replyText: z.string().trim().min(1).max(4_000),
  voice: z.string().trim().min(1).max(80).optional(),
  speed: z.number().min(0.5).max(2).optional().default(1)
});

export const ttsJobResponseSchema = z.object({
  status: ttsStatusSchema,
  ttsJobId: z.string().min(1),
  ttsUrl: z.string().url().nullable(),
  errorCode: z.literal("tts_failed").nullable()
});

export type TtsStatus = z.infer<typeof ttsStatusSchema>;
export type TtsCreateRequest = z.infer<typeof ttsCreateRequestSchema>;
export type TtsJobResponse = z.infer<typeof ttsJobResponseSchema>;
