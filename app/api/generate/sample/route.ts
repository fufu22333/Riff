import { fallbackSampleAudioContentType, readFallbackSampleAudio } from "@/lib/server/music/fallbackSample";

export const runtime = "nodejs";

export async function GET() {
  return new Response(await readFallbackSampleAudio(), {
    status: 200,
    headers: {
      "content-type": fallbackSampleAudioContentType,
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
