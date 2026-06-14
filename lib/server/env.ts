import { z } from "zod";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional()
);
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().optional()
);

const envBaseSchema = z.object({
  AI_PROVIDER: z.enum(["openai", "fake"]).default("openai"),
  AI_API_KEY: optionalText,
  AI_API_BASE_URL: optionalUrl,
  AI_MODEL_MULTIMODAL: optionalText,
  AI_MODEL_TEXT: requiredText.default("qwen-plus"),
  ASR_PROVIDER: z.enum(["openai", "fake"]).default("openai"),
  ASR_API_KEY: optionalText,
  ASR_MODEL: optionalText,
  TTS_PROVIDER: z.enum(["browser", "openai", "fake"]).default("browser"),
  TTS_API_KEY: optionalText,
  TTS_VOICE: optionalText,
  MUSIC_PROVIDER: optionalText,
  REPLICATE_API_TOKEN: optionalText,
  MUSICGEN_MODEL: optionalText,
  STORAGE_PROVIDER: z.enum(["fake", "qiniu"]).default("fake"),
  QINIU_ACCESS_KEY: optionalText,
  QINIU_SECRET_KEY: optionalText,
  QINIU_BUCKET: optionalText,
  QINIU_REGION: optionalText,
  QINIU_PUBLIC_DOMAIN: optionalUrl.default("https://cdn.example.com"),
  QINIU_UPLOAD_URL: optionalUrl,
  SPOTIFY_CLIENT_ID: optionalText,
  SPOTIFY_CLIENT_SECRET: optionalText,
  SPOTIFY_REDIRECT_URI: optionalText
});

function requireWhen(
  context: z.RefinementCtx,
  value: string | undefined,
  path: string,
  message: string
) {
  if (!value) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message
    });
  }
}

export const envSchema = envBaseSchema.superRefine((env, context) => {
  if (env.AI_PROVIDER === "openai") {
    requireWhen(context, env.AI_API_KEY, "AI_API_KEY", "AI_API_KEY is required when AI_PROVIDER=openai");
    requireWhen(
      context,
      env.AI_MODEL_MULTIMODAL,
      "AI_MODEL_MULTIMODAL",
      "AI_MODEL_MULTIMODAL is required when AI_PROVIDER=openai"
    );
  }

  if (env.ASR_PROVIDER === "openai") {
    requireWhen(context, env.ASR_API_KEY, "ASR_API_KEY", "ASR_API_KEY is required when ASR_PROVIDER=openai");
    requireWhen(context, env.ASR_MODEL, "ASR_MODEL", "ASR_MODEL is required when ASR_PROVIDER=openai");
  }

  if (env.TTS_PROVIDER === "openai") {
    requireWhen(context, env.TTS_API_KEY, "TTS_API_KEY", "TTS_API_KEY is required when TTS_PROVIDER=openai");
  }

  if (env.STORAGE_PROVIDER === "qiniu") {
    requireWhen(
      context,
      env.QINIU_ACCESS_KEY,
      "QINIU_ACCESS_KEY",
      "QINIU_ACCESS_KEY is required when STORAGE_PROVIDER=qiniu"
    );
    requireWhen(
      context,
      env.QINIU_SECRET_KEY,
      "QINIU_SECRET_KEY",
      "QINIU_SECRET_KEY is required when STORAGE_PROVIDER=qiniu"
    );
    requireWhen(context, env.QINIU_BUCKET, "QINIU_BUCKET", "QINIU_BUCKET is required when STORAGE_PROVIDER=qiniu");
    requireWhen(context, env.QINIU_REGION, "QINIU_REGION", "QINIU_REGION is required when STORAGE_PROVIDER=qiniu");
  }
});

export type ServerEnv = z.infer<typeof envSchema>;

export function parseServerEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): ServerEnv {
  return envSchema.parse(source);
}
