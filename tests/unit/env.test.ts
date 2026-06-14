import { describe, expect, it } from "vitest";

import { envSchema, parseServerEnv } from "@/lib/server/env";

describe("server environment validation", () => {
  it("accepts the documented no-key fake demo configuration", () => {
    const parsed = parseServerEnv({
      AI_PROVIDER: "fake",
      ASR_PROVIDER: "fake",
      TTS_PROVIDER: "browser",
      STORAGE_PROVIDER: "fake",
      QINIU_PUBLIC_DOMAIN: "https://cdn.example.com"
    });

    expect(parsed.AI_PROVIDER).toBe("fake");
    expect(parsed.ASR_PROVIDER).toBe("fake");
    expect(parsed.TTS_PROVIDER).toBe("browser");
    expect(parsed.STORAGE_PROVIDER).toBe("fake");
  });

  it("accepts the documented domestic-compatible P0 provider configuration", () => {
    const parsed = parseServerEnv({
      AI_PROVIDER: "openai",
      AI_API_KEY: "dashscope-test",
      AI_API_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      AI_MODEL_MULTIMODAL: "qwen-vl-plus",
      AI_MODEL_TEXT: "qwen-plus",
      ASR_PROVIDER: "openai",
      ASR_API_KEY: "sk-asr",
      ASR_MODEL: "gpt-4o-mini-transcribe",
      TTS_PROVIDER: "browser",
      QINIU_ACCESS_KEY: "ak",
      QINIU_SECRET_KEY: "sk",
      QINIU_BUCKET: "riff",
      QINIU_REGION: "z0",
      QINIU_PUBLIC_DOMAIN: "https://cdn.example.com"
    });

    expect(parsed.AI_API_BASE_URL).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(parsed.AI_MODEL_MULTIMODAL).toBe("qwen-vl-plus");
    expect(parsed.TTS_PROVIDER).toBe("browser");
  });

  it("reports missing required P0 variables", () => {
    const result = envSchema.safeParse({
      AI_PROVIDER: "openai",
      AI_MODEL_MULTIMODAL: "qwen-vl-plus"
    });

    expect(result.success).toBe(false);
  });
});
