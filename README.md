# Riff

Riff 是面向独立音乐创作者的 AI 视觉对话助手。每一轮对话会组合用户语音文本、当前摄像头压缩截图、结构化 AI 回复、视觉依据、音乐建议、云端证据 URL 和非阻塞 TTS 状态。

## P0 演示范围

当前代码聚焦 P0 比赛主链路：

1. 摄像头预览和每轮截图。
2. 语音录制、VAD 和 ASR。
3. 统一通过 `POST /api/chat` 返回多模态结构化回复。
4. UI 展示用户文本、AI 回复、视觉依据、失败原因、音乐建议、七牛或 fake storage 证据、TTS 状态。
5. 服务端保存 snapshot、turn JSON 和 session JSON。
6. TTS 异步生成，并支持浏览器朗读兜底。

P1/P2 的音乐生成、动作能量和 Spotify 不属于本次 PR7 验收硬化范围。

## 快速启动

```bash
npm install
copy .env.example .env
npm run dev
```

打开 `http://localhost:3000`。

默认 `.env.example` 是无密钥 demo 配置：

```bash
AI_PROVIDER=fake
ASR_PROVIDER=fake
STORAGE_PROVIDER=fake
TTS_PROVIDER=browser
QINIU_PUBLIC_DOMAIN=https://cdn.example.com
```

使用这些配置时，不需要 OpenAI、DashScope、七牛或 TTS 密钥，也可以稳定跑通本地演示。

## 验证命令

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:smoke
npm run test:p0
```

最快的手动 P0 检查：启动应用后点击 `Test ASR`。fake provider 模式下应创建完整对话 turn，显示视觉依据或视觉失败原因，显示音乐建议，显示 fake 云端证据 URL，并让 TTS 进入浏览器 fallback。

## Provider 配置

### 真实 AI

`AI_PROVIDER=openai` 用于 OpenAI-compatible 多模态对话。DashScope 兼容模式示例：

```bash
AI_PROVIDER=openai
AI_API_KEY=replace-with-dashscope-api-key
AI_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL_MULTIMODAL=qwen-vl-plus
AI_MODEL_TEXT=qwen-plus
```

如果使用 OpenAI 官方接口，可以留空 `AI_API_BASE_URL`，并把模型名改成账号可用的多模态模型。

### 真实 ASR

```bash
ASR_PROVIDER=openai
ASR_API_KEY=replace-with-openai-api-key
ASR_MODEL=gpt-4o-mini-transcribe
```

ASR 失败时，`/api/asr` 返回 `asr_failed`；前端显示重新录制入口，并且不创建正式对话 turn。

### 真实七牛存储

```bash
STORAGE_PROVIDER=qiniu
QINIU_ACCESS_KEY=replace-with-qiniu-access-key
QINIU_SECRET_KEY=replace-with-qiniu-secret-key
QINIU_BUCKET=replace-with-qiniu-bucket
QINIU_REGION=z0
QINIU_PUBLIC_DOMAIN=https://cdn.example.com
```

七牛 AK/SK 只在服务端使用，不能进入浏览器 bundle。存储初始化或上传失败时，`/api/chat` 仍返回 AI 回复，并把 storage URLs 置为 `null`。

### TTS

```bash
TTS_PROVIDER=browser
```

browser 模式返回 `fallback`，浏览器可用时使用 `SpeechSynthesis`。fake/server TTS 走异步任务；失败返回 `tts_failed`，不阻塞下一轮语音或对话。

## 演示路径

1. 使用默认 fake demo 配置启动应用。
2. 打开首页。
3. 可用时启动摄像头；也可以拒绝或跳过摄像头，用于展示 voice-only fallback。
4. 点击 `Test ASR`，或录制一段短语音。
5. 确认对话 turn 展示 `userText`。
6. 确认 `/api/chat` 返回包含 `replyText`、`visualObservation`、`musicSuggestion`、`followUpQuestion`、`suggestedActions` 的结构化回复。
7. 确认 UI 展示视觉观察摘要或明确的 `failureReason`。
8. 确认 fake storage 模式下展示 snapshot / turn JSON URL；存储失败时展示 `Storage evidence is unavailable`。
9. 确认 TTS 展示 `fallback`、`pending`、`ready` 或 `failed`，并且不阻塞下一轮。
10. 再跑第二轮对话，确认历史和 turn 状态不丢失。

## 失败路径

PR7 需要这些降级路径保持可演示：

- `no_camera_permission`：拒绝摄像头权限后继续 voice-only 模式。
- `snapshot_failed`：截图失败后继续文本对话。
- `asr_failed`：ASR 失败后显示重新录制入口，不创建正式 turn。
- `vision_api_failed`：chat provider 失败后返回安全的结构化文本兜底。
- storage failure：七牛或 fake storage 失败后保留 AI 回复，并显示云端证据不可用。
- `tts_failed`：TTS 失败后保留文本回复，下一轮仍可继续。

## 成本控制

- 每轮只上传一张压缩截图，不上传连续视频。
- 使用 VAD，让 ASR 每轮只接收一段短音频。
- 使用 `historySummary`，避免无限传递完整历史。
- TTS 异步处理，只对最终 `replyText` 生成。
- 本地开发和 CI 默认使用 fake providers。
- 七牛只保存关键 demo 产物：snapshot、turn JSON、session JSON 和生成音频。

## 主要依赖与原创功能边界

主要第三方依赖：

- Next.js / React：应用框架与页面渲染。
- Tailwind CSS：样式系统。
- Zod：环境变量与 API 合约校验。
- Vitest：单元测试。
- Playwright：浏览器 smoke test。
- lucide-react：界面图标。

当前原创功能包括：

- Riff 的视觉音乐创作产品结构和页面信息架构。
- 摄像头预览、截图压缩和视觉失败状态。
- 语音录制、VAD 提交和 ASR flow。
- `/api/chat` 请求/响应 schema、视觉依据和音乐建议合约。
- AI provider、ASR provider、storage provider、TTS provider 的边界设计。
- 每轮 turn 的云端证据展示、七牛存储路径约定和 session JSON 合并策略。
- P0 demo/failure 验收脚本与 ops checklist。

## 相关文件

- `docs/ops/checklist.md`：P0 验收清单。
- `docs/ops/pr4-conversation-loop-handoff.md`：对话主链路交接说明。
- `docs/ops/pr5-storage-handoff.md`：存储与云端证据交接说明。
- `docs/ops/pr-submission-guidelines.md`：PR 提交规范。
