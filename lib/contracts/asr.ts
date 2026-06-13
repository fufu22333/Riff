import { z } from "zod";

export const asrSuccessSchema = z.object({
  userText: z.string().trim().min(1),
  provider: z.enum(["fake", "openai"])
});

export const asrFailureSchema = z.object({
  failureReason: z.literal("asr_failed"),
  message: z.string().min(1)
});

export type AsrSuccess = z.infer<typeof asrSuccessSchema>;
export type AsrFailure = z.infer<typeof asrFailureSchema>;
