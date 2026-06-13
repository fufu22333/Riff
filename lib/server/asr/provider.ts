import type { AsrSuccess } from "@/lib/contracts/asr";

export type AsrProviderName = "fake" | "openai";

export type AsrInput = {
  audio: Blob;
  filename: string;
};

export type AsrProvider = {
  name: AsrProviderName;
  transcribe(input: AsrInput): Promise<AsrSuccess>;
};
