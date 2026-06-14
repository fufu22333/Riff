# Riff

Riff is an AI visual conversation assistant for music creators. It combines webcam context, spoken intent, multimodal AI reasoning, reference-track playback, and Qiniu-backed cloud evidence in one conversational turn.

Riff 是一款面向音乐创作者的 AI 视觉对话助手。它把摄像头画面、语音意图、多模态 AI 推理、参考音轨播放和七牛云证据记录串在同一轮对话里。

This project was built for **Qiniu XEngineer Challenge - Topic 1: AI Visual Conversation Assistant**.

本项目对应 **七牛云 XEngineer 挑战赛 - 题目一：AI 视觉对话助手**。

## Demo Focus

Riff is designed to prove five capabilities in a short demo:

Riff 的演示重点是用较短流程证明五项能力：

1. **Visual scene awareness** - the app captures a current webcam frame for each conversation turn.

   **视觉现场感知** - 每轮对话都会捕获当前摄像头画面。

2. **Voice-first interaction** - microphone input is recorded, segmented by VAD, and transcribed by ASR.

   **语音优先交互** - 麦克风输入会被录制，经 VAD 分段后交给 ASR 转写。

3. **Grounded AI replies** - `/api/chat` returns structured responses with either visual evidence or an explicit visual failure reason.

   **有依据的 AI 回复** - `/api/chat` 返回结构化结果，包含视觉证据，或明确说明视觉不可用的原因。

4. **Music creation guidance** - the AI response includes mood, tempo, instrumentation, structure, and a prompt for a reference track.

   **音乐创作建议** - AI 回复包含情绪、速度、配器、结构，以及生成参考音轨所需的提示词。

5. **Cloud evidence** - snapshots, turn JSON, session JSON, and generated reference audio can be stored behind Qiniu/fake CDN URLs.

   **云端证据** - 截图、单轮 JSON、会话 JSON 和生成的参考音频都可以通过七牛云或 fake CDN URL 留存。

Reference tracks are **creative references only**. The UI does not provide download, copy-link, or export actions.

参考音轨仅作为 **创作参考** 使用。界面不提供下载、复制链接或导出入口。

## Current Feature Set

| Area | Status | Notes |
| --- | --- | --- |
| Camera preview and per-turn snapshot<br>摄像头预览与每轮截图 | Implemented<br>已实现 | Uses browser camera access and canvas-based snapshot capture.<br>使用浏览器摄像头权限和 canvas 捕获当前画面。 |
| Voice recording, VAD, and ASR<br>语音录制、VAD 与 ASR | Implemented<br>已实现 | Fake provider is available for local demos; OpenAI-compatible ASR can be configured.<br>本地演示可使用 fake provider，也可以配置 OpenAI 兼容 ASR。 |
| Multimodal chat<br>多模态对话 | Implemented<br>已实现 | `/api/chat` accepts `userText`, snapshot data, motion placeholder, and history summary.<br>`/api/chat` 接收 `userText`、截图数据、动作占位信息和历史摘要。 |
| Visual evidence UI<br>视觉证据界面 | Implemented<br>已实现 | Shows usable observations or clear fallback reasons without inventing visual content.<br>展示可用视觉观察，或在视觉不可用时给出明确兜底原因，不编造画面内容。 |
| Qiniu/fake storage evidence<br>七牛云或 fake 存储证据 | Implemented<br>已实现 | Persists key turn artifacts and exposes stable public URLs.<br>持久化关键轮次产物，并暴露稳定的公开 URL。 |
| Async TTS<br>异步 TTS | Implemented<br>已实现 | Server/fake job flow plus browser fallback; it never blocks the next turn.<br>支持 server/fake 任务流程和浏览器兜底，不阻塞下一轮对话。 |
| Reference track generation<br>参考音轨生成 | Implemented<br>已实现 | `/api/generate` resolves to `ready` or `fallback_ready` with a playable reference-only audio URL.<br>`/api/generate` 返回 `ready` 或 `fallback_ready`，并提供可播放的 reference-only 音频 URL。 |

