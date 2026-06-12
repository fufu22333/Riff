# Riff 产品设计文档 v4.1

七牛云 XEngineer 比赛参赛作品  
题目：AI 视觉对话助手（第一题）

## 一、产品概述

### 1.1 一句话定义

Riff 是面向独立音乐创作者的 AI 视觉对话助手：它通过摄像头观察创作者的状态、动作、环境和展示物，结合语音输入理解创作意图，并以对话方式给出音乐情绪、节奏、音色和结构建议。

### 1.2 核心定位

- 视觉优先：第一能力是看见创作现场并给出有视觉依据的回应，而不是单纯生成音乐。
- 语音驱动：用户主要通过说话表达感受，不依赖键盘输入。
- 场景观察：不承诺精准表情识别或复杂手势语义识别，只观察画面是否可用、人物状态、动作强度、环境氛围、设备和展示物。
- 音乐垂直场景：将视觉对话落到音乐创作陪练，使作品有差异化且不偏离“AI 视觉对话助手”。
- 端云协同：端侧完成采集、压缩、VAD 和基础动作信号；云侧完成 ASR、多模态理解、TTS、音乐生成与七牛云存储分发。

### 1.3 默认实现边界

- 默认不上传连续视频，只在每轮语音结束时上传一张压缩截图。
- 默认前端只调用一个主对话接口 `/api/chat`；视觉理解由后端在该接口内部完成。
- TTS 不阻塞主流程：文字回复先展示，朗读音频异步生成；失败时保留文字和兜底朗读。
- 参考音轨生成是 P1 亮点，不影响核心视觉对话验收；Spotify 为 P2，可直接砍掉。

## 二、用户故事与可测验收

### P0 核心故事

#### US-01 视觉场景观察

作为创作者，我希望 Riff 能看到我当前的创作现场，而不是只听我说话。

- 验收：页面实时显示摄像头画面，并在每轮语音结束后生成一张截图。
- 验收：每轮 AI 回复至少包含一条 `visualObservation.summary` 或 `failureReason`。
- 验收：当画面过暗、模糊、无权限或截图失败时，系统显示失败状态，并继续基于语音文本回复。

#### US-02 语音灵感对话

作为音乐创作者，我想说出模糊感觉，让 AI 结合画面帮我转成创作方向。

- 验收：VAD 检测停顿约 1.5 秒后自动提交录音片段。
- 验收：ASR 成功后，对话流出现 `userText`；ASR 失败时可重新录制。
- 验收：AI 回复包含音乐建议字段 `musicSuggestion`，至少包括 `mood`、`tempo`、`instruments` 三项中的两项。

#### US-03 视觉 + 语音联合回应

作为用户，我希望 AI 把“看见的现场”和“我说的话”合并理解，而不是分别复述。

- 验收：`/api/chat` 返回 `replyText`、`visualObservation`、`musicSuggestion`、`followUpQuestion`、`suggestedActions`。
- 验收：当用户展示歌词、乐器、耳机、键盘、草稿或屏幕时，AI 回复应引用其中至少一个可见元素；识别不到时不得编造。
- 验收：当视觉置信度低于阈值时，AI 明确说明视觉信息不足，并以追问引导用户调整镜头。

#### US-04 TTS 异步朗读

作为用户，我希望 AI 回复能被听到，但不希望朗读合成拖慢对话。

- 验收：AI 文本回复在 chat 请求完成后立即展示。
- 验收：TTS 作为异步任务生成，状态可为 `pending`、`ready`、`failed`、`fallback`。
- 验收：TTS `failed` 时不影响下一轮对话，前端可使用 SpeechSynthesis 兜底或只保留文字。

#### US-05 七牛云会话存档

作为参赛作品，我希望通过七牛云保存关键截图、对话 JSON 和音频，体现端云协同。

- 验收：每轮成功对话至少上传 snapshot 或 turn JSON 中的一项到七牛云。
- 验收：生成音频完成后上传七牛云，并使用 CDN URL 播放。
- 验收：session JSON 可记录完整 demo 的 turn 列表，便于回放和检查。

### P1 / P2 扩展故事

| 故事 | 优先级 | 验收口径 |
| --- | --- | --- |
| 参考音轨生成 | P1 | 用户说“生成一段”或点击按钮后创建任务；15 秒内返回任务状态，不承诺 15 秒内生成完成 |
| 基础动作能量检测 | P1 | 输出 `low` / `medium` / `high` 和 `rhythmic` true/false，不解释具体手势语义 |
| Spotify 歌单参考 | P2 | 仅作为加分项，时间不足不实现，不影响提交 |

## 三、功能需求（PRD）

### 3.1 功能优先级

