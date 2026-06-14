import { z } from "zod";

const requiredText = z.string().trim().min(1);

export const envSchema = z.object({
  AI_PROVIDER: z.enum(["openai", "fake"]).default("openai"),
  AI_API_KEY: requiredText,
  AI_API_BASE_URL: z.string().trim().url().optional(),
  AI_MODEL_MULTIMODAL: requiredText,
  AI_MODEL_TEXT: requiredText.default("qwen-plus"),
  ASR_PROVIDER: z.enum(["openai", "fake"]).default("openai"),
  ASR_API_KEY: requiredText,
  ASR_API_BASE_URL: z.string().trim().url().optional(),
  ASR_MODEL: requiredText,
  TTS_PROVIDER: z.enum(["browser", "openai", "fake"]).default("browser"),
  TTS_API_KEY: z.string().optional(),
  TTS_VOICE: z.string().optional(),
  MUSIC_PROVIDER: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  MUSICGEN_MODEL: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["fake", "qiniu"]).default("fake"),
  QINIU_ACCESS_KEY: requiredText,
  QINIU_SECRET_KEY: requiredText,
  QINIU_BUCKET: requiredText,
  QINIU_REGION: requiredText,
  QINIU_PUBLIC_DOMAIN: z.string().trim().url(),
  QINIU_UPLOAD_URL: z.string().trim().url().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional()
});

export type ServerEnv = z.infer<typeof envSchema>;

export function parseServerEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): ServerEnv {
  return envSchema.parse(source);
}