## User Stories

| User Story | Planned | Implemented |
| --- | --- | --- |
| As a creator, I can show my current room, desk, instrument, lyrics, or gear to the assistant.<br>作为创作者，我可以把当前房间、桌面、乐器、歌词或设备展示给助手。 | Yes<br>是 | Yes<br>是 |
| As a creator, I can speak a music direction instead of typing it.<br>作为创作者，我可以直接说出音乐方向，不必打字。 | Yes<br>是 | Yes<br>是 |
| As a creator, I get a response that connects my spoken intent with visible context.<br>作为创作者，我能得到同时结合语音意图和画面上下文的回复。 | Yes<br>是 | Yes<br>是 |
| As a judge, I can verify the app does not fake visual understanding when vision is unavailable.<br>作为评委，我可以验证应用在视觉不可用时不会假装看见了内容。 | Yes<br>是 | Yes<br>是 |
| As a judge, I can inspect cloud evidence for key artifacts.<br>作为评委，我可以查看关键产物的云端证据。 | Yes<br>是 | Yes<br>是 |
| As a creator, I can hear or play a generated reference direction.<br>作为创作者，我可以收听或播放生成的参考方向。 | Yes<br>是 | Yes, as a reference-only track with fallback sample support<br>是，以 reference-only 音轨形式提供，并支持兜底样例。 |

## How It Works

```text
Camera preview -> Voice recording / VAD -> ASR -> Current-frame snapshot
-> POST /api/chat -> Structured AI reply -> Visual evidence + music suggestion UI
-> Optional TTS and reference-track job -> Qiniu/fake CDN evidence
```

```text
摄像头预览 -> 语音录制 / VAD -> ASR -> 当前帧截图
-> POST /api/chat -> 结构化 AI 回复 -> 视觉证据 + 音乐建议界面
-> 可选 TTS 与参考音轨任务 -> 七牛云 / fake CDN 证据
```

Key routes:

关键路由：

- `POST /api/asr` - transcribes one recorded audio segment.

  `POST /api/asr` - 转写一段录制好的音频。

- `POST /api/chat` - main multimodal conversation endpoint.

  `POST /api/chat` - 主多模态对话接口。

- `POST /api/tts` and `GET /api/tts/{jobId}` - asynchronous speech playback support.

  `POST /api/tts` 和 `GET /api/tts/{jobId}` - 支持异步语音播放。

- `POST /api/generate` and `GET /api/generate/{jobId}` - reference-track generation and fallback resolution.

  `POST /api/generate` 和 `GET /api/generate/{jobId}` - 参考音轨生成与兜底状态查询。

- `GET /api/generate/sample` - browser-playable pregenerated fallback audio.

  `GET /api/generate/sample` - 浏览器可播放的预生成兜底音频。

## Architecture

The codebase keeps provider-specific work behind internal adapters:

代码库把不同 provider 的实现都收在内部适配层后面：

- `components/*` - browser UI for camera, recorder, visual evidence, music suggestions, and playback panels.

  `components/*` - 摄像头、录音、视觉证据、音乐建议和播放面板等浏览器界面。

- `lib/contracts/*` - shared Zod schemas for API request/response contracts.

  `lib/contracts/*` - API 请求和响应共用的 Zod schema。

- `lib/client/*` - browser-only camera and recorder helpers.

  `lib/client/*` - 仅在浏览器侧使用的摄像头和录音辅助逻辑。

- `lib/server/ai/*` - fake and OpenAI-compatible multimodal chat providers.

  `lib/server/ai/*` - fake 与 OpenAI 兼容的多模态对话 provider。

- `lib/server/asr/*` - fake and OpenAI-compatible ASR providers.

  `lib/server/asr/*` - fake 与 OpenAI 兼容的 ASR provider。

- `lib/server/storage/*` - fake storage and Qiniu upload/public URL adapters.

  `lib/server/storage/*` - fake storage 与七牛云上传、公开 URL 适配器。

- `lib/server/tts/*` - asynchronous TTS job provider.

  `lib/server/tts/*` - 异步 TTS 任务 provider。

