import { z } from "zod";

export const generateStatusSchema = z.enum(["queued", "processing", "ready", "fallback_ready", "failed"]);

export const generateCreateRequestSchema = z.object({
  sessionId: z.string().min(1),
  turnId: z.string().min(1),
  promptForMusicGen: z.string().trim().min(1).max(2_000)
});

export const generateJobResponseSchema = z
  .object({
    status: generateStatusSchema,
    jobId: z.string().min(1),
    musicUrl: z.string().url().nullable(),
    errorCode: z.literal("music_generation_failed").nullable(),
    usage: z.literal("reference_only"),
    isExportable: z.literal(false)
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.status === "ready" || value.status === "fallback_ready") && value.musicUrl === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "musicUrl is required when generation status is ready or fallback_ready",
        path: ["musicUrl"]
      });
    }

    if ((value.status === "fallback_ready" || value.status === "failed") && value.errorCode !== "music_generation_failed") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "music_generation_failed is required when generation falls back or fails",
        path: ["errorCode"]
      });
    }
  });

export type GenerateStatus = z.infer<typeof generateStatusSchema>;
export type GenerateCreateRequest = z.infer<typeof generateCreateRequestSchema>;
export type GenerateJobResponse = z.infer<typeof generateJobResponseSchema>;
