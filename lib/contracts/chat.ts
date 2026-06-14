import { z } from "zod";

import { failureCodes } from "./failures";

export const snapshotSchema = z.object({
  mimeType: z.enum(["image/webp", "image/jpeg", "image/png"]),
  base64: z.string().min(1),
  width: z.number().int().positive().max(2048),
  height: z.number().int().positive().max(2048)
});

export const motionSignalSchema = z.object({
  energy: z.enum(["low", "medium", "high"]),
  rhythmic: z.boolean(),
  approach: z.string().min(1).max(80)
});

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  turnId: z.string().min(1),
  userText: z.string().trim().min(1),
  snapshot: snapshotSchema.optional().nullable(),
  snapshotUrl: z.string().trim().url().optional().nullable(),
  motionSignal: motionSignalSchema.optional().nullable(),
  historySummary: z.string().max(4_000).optional().default("")
});

export const visualObservationSchema = z
  .object({
    isUsable: z.boolean(),
    summary: z.string().min(1).nullable(),
    objects: z.array(z.string().min(1)).default([]),
    sceneMood: z.string().min(1).nullable(),
    motionEnergy: z.enum(["low", "medium", "high"]).nullable(),
    confidence: z.number().min(0).max(1),
    failureReason: z.enum(failureCodes).nullable()
  })
  .superRefine((value, context) => {
    if (!value.isUsable && value.failureReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "failureReason is required when visualObservation is unusable",
        path: ["failureReason"]
      });
    }

    if (value.isUsable && value.summary === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "summary is required when visualObservation is usable",
        path: ["summary"]
      });
    }
  });

export const musicSuggestionSchema = z
  .object({
    mood: z.string().min(1).nullable(),
    tempo: z.string().min(1).nullable(),
    instruments: z.array(z.string().min(1)).default([]),
    structure: z.string().min(1).nullable(),
    promptForMusicGen: z.string().min(1).nullable()
  })
  .superRefine((value, context) => {
    const populatedCoreFields = [
      value.mood,
      value.tempo,
      value.instruments.length > 0 ? value.instruments : null,
      value.structure
    ].filter(Boolean).length;

    if (populatedCoreFields < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "musicSuggestion must include at least two of mood, tempo, instruments, or structure"
      });
    }
  });

export const chatResponseSchema = z.object({
  sessionId: z.string().min(1),
  turnId: z.string().min(1),
  replyText: z.string().trim().min(1),
  visualObservation: visualObservationSchema,
  musicSuggestion: musicSuggestionSchema,
  followUpQuestion: z.string().min(1).nullable(),
  suggestedActions: z.array(z.enum(["generate_music"])).default([]),
  qiniu: z
    .object({
      snapshotUrl: z.string().url().nullable(),
      turnJsonUrl: z.string().url().nullable()
    })
    .optional(),
  tts: z
    .object({
      status: z.enum(["pending", "ready", "failed", "fallback"]),
      ttsJobId: z.string().min(1).nullable().optional()
    })
    .optional()
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type VisualObservation = z.infer<typeof visualObservationSchema>;
export type MusicSuggestion = z.infer<typeof musicSuggestionSchema>;