| 功能模块 | 优先级 | 开发边界 |
| --- | --- | --- |
| 摄像头实时显示 + 自动截图 | P0 | video 预览 + canvas 截图 + 压缩上传 |
| 语音录制 + VAD + ASR | P0 | 端侧 VAD，后端 ASR，不做实时流式识别 |
| 多模态视觉对话 | P0 | 由 `/api/chat` 内部完成视觉理解和回复生成 |
| 结构化对话 UI | P0 | 显示用户文本、AI 回复、视觉依据、失败状态、建议动作 |
| 七牛云上传 | P0 | 上传截图、turn JSON、session JSON；音频生成后上传音频 |
| TTS 异步朗读 | P0- | 尽量实现；失败降级，不阻塞主流程 |
| 参考音轨生成 | P1 | 可用预生成样例兜底 |
| 动作能量检测 | P1 | 仅作为触发追问的本地信号 |
| Spotify 歌单推荐 | P2 | 可砍 |

### 3.2 失败状态定义

| 状态码 | 含义 | 前端处理 |
| --- | --- | --- |
| `no_camera_permission` | 用户拒绝或浏览器无法访问摄像头 | 显示权限引导，允许纯语音模式 |
| `snapshot_failed` | canvas 截图失败 | 提示重新观察，继续语音对话 |
| `snapshot_blurry` | 图像模糊或主体不可辨认 | AI 说明画面不清，建议调整镜头 |
| `too_dark` | 画面过暗 | 提示增加光线，继续语音建议 |
| `no_visual_subject` | 未看到有效人物、物品或展示内容 | AI 基于语音回复并追问用户展示内容 |
| `vision_api_failed` | 多模态模型调用失败 | 保留语音对话，隐藏视觉依据或标为不可用 |
| `asr_failed` | 语音识别失败 | 允许重录，不创建正式 turn |
| `tts_failed` | 朗读合成失败 | 保留文字，尝试浏览器兜底 |
| `music_generation_failed` | 音乐生成失败或超时 | 返回预生成样例或提示稍后重试 |

### 3.3 模块需求

#### 模块 A：摄像头与截图

- `getUserMedia` 获取摄像头流，默认 480p；前端显示权限状态。
- 每轮语音结束后截取当前帧，压缩为 WebP/JPEG，建议宽度不超过 768px。
- 截图上传前可在前端显示缩略图和“已发送给 AI 观察”的状态，避免隐私感知不透明。
- 用户可关闭摄像头；关闭后系统进入纯语音降级模式。

#### 模块 B：语音输入与 ASR

- Web Audio API 进行 VAD，静音约 1.5 秒后停止录音并提交。
- 每次 ASR 只上传本轮录音片段，不做连续麦克风流式传输。
- ASR 返回 `userText` 后才创建正式对话 turn；失败时不上传 session turn。

#### 模块 C：多模态对话

- 前端只调用 `/api/chat`，传入 `sessionId`、`userText`、`snapshotBase64` 或 `snapshotUrl`、`motionSignal` 和 `historySummary`。
- 后端在 `/api/chat` 内部调用多模态 LLM，同时完成视觉观察、意图理解和回复生成。
- 模型必须按 JSON schema 输出；后端做 schema 校验，失败时转为安全兜底回复。

#### 模块 D：TTS 异步朗读

- chat 返回后，前端调用 `/api/tts` 或由后端创建 `ttsJobId`。
- TTS 音频生成成功后上传七牛云并返回 `ttsUrl`；失败时 `status=failed`。
- TTS 不参与 AI 决策，不应阻塞下一轮录音、截图或对话。

#### 模块 E：七牛云存储

- 对象路径建议：`snapshots/{sessionId}/{turnId}.webp`、`turns/{sessionId}/{turnId}.json`、`sessions/{sessionId}.json`、`audio/{sessionId}/{assetId}.mp3`。
- 上传凭证只在服务端生成，前端不暴露七牛 AK/SK。
- 可先实现服务端上传，后续再优化为前端直传。

#### 模块 F：动作能量检测

- 基础版使用帧差即可：2 秒窗口内平均差异低于阈值为 `low`，高于阈值为 `medium` / `high`。
- 如使用 MediaPipe，只读取关键点位移速度，不识别具体手势含义。
- 动作信号只作为 `motionSignal` 传入 `/api/chat`，帮助 AI 追问，不作为核心视觉理解依据。

## 四、数据与接口设计

### 4.1 主接口：POST /api/chat

前端主流程只调用 `/api/chat`。该接口负责接收语音文本、当前截图和上下文，后端内部完成视觉理解与对话回复，避免前端串联 `/api/vision` 和 `/api/chat` 导致状态复杂。

#### 请求数据

