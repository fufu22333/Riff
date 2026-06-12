# 环境指南

Next.js 应用搭建完成后，将 `.env.example` 复制为 `.env.local`。

不要提交真实 API Key。

## P0 必需配置

```text
AI_PROVIDER
AI_API_KEY
AI_MODEL_MULTIMODAL

ASR_PROVIDER
ASR_API_KEY
ASR_MODEL

QINIU_ACCESS_KEY
QINIU_SECRET_KEY
QINIU_BUCKET
QINIU_REGION
QINIU_PUBLIC_DOMAIN
```

推荐的 P0 默认值：

```text
AI_PROVIDER=openai
AI_MODEL_MULTIMODAL=gpt-5.4-mini
AI_MODEL_TEXT=gpt-5.4-mini
ASR_PROVIDER=openai
ASR_MODEL=gpt-4o-mini-transcribe
TTS_PROVIDER=browser
```

这表示第一版可运行版本会使用当前的多模态 GPT-5.4 mini 模型完成视觉对话，使用 OpenAI 语音转文本完成 ASR，并使用浏览器朗读作为 TTS 降级。如果较新的转写模型不可用，`whisper-1` 可以保留为兼容 ASR 降级。

## 强烈推荐配置

```text
TTS_PROVIDER
TTS_API_KEY
TTS_VOICE
```

如果缺少 TTS 配置，应用应降级到浏览器 `SpeechSynthesis`，或只保留文本回复。

## 可选配置

```text
REPLICATE_API_TOKEN
MUSICGEN_MODEL

SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI
```

如果音乐生成供应商不可用，可以使用预生成演示素材。

Spotify 属于 P2，不应阻塞比赛提交。

## 本地开发说明

- 浏览器摄像头和麦克风 API 需要 `localhost` 或 HTTPS。
- 七牛云密钥必须只保存在服务端。
- 不要上传连续摄像头视频。每轮对话只上传一张压缩截图。
- 不要把生成媒体提交进 git，除非它是刻意保留的小型演示 fixture。