- `lib/server/music/*` - reference-track job provider with fake and fallback paths.

  `lib/server/music/*` - 参考音轨任务 provider，包含 fake 与兜底路径。

Storage object layout:

存储对象路径约定：

```text
snapshots/{sessionId}/{turnId}.webp
turns/{sessionId}/{turnId}.json
sessions/{sessionId}.json
audio/{sessionId}/{assetId}.mp3
audio/{sessionId}/{assetId}.wav
```

## Cost Control Strategy

Planned and adopted cost controls:

计划并实际采用的成本控制策略：

- **VAD before ASR** - ASR is called only after a complete speech segment is detected.

  **先 VAD 后 ASR** - 只有检测到完整语音片段后才调用 ASR。

- **One compressed frame per turn** - the app sends a single current snapshot, not a video stream.

  **每轮只传一张压缩图** - 应用发送当前截图，而不是持续传视频流。

- **Bounded conversation context** - the client sends a short history summary instead of unbounded raw turns.

  **限制对话上下文** - 客户端发送简短历史摘要，不无限追加原始轮次。

- **Async non-blocking media** - TTS and reference-track jobs do not block the main chat loop.

  **媒体任务异步化** - TTS 和参考音轨任务不会阻塞主对话链路。

- **Provider fallback paths** - fake providers and pregenerated reference samples keep local demos stable without paid APIs.

  **Provider 兜底路径** - fake provider 和预生成参考样例让本地演示不依赖付费 API 也能稳定运行。

- **Key artifacts only** - storage focuses on snapshots, JSON evidence, and final audio references instead of continuous media.

  **只存关键产物** - 存储重点放在截图、JSON 证据和最终参考音频，而不是连续媒体。

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

打开 `http://localhost:3000`。

The default `.env.example` is set up for local fake-provider demos. Copy it to `.env.local` before adding real credentials.

默认的 `.env.example` 适合本地 fake-provider 演示。添加真实凭证前，先复制为 `.env.local`。

```bash
cp .env.example .env.local
```

On Windows PowerShell:

在 Windows PowerShell 中：

```powershell
Copy-Item .env.example .env.local
```

## Provider Configuration

Local demo defaults:

本地演示默认配置：

```bash
AI_PROVIDER=fake
ASR_PROVIDER=fake
TTS_PROVIDER=browser
MUSIC_PROVIDER=fake
STORAGE_PROVIDER=fake
QINIU_PUBLIC_DOMAIN=https://cdn.example.com
```

OpenAI-compatible multimodal chat can be configured with:

OpenAI 兼容的多模态对话可按下面方式配置：

```bash
AI_PROVIDER=openai
AI_API_KEY=replace-with-provider-key
AI_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL_MULTIMODAL=qwen-vl-plus
AI_MODEL_TEXT=qwen-plus
```

Qiniu storage can be configured with:

七牛云存储可按下面方式配置：

```bash
STORAGE_PROVIDER=qiniu
QINIU_ACCESS_KEY=replace-with-qiniu-access-key
QINIU_SECRET_KEY=replace-with-qiniu-secret-key
QINIU_BUCKET=replace-with-qiniu-bucket
QINIU_REGION=z0
QINIU_PUBLIC_DOMAIN=https://cdn.example.com
QINIU_UPLOAD_URL=
```

Qiniu access keys are used only on the server and are not exposed to the browser bundle.

七牛云 AK/SK 只在服务端使用，不会进入浏览器 bundle。

## Verification

Useful checks:

常用检查命令：

```bash
npm run typecheck
npm test -- --run
npm run lint
```

Recent local verification for PR8:

PR8 最近一次本地验证：

- `npm run typecheck`

  `npm run typecheck`

- `npm test -- --run` - 17 test files, 77 tests

  `npm test -- --run` - 17 个测试文件，77 个测试用例

- `npm run lint`

  `npm run lint`

## Demo Video Route

A recommended demo recording order:

建议按以下顺序录制演示视频：

