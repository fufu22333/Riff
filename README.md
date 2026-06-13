# Riff

Riff 是面向独立音乐创作者的 AI 视觉对话助手。它在每轮对话中把用户语音转成文本，截取当前摄像头画面，再把 `userText + snapshot` 发送到 `/api/chat`，返回带视觉依据的音乐创作建议。

## 当前范围

当前代码聚焦 P0 主链路：

1. 摄像头预览和每轮截图。
2. 语音录制、VAD 和 ASR 接口。
3. `/api/chat` 多模态结构化回复。
4. UI 展示用户文本、AI 回复、视觉依据、音乐建议。
5. 服务端保存 snapshot、turn JSON、session JSON，并在 UI 展示云端证据 URL。

TTS、音乐生成和动作能量检测仍是后续范围。它们不应阻塞主链路。

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

常用检查：

```bash
npm test -- --run
npm run typecheck
npm run lint
```

## 环境变量

默认 `.env.example` 使用 fake provider，便于无密钥时跑通 UI 和测试。

真实视觉对话可以使用 OpenAI-compatible 接口。当前示例配置优先考虑国内可用的百炼 / DashScope 兼容模式：

```bash
AI_PROVIDER=openai
AI_API_KEY=replace-with-dashscope-api-key
AI_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL_MULTIMODAL=qwen-vl-plus
AI_MODEL_TEXT=qwen-plus
```

如果继续使用 OpenAI 官方接口，可以不设置 `AI_API_BASE_URL`，并把模型名改成账号可用的多模态模型。

ASR 目前仍通过 `ASR_PROVIDER=openai` 或 fake provider 切换。时间紧时可以先用 fake ASR 验证主链路，再单独接真实 ASR。

七牛云存储：

```bash
STORAGE_PROVIDER=qiniu
QINIU_ACCESS_KEY=replace-with-qiniu-access-key
QINIU_SECRET_KEY=replace-with-qiniu-secret-key
QINIU_BUCKET=replace-with-qiniu-bucket
QINIU_REGION=z0
QINIU_PUBLIC_DOMAIN=https://cdn.example.com
```

七牛 AK/SK 只在服务端使用，不会进入浏览器 bundle。

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
- AI provider、ASR provider、storage provider 的边界设计。
- 每轮 turn 的云端证据展示和七牛存储路径约定。
- 对应的单元测试、API 测试和 Playwright smoke 测试。

## 演示重点

每轮成功回复必须能证明三件事：

1. AI 使用了用户语音文本。
2. AI 给出视觉观察，或明确说明视觉不可用的原因。
3. 页面展示至少一个云端证据 URL，例如 snapshot URL 或 turn JSON URL。

如果视觉不可用，系统应显示 `failureReason`，继续基于语音文本回复，不能编造看见的内容。