```json
{
  "sessionId": "uuid",
  "turnId": "uuid",
  "userText": "I want a lonely 3 AM streetlight feeling",
  "snapshot": {
    "mimeType": "image/webp",
    "base64": "...",
    "width": 768,
    "height": 432
  },
  "motionSignal": {
    "energy": "low",
    "rhythmic": false,
    "approach": "stable"
  },
  "historySummary": "The user previously wanted a dark ambient direction..."
}
```

#### 响应数据

```json
{
  "sessionId": "uuid",
  "turnId": "uuid",
  "replyText": "I can see headphones, a dim room, and what looks like a keyboard on the desk...",
  "visualObservation": {
    "isUsable": true,
    "summary": "The user is wearing headphones in a dim room, with a keyboard on the desk",
    "objects": ["headphones", "keyboard"],
    "sceneMood": "low-light / quiet",
    "motionEnergy": "low",
    "confidence": 0.78,
    "failureReason": null
  },
  "musicSuggestion": {
    "mood": "dark ambient",
    "tempo": "70-85 BPM",
    "instruments": ["pad", "sub bass", "soft noise"],
    "structure": "intro -> texture build -> sparse beat",
    "promptForMusicGen": "dark ambient, slow tempo, wide pads..."
  },
  "followUpQuestion": "Do you want me to generate a slow ambient reference clip?",
  "suggestedActions": ["generate_music"],
  "qiniu": {
    "snapshotUrl": "https://cdn.example.com/snapshots/session/turn.webp",
    "turnJsonUrl": "https://cdn.example.com/turns/session/turn.json"
  },
  "tts": {
    "status": "pending",
    "ttsJobId": "uuid"
  }
}
```

### 4.2 TTS 接口

| 接口 | 用途 | 关键字段 |
| --- | --- | --- |
| `POST /api/tts` | 为 `replyText` 创建朗读任务 | `turnId`、`replyText`、`voice`、`speed` |
| `GET /api/tts/{jobId}` | 轮询朗读状态 | `status`、`ttsUrl`、`errorCode` |

TTS 状态只允许 `pending`、`ready`、`failed`、`fallback`。`ready` 时前端播放 `ttsUrl`；`failed` 时显示降级状态。

### 4.3 音乐生成接口

| 接口 | 用途 | 关键字段 |
| --- | --- | --- |
| `POST /api/generate` | 创建音乐生成任务 | `sessionId`、`turnId`、`promptForMusicGen` |
| `GET /api/generate/{jobId}` | 轮询任务状态 | `queued`、`processing`、`ready`、`failed`、`musicUrl` |

音乐生成不承诺实时完成；验收重点是 15 秒内返回任务状态，并在完成后上传七牛云 CDN 播放。

### 4.4 七牛云 session JSON

```json
{
  "sessionId": "uuid",
  "createdAt": "2026-06-12T16:00:00+08:00",
  "turns": [
    {
      "turnId": "uuid",
      "createdAt": "2026-06-12T16:01:00+08:00",
      "userText": "I want a lonely 3 AM feeling",
      "snapshotUrl": "https://cdn.example.com/snapshots/session/turn.webp",
      "aiReply": "I can see you are wearing headphones...",
      "visualObservation": {},
      "musicSuggestion": {},
      "ttsUrl": "https://cdn.example.com/tts/session/turn.mp3",
      "musicUrl": "https://cdn.example.com/music/session/demo.mp3"
    }
  ]
}
```

## 五、架构设计

### 5.1 端云协同架构

核心原则：端侧负责采集、压缩和低成本信号；云侧负责高价值 AI 推理和文件分发。主对话链路统一进入 `/api/chat`，降低前端状态复杂度。

### 5.2 架构图

```text
浏览器端：摄像头 video -> canvas 截图 -> /api/chat
浏览器端：麦克风 -> VAD -> ASR -> userText -> /api/chat
浏览器端：帧差/MediaPipe -> motionSignal -> /api/chat
云端 /api/chat：多模态 LLM -> 结构化回复 -> 七牛上传 snapshot/turn JSON
云端 /api/tts：replyText -> TTS 音频 -> 七牛 CDN
云端 /api/generate：promptForMusicGen -> 音乐生成 -> 七牛 CDN
前端 UI：文字回复优先展示，TTS 和音乐生成异步更新状态。
```

### 5.3 默认技术选型

| 能力 | 默认方案 | 降级方案 |
| --- | --- | --- |
| 前端/后端 | Next.js 14 App Router | 无 |
| ASR | OpenAI `gpt-4o-mini-transcribe` 或 `whisper-1` 兼容 ASR | 手动输入文本用于演示兜底 |
| 视觉理解 + 对话 | 同一个多模态 LLM 在 `/api/chat` 内完成 | 视觉失败时纯文本 LLM 回复 |
| TTS | 专业 TTS API | SpeechSynthesis 或仅文字 |
| 音乐生成 | Replicate MusicGen 或同类托管模型 | 预生成样例 + 七牛 CDN |
| 存储/CDN | 七牛云 OSS + CDN | 本地临时 URL 仅开发环境使用 |

