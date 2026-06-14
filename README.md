# Riff

Riff is an AI visual conversation assistant for music creators. It combines current-frame camera context, spoken intent, multimodal reasoning, music creation guidance, reference-only audio playback, and Qiniu-backed evidence storage in one conversational experience.

Riff 是一款面向音乐创作者的 AI 视觉对话助手。它将摄像头当前帧、语音意图、多模态理解、音乐创作建议、参考音频播放和七牛云证据留存整合到同一套对话流程中。

This project was built for **Qiniu XEngineer Challenge - Topic 1: AI Visual Conversation Assistant**.

本项目对应 **七牛云 XEngineer 挑战赛 - 题目一：AI 视觉对话助手**。

## Demo Video

Demo video: https://b23.tv/gEXq51i

演示视频：https://b23.tv/gEXq51i

Note: the current demo video does not include the voice-interaction segment yet. The complete version will be updated using the same link.

注：当前演示视频暂未包含语音交互片段，完整版会更新到同一链接。

## Design Document

See [docs/design.md](./docs/design.md) for the user stories, implementation scope, cost-control strategy, known limitations, and follow-up plan.

设计文档见 [docs/design.md](./docs/design.md)，其中记录了用户故事、最终实现范围、成本控制策略、已知边界和后续计划。

## Features

- **Camera-aware conversation** - captures the current camera frame and uses it as context for each conversation turn.

  **视觉上下文对话** - 每轮对话都会结合当前摄像头帧作为上下文。

- **Voice-first input** - records microphone input, detects speech segments, and transcribes them into text.

  **语音优先输入** - 支持麦克风录音、语音片段检测和文字转写。

- **Grounded AI response** - returns structured replies with visual evidence or an explicit reason when vision is unavailable.

  **有依据的 AI 回复** - 回复中包含视觉依据；当视觉不可用时，会明确说明原因。

- **Music creation guidance** - provides mood, tempo, instrumentation, structure, and prompt suggestions for music creation.

  **音乐创作建议** - 输出情绪、速度、配器、结构和音乐生成提示词等创作参考。

- **Reference-only audio playback** - resolves a playable fallback/reference audio track for creative direction. This is not a full commercial music-generation system.

  **参考音频播放** - 提供可播放的参考音频，帮助用户快速感受创作方向；当前不是完整可商用音乐生成系统。

- **Qiniu evidence storage** - stores key artifacts such as snapshots, turn records, session records, and reference audio.

  **七牛云证据留存** - 留存截图、单轮记录、会话记录和参考音频等关键产物。

## How It Works

```text
Camera preview -> Voice recording -> ASR -> Current-frame snapshot
-> Multimodal chat -> Visual evidence + music suggestion
-> Optional browser TTS / reference-only audio playback -> Qiniu evidence storage
```

```text
摄像头预览 -> 语音录制 -> ASR 转写 -> 当前帧截图
-> 多模态对话 -> 视觉证据 + 音乐建议
-> 可选浏览器朗读 / 参考音频播放 -> 七牛云证据留存
```

## Main Routes

- `POST /api/asr` - transcribes recorded audio.
- `POST /api/chat` - handles the main multimodal conversation.
- `POST /api/tts` and `GET /api/tts/{jobId}` - support asynchronous speech playback.
- `POST /api/generate` and `GET /api/generate/{jobId}` - handle reference-only audio jobs and fallback playback.
- `GET /api/generate/sample` - returns a browser-playable sample reference track.

## Project Structure

- `app/` - Next.js app routes and API endpoints.
- `components/` - browser UI for camera, recorder, evidence, suggestions, and playback.
- `lib/client/` - browser-side camera and recorder helpers.
- `lib/contracts/` - shared API request and response schemas.
- `lib/server/` - server-side providers for AI, ASR, storage, TTS, and music generation.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

打开 `http://localhost:3000`。

Create a local environment file before configuring real provider credentials:

配置真实服务凭证前，请先创建本地环境文件：

```bash
cp .env.example .env.local
```

On Windows PowerShell:

在 Windows PowerShell 中：

```powershell
Copy-Item .env.example .env.local
```

## Tech Stack

- Next.js / React
- TypeScript
- Tailwind CSS
- Zod
- Vitest
- Playwright
- Qiniu Cloud Storage
- OpenAI-compatible multimodal chat / ASR providers

## Original Work

The original work in this repository includes:

本仓库中的原创工作包括：

- Visual music-assistant product flow and information architecture.

  视觉音乐助手的产品流程与信息架构。

- Camera preview, snapshot compression, and unavailable-vision handling.

  摄像头预览、截图压缩与视觉不可用处理。

- Voice recording, speech detection, and ASR integration.

  语音录制、语音检测与 ASR 集成。

- Structured multimodal chat contract for visual evidence and music suggestions.

  面向视觉证据与音乐建议的结构化多模态对话合约。

- Qiniu evidence flow for snapshots, JSON artifacts, and reference audio.

  面向截图、JSON 产物与参考音频的七牛云证据链路。

## Current Boundaries

- Vision is snapshot-based: each conversation turn sends the current camera frame, not a continuous live video stream.
- Real microphone interaction is implemented but still needs a final quiet-room manual demo recording.
- Reference audio is marked as reference-only. The current build uses fake/fallback generation rather than a commercial music-generation provider.

## 当前边界

- 视觉理解基于每轮当前帧截图，不是连续视频流理解。
- 真实麦克风交互链路已经实现，但仍需要在安静环境补录真人演示。
- 参考音频明确标记为仅供参考；当前版本使用 fake/fallback 生成链路，不是完整可商用音乐生成服务。