1. Open the app and state that Riff targets Topic 1: AI Visual Conversation Assistant.

   打开应用，并说明 Riff 对应题目一：AI 视觉对话助手。

2. Start camera and microphone permissions.

   开启摄像头和麦克风权限。

3. Show a visible music-related scene, such as headphones, keyboard, lyrics, or a desk setup.

   展示一个与音乐相关的可见现场，例如耳机、键盘、歌词或桌面设备。

4. Speak a creative request, for example: “I want a lonely 3 a.m. track with headphones-on bedroom energy.”

   说出一个创作请求，例如：“I want a lonely 3 a.m. track with headphones-on bedroom energy.”

5. Show the ASR transcript and the current-turn snapshot behavior.

   展示 ASR 转写结果和当前轮截图行为。

6. Show the AI response, visual evidence, and explicit fallback reason if vision is unavailable.

   展示 AI 回复、视觉证据；如果视觉不可用，则展示明确的兜底原因。

7. Show the music suggestion card: mood, tempo, instruments, structure, and generation prompt.

   展示音乐建议卡片，包括情绪、速度、乐器、结构和生成提示词。

8. Click `Generate music` and play the reference-only track in `ready` or `fallback_ready` state.

   点击 `Generate music`，播放 `ready` 或 `fallback_ready` 状态下的 reference-only 音轨。

9. Show cloud evidence URLs for snapshot, turn JSON, session JSON, or audio.

   展示截图、单轮 JSON、会话 JSON 或音频的云端证据 URL。

10. Explain the cost controls: VAD, one-frame snapshots, async media jobs, fallback providers, and key-artifact storage.

    说明成本控制策略：VAD、单帧截图、异步媒体任务、provider 兜底和关键产物存储。

## Scope Boundaries

- Reference tracks are not finished songs and are not exportable from the UI.

  参考音轨不是完整成品歌曲，界面中也不提供导出能力。

- The project does not claim DRM-grade download prevention for browser-playable audio.

  项目不声称对浏览器可播放音频提供 DRM 级防下载能力。

- Complex gesture semantics and Spotify integration are intentionally outside the current demo scope.

  复杂手势语义和 Spotify 集成不在当前演示范围内。

- Real provider smoke tests require valid API and Qiniu credentials.

  真实 provider 的 smoke test 需要有效的 API 与七牛云凭证。

## Third-Party Dependencies

- Next.js / React - application framework and rendering.

  Next.js / React - 应用框架与页面渲染。

- Tailwind CSS - styling.

  Tailwind CSS - 样式系统。

- Zod - API and environment contract validation.

  Zod - API 与环境变量合约校验。

- Vitest - unit and API tests.

  Vitest - 单元测试与 API 测试。

- Playwright - browser smoke tests.

  Playwright - 浏览器 smoke test。

- lucide-react - UI icons.

  lucide-react - 界面图标。

## Original Work

The original work in this repository includes:

本仓库中的原创工作包括：

- Riff's visual music assistant product flow and information architecture.

  Riff 的视觉音乐助手产品流程和信息架构。

- Camera preview, snapshot compression, and visual fallback handling.

  摄像头预览、截图压缩和视觉兜底处理。

- Voice recording, VAD submission, and ASR integration flow.

  语音录制、VAD 提交和 ASR 集成流程。

- Structured `/api/chat` contract for visual evidence and music suggestions.

  面向视觉证据和音乐建议的结构化 `/api/chat` 合约。

- Provider boundaries for AI, ASR, storage, TTS, and reference-track generation.

  AI、ASR、存储、TTS 和参考音轨生成的 provider 边界。

- Qiniu/fake CDN evidence flow for snapshots, JSON artifacts, and reference audio.

  面向截图、JSON 产物和参考音频的七牛云 / fake CDN 证据链路。

- Reference-only generation contract with `ready` / `fallback_ready` states.

  带有 `ready` / `fallback_ready` 状态的 reference-only 生成合约。

- Tests for contracts, API routes, UI flows, provider behavior, and storage evidence.

  覆盖合约、API 路由、UI 流程、provider 行为和存储证据的测试。