## 六、页面交互设计

### 6.1 主页面布局

左侧为摄像头画面、视觉状态、动作能量；右侧为对话流，AI 气泡中展示 `replyText`、视觉依据标签、音乐建议卡片和建议动作。底部为麦克风/VAD 状态、TTS 状态和参考音轨播放器。

### 6.2 核心交互流

1. 进入页面，申请摄像头和麦克风权限；失败则进入对应降级状态。
2. 用户说话，VAD 检测到停顿后提交录音片段到 ASR。
3. ASR 返回 `userText` 后，前端截取当前画面并调用 `/api/chat`。
4. `/api/chat` 返回结构化回复；页面立即显示 `replyText`、视觉依据和音乐建议。
5. 前端异步请求 TTS；`ready` 后播放，`failed` 后显示降级。
6. 用户触发参考音轨生成；前端轮询状态，`ready` 后播放七牛 CDN URL。
7. session JSON 持续更新到七牛云，用于 demo 回放和评审检查。

## 七、开发计划（收紧版）

### Day 1：主链路骨架

| 任务 | 内容 | 时长 |
| --- | --- | --- |
| 项目初始化 | Next.js、Tailwind、环境变量、基础 README | 1h |
| 页面布局 | 摄像头区、对话区、状态栏、播放器占位 | 2h |
| 摄像头 + 截图 | `getUserMedia`、权限状态、canvas 压缩截图 | 2h |
| 麦克风 + VAD + ASR | 录音、停顿检测、`/api/asr` | 3h |
| 前端 turn 状态 | `sessionId`、`turnId`、`userText`、snapshot 状态 | 1.5h |

### Day 2：视觉对话与七牛

| 任务 | 内容 | 时长 |
| --- | --- | --- |
| `/api/chat` | 请求 schema、模型调用、结构化 JSON 校验 | 4h |
| 对话 UI | `replyText`、视觉依据、失败状态、音乐建议卡片 | 3h |
| 七牛上传 | snapshot、turn JSON、session JSON | 3h |
| TTS 异步 | `/api/tts`、状态轮询、失败降级 | 3h |
| 端到端联调 | 语音 -> 截图 -> chat -> UI -> TTS | 5h |

### Day 3：亮点与提交

| 任务 | 内容 | 时长 |
| --- | --- | --- |
| 音乐生成 | `/api/generate`、轮询、预生成兜底 | 3h |
| 音频七牛 CDN | 生成音频上传、播放器切换 CDN URL | 2h |
| 动作能量检测 | 帧差基础版；若时间不足跳过 | 1.5h |
| 验收修补 | 失败状态、权限状态、demo 数据 | 3h |
| README 和录制 | 说明端云协同、成本控制、演示视频 | 5h |

### 保底策略

- 必须保住：摄像头截图、ASR、`/api/chat` 多模态回复、视觉依据展示、七牛上传 turn/session JSON。
- 可以降级：TTS 用浏览器朗读或仅文字；MusicGen 用预生成样例；动作检测跳过。
- 不能降级掉：AI 回复中的视觉依据。没有视觉依据就不满足题目一核心。

## 八、成本控制与实际采用策略

| 服务 | 成本风险 | 实际控制策略 |
| --- | --- | --- |
| ASR | 频繁上传音频 | VAD 后才调用，每轮只传一句完整语音 |
| 视觉理解 | 连续视频推理成本高 | 每轮只传一张 768px 内压缩截图，不上传视频流 |
| LLM 对话 | 上下文 token 增长 | 超过 12 轮摘要化，只传 `historySummary` |
| TTS | 长文本和重复生成 | 只对最终 `replyText` 生成，失败降级，不对流式 token 合成 |
| MusicGen | 排队和生成费用 | 用户明确触发才生成，相同 prompt 走缓存，demo 使用预生成样例 |
| 七牛云 | 无效文件堆积 | 只存关键帧、turn JSON、session JSON 和最终音频，不存连续视频 |

## 九、比赛呈现重点

- 开场先证明 AI 看见了：用户说话后，AI 回复引用耳机、键盘、光线、展示物等视觉依据。
- 第二段证明视觉和语音联合理解：用户展示歌词/乐器/草稿，AI 将展示物和语音描述合成音乐建议。
- 第三段证明端云协同：展示截图、turn JSON、生成音频已上传七牛云，并通过 CDN 播放。
- 明确说明技术取舍：不做复杂表情识别和精准手势语义识别，避免评委按错误标准审查。
