# Riff 工程交付执行计划

## 结论：按“可演示 PR 垂直切片”推进

Riff 不适合按纯功能模块拆分成“摄像头 PR、ASR PR、七牛 PR、UI PR”长期并行推进，也不适合一次性把 P0 全部做完再验收。

推荐采用“P0/P1/P2 定优先级 + PR 垂直切片交付”的方式：

- P0 是硬门槛，必须优先完成：摄像头截图、语音转文本、`/api/chat` 多模态结构化回复、视觉依据展示、七牛云关键产物存档。
- 每个 PR 都围绕一条可运行、可测试、可演示的用户路径推进，而不是只交付孤立模块。
- 每个 PR 合并前都必须通过自动化测试、手动验收和降级场景检查。
- P1/P2 只在 P0 主链路稳定后进入，任何时候都不能牺牲“AI 回复必须有视觉依据或视觉失败原因”这一核心要求。

这样做的原因是：Riff 的比赛价值不是某个独立模块，而是“视觉现场 + 语音意图 + 音乐建议 + 端云存档”在同一轮对话中闭环。如果先孤立做模块，最后集成风险会集中爆发；如果一次性做完 P0，测试和降级会被压到最后，容易得到一个演示不稳定的系统。

## 工程原则

### 1. 主链路优先

所有工程决策优先服务这条链路：

```text
摄像头预览 -> 语音录制/VAD -> ASR -> 当前帧截图 -> POST /api/chat
-> 结构化 AI 回复 -> UI 展示视觉依据和音乐建议 -> 七牛云保存关键产物
```

TTS、音乐生成、动作能量和 Spotify 都不能反过来阻塞主链路。

### 2. 一个主对话接口

前端核心流程只调用 `POST /api/chat`，不要拆成 `/api/vision` + `/api/chat` 串联调用。视觉理解、文本意图理解、结构化回复生成由后端在 `/api/chat` 内部完成。

### 3. 明确降级，不假装成功

视觉失败时必须返回并展示 `failureReason`，不能编造视觉观察。可接受的降级包括：

- 摄像头无权限：继续纯语音，但标记 `no_camera_permission`。
- 截图失败：继续文本回复，但标记 `snapshot_failed`。
- 视觉模型失败：使用文本模型降级，但标记 `vision_api_failed`。
- TTS 失败：保留文本，并使用浏览器 `SpeechSynthesis` 或仅文本。
- 音乐生成失败：返回预生成样例或重试入口。

### 4. 测试前移

每个 PR 至少包含对应层级的测试：

- 纯函数、schema、状态机：单元测试。
- API route：请求/响应契约测试。
- 关键用户流：浏览器端手动验收，必要时补 Playwright 流程测试。
- 外部供应商：默认使用 mock 或 fake adapter，真实 API 只用于本地 smoke test。

### 5. 供应商隔离

OpenAI、七牛云、TTS、MusicGen 都必须通过内部 adapter 调用。业务逻辑不直接散落 SDK 调用，避免后续替换供应商或做 mock 时牵一发动全身。

## 推荐代码架构

项目初始化后建议采用以下结构。具体可按 Next.js App Router 调整，但边界不要打散。

```text
app/
  page.tsx
  api/
    asr/route.ts
    chat/route.ts
    tts/route.ts
    generate/route.ts

components/
  camera/
    CameraPreview.tsx
    SnapshotPreview.tsx
  recorder/
    VoiceRecorder.tsx
    VadMeter.tsx
  chat/
    ConversationPanel.tsx
    MessageBubble.tsx
    VisualEvidence.tsx
    MusicSuggestionCard.tsx
  status/
    FailureBanner.tsx
    ProviderStatus.tsx

lib/
  contracts/
    chat.ts
    media.ts
    failures.ts
  client/
    camera.ts
    recorder.ts
    motion.ts
  server/
    env.ts
    ai/
      provider.ts
      openai.ts
      prompts.ts
    asr/
      provider.ts
      openai.ts
    storage/
      qiniu.ts
      localFakeStorage.ts
    tts/
      provider.ts
      browserFallbackContract.ts
    music/
      provider.ts
      fakeMusic.ts
  session/
    ids.ts
    history.ts
    sessionJson.ts

tests/
  unit/
  api/
  e2e/
```

### 核心边界说明

- `lib/contracts/*`：定义请求、响应、失败状态和 schema，是前后端共同依赖的稳定边界。
- `lib/client/*`：只处理浏览器能力，例如摄像头、录音、截图、帧差。
- `lib/server/*`：只在服务端运行，封装环境变量、AI、ASR、七牛云、TTS、音乐生成。
- `lib/session/*`：生成 `sessionId`、`turnId`、历史摘要和七牛云 session JSON。
- `components/*`：只展示状态和触发动作，不直接调用外部供应商。

## PR 交付路线

### PR 0：项目骨架与工程护栏

目标：建立可持续开发的 Next.js 工程，先把测试、类型、格式化、环境变量和基础 UI 壳子搭好。

范围：

- 初始化 Next.js App Router、TypeScript、Tailwind。
- 建立 `app/page.tsx` 的三栏或左右分区主界面骨架：摄像头区、对话区、底部状态区。
- 建立 `.env.example` 对应的服务端环境变量校验。
- 建立 `lib/contracts/failures.ts` 和 `lib/contracts/chat.ts`。
- 配置 lint、typecheck、单元测试框架和最小 Playwright 或浏览器 smoke test。

验收：

- `npm run lint` 通过。
- `npm run typecheck` 通过。
- `npm test` 至少覆盖 contracts 和 env 校验。
- 首页能在 `localhost` 打开，并展示摄像头区、对话区和状态区占位。

不做：

- 不接真实摄像头。
- 不接真实 AI。
- 不接七牛云。

建议提交信息：

```text
chore: scaffold riff app foundation
```

### PR 1：摄像头预览、截图与视觉失败状态

目标：完成视觉输入最小闭环，让系统能“看见或明确说明为什么看不见”。

范围：

- 实现 `CameraPreview`，请求摄像头权限并展示实时画面。
- 实现 canvas 截图，输出 `{ mimeType, base64, width, height }`。
- 默认压缩到 768px 宽以内。
- 用户拒绝权限时进入 `no_camera_permission`。
- 截图失败时进入 `snapshot_failed`。
- UI 展示截图缩略图和“已发送给 AI 观察”的状态。

测试：

- 单元测试截图尺寸计算和 MIME 类型选择。
- 组件测试摄像头权限失败时的 UI 状态。
- 手动测试 Chrome/Edge 下允许权限、拒绝权限、关闭摄像头三种路径。

验收：

- 摄像头预览可见。
- 点击或模拟一轮对话结束时能得到压缩截图。
- 无摄像头权限时页面不崩溃，并进入纯语音降级提示。

建议提交信息：

```text
feat: add camera preview and snapshot capture
```

### PR 2：语音录制、VAD 与 ASR 接口

目标：完成语音输入链路，让用户可以说出创作意图，并得到 `userText`。

范围：

- 实现浏览器录音。
- 实现基础 VAD：检测到约 1.5 秒静音后停止本轮录音。
- 新增 `POST /api/asr`，接收本轮音频片段并返回 `userText`。
- 后端通过 ASR adapter 调用 OpenAI ASR，保留 `whisper-1` 兼容降级。
- ASR 失败时返回 `asr_failed`，前端允许重新录制，不创建正式 turn。
- 开发环境支持 fake ASR，便于无 API Key 时跑通 UI。

测试：

- 单元测试 VAD 状态机：开始说话、静音倒计时、提交录音。
- API 测试 `/api/asr` 成功与失败响应。
- mock ASR provider，避免 CI 依赖真实 OpenAI。

验收：

- 用户说话后，停顿约 1.5 秒自动提交。
- ASR 成功后对话流出现 `userText`。
- ASR 失败时显示重录入口，不污染 session。

建议提交信息：

```text
feat: add voice recording and asr flow
```

### PR 3：`/api/chat` 合约、AI adapter 与结构化回复

目标：完成 Riff 的核心智能接口，让截图和语音文本合并进入一次多模态对话。

范围：

- 完成 `POST /api/chat` 请求/响应 schema。
- 实现 OpenAI 多模态 adapter。
- 编写系统提示词，强制模型输出结构化 JSON。
- 后端校验模型输出，失败时返回安全降级结构。
- 响应必须包含 `replyText`、`visualObservation`、`musicSuggestion`、`followUpQuestion`、`suggestedActions`。
- 如果 `visualObservation.isUsable=false`，必须包含 `failureReason`。
- 开发环境支持 fake chat provider，返回可预测视觉观察和音乐建议。

测试：

- 单元测试 chat schema：合法响应、缺失 `failureReason`、非法 status。
- API 测试 `/api/chat` 正常视觉可用、视觉失败、provider 抛错三条路径。
- prompt smoke test：用 fake image/text 验证返回字段齐全。

验收：

- 前端能把 `userText + snapshot + sessionId + turnId` 发到 `/api/chat`。
- 返回结构化 AI 回复。
- 视觉失败时不编造观察，而是展示明确失败原因。

建议提交信息：

```text
feat: add multimodal chat contract and provider
```

### PR 4：结构化对话 UI 与端到端 P0 主链路

目标：把 PR 1-3 串成真实可演示对话流。

范围：

- 实现 turn 状态管理：`sessionId`、`turnId`、`userText`、`snapshot`、`replyText`、视觉观察、音乐建议。
- 对话 UI 展示：
  - 用户语音转写文本；
  - AI 回复；
  - 视觉依据标签；
  - 失败状态；
  - 音乐建议卡片；
  - 建议动作按钮。
- 保证文字回复优先展示，后续异步能力不阻塞下一轮。
- 加入 `historySummary` 占位策略：P0 可只传最近几轮摘要或空字符串。

测试：

- 组件测试 `VisualEvidence`：可用视觉、不可用视觉、低置信度。
- 组件测试 `MusicSuggestionCard`：至少展示 mood、tempo、instruments 中可用字段。
- 浏览器手动验收完整链路：语音 -> ASR -> 截图 -> chat -> UI。

验收：

- AI 回复至少包含一条视觉观察或视觉失败原因。
- AI 回复能同时引用视觉线索和语音意图。
- 连续两轮对话不会丢失 turn 状态。

建议提交信息：

```text
feat: wire p0 conversation loop
```

### PR 5：七牛云存储与 session JSON

目标：补齐比赛要求中的端云协同证据。

范围：

- 实现七牛云 server-side upload adapter。
- 上传路径：
  - `snapshots/{sessionId}/{turnId}.webp`
  - `turns/{sessionId}/{turnId}.json`
  - `sessions/{sessionId}.json`
  - `audio/{sessionId}/{assetId}.mp3`
- `/api/chat` 成功后至少上传 snapshot 或 turn JSON。
- 更新 session JSON，记录完整 demo turn 列表。
- 开发环境使用 local fake storage，返回稳定的 fake CDN URL。
- UI 展示或内部记录至少一个七牛云 CDN URL。

测试：

- 单元测试对象路径生成。
- 单元测试 session JSON 合并多轮 turn。
- API 测试七牛上传失败时不阻塞 AI 回复，但返回存储失败状态。
- fake storage 覆盖 CI。

验收：

- 每轮成功对话至少保存 snapshot 或 turn JSON。
- session JSON 能表达完整 demo 对话。
- 七牛云密钥不进入前端 bundle。

建议提交信息：

```text
feat: persist conversation artifacts to qiniu
```

### PR 6：TTS 异步朗读与浏览器兜底

目标：让 AI 回复可以被听到，但不拖慢主对话。

范围：

- 实现 `/api/tts` 和 `GET /api/tts/{jobId}` 的任务状态接口。
- P0 默认使用浏览器 `SpeechSynthesis` 作为 fallback。
- 如果配置了供应商 TTS，则异步生成音频并上传七牛云。
- UI 展示 `pending`、`ready`、`failed`、`fallback`。
- TTS 失败时不影响下一轮录音、截图和 `/api/chat`。

测试：

- API 测试 TTS job 状态转换。
- 组件测试失败状态和 fallback 状态。
- 手动测试浏览器朗读可用性。

验收：

- chat 文本回复先显示。
- TTS 后续异步更新。
- TTS 失败不会中断下一轮对话。

建议提交信息：

```text
feat: add async tts with browser fallback
```

### PR 7：P0 验收硬化、演示脚本与失败路径补齐

目标：把 P0 从“能跑”打磨到“比赛演示稳定”。

范围：

- 补齐所有失败状态 UI。
- 补齐无 API Key、无摄像头、ASR 失败、视觉失败、七牛失败、TTS 失败路径。
- 准备 demo 模式：fake ASR、fake chat、fake storage 可稳定演示。
- README 补充启动方式、环境变量、成本控制和演示路径。
- 更新 `docs/ops/checklist.md` 的验收项。

测试：

- 跑完整 lint、typecheck、unit、API test。
- Playwright 或手动完成 P0 happy path。
- 手动完成至少 5 个降级场景。

验收：

- P0 检查清单全部通过。
- 演示时可以证明 AI 看见了现场。
- 演示时可以证明七牛云保存了关键产物。
- 没有真实 API Key 被提交。

建议提交信息：

```text
test: harden p0 demo acceptance
```

## P1 交付路线

P1 只在 P0 验收稳定后开始。推荐继续按 PR 推进。

### PR 8：参考音轨生成

范围：

- 实现 `POST /api/generate` 和 `GET /api/generate/{jobId}`。
- 用户点击建议动作或说“生成一段”后创建任务。
- 15 秒内返回任务状态，不承诺生成完成。
- 生成成功后上传七牛云 CDN。
- provider 不可用时返回预生成样例。

验收：

- 音乐生成失败不影响主对话。
- 播放器可以播放生成音频或预生成样例。

### PR 9：基础动作能量检测

范围：

- 使用帧差实现 `low` / `medium` / `high`。
- 输出 `rhythmic` true/false。
- 只把结果作为 `motionSignal` 传给 `/api/chat`。
- 不解释具体手势语义。

验收：

- 动作信号能影响 AI 追问或音乐建议语气。
- 不出现“识别出某个复杂手势”的高风险表述。

## P2 交付路线

P2 是加分项，不进入核心排期。

### PR 10：Spotify 歌单参考

范围：

- 根据 `musicSuggestion` 推荐歌单或参考曲。
- 只作为可选动作展示。
- Provider 不可用时隐藏该能力。

验收：

- 不影响 P0/P1 主流程。
- 不因 Spotify 授权失败阻塞对话。

## 测试策略

### 单元测试

优先覆盖：

- failure code 枚举；
- chat 请求/响应 schema；
- session JSON 生成；
- 七牛云对象路径；
- VAD 状态机；
- TTS/music job 状态机；
- history summary 截断策略。

### API 测试

每个 route 至少覆盖：

- 成功响应；
- 缺少必要字段；
- provider 抛错；
- 降级响应；
- 不泄漏服务端密钥。

### 组件测试

优先覆盖：

- 摄像头权限状态；
- 对话消息渲染；
- 视觉依据展示；
- 音乐建议卡片；
- 失败提示；
- TTS 和音乐生成状态。

### 端到端验收

至少保留两种 E2E 模式：

- fake provider 模式：CI 和本地稳定跑，不依赖真实 API。
- real provider smoke test：只在本地或手动演示前运行，验证 OpenAI、七牛云等真实链路。

P0 端到端脚本：

```text
打开首页
允许摄像头和麦克风
说出一句创作意图
等待 ASR 返回 userText
确认截图生成
确认 /api/chat 返回结构化回复
确认 UI 展示视觉依据或失败原因
确认 turn JSON 或 snapshot 上传七牛云
确认下一轮对话仍可继续
```

## 合并门槛

每个 PR 合并前必须满足：

- lint 通过；
- typecheck 通过；
- 相关单元测试通过；
- 相关 API 测试通过；
- 手动验收记录写进 PR 描述；
- 没有真实 API Key、音频大文件或无关生成产物进入 git；
- 没有破坏 `POST /api/chat` 的核心合约。

P0 完成前额外要求：

- 摄像头失败、截图失败、ASR 失败、视觉模型失败、TTS 失败都能降级。
- AI 回复不能在视觉不可用时编造观察。
- 至少一个七牛云 URL 能在演示中展示或播放。

## 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 浏览器权限不稳定 | 演示无法采集摄像头或麦克风 | 准备 fake/demo 模式和纯语音降级 |
| ASR 延迟或失败 | 用户语音无法进入对话 | 支持重录和手动输入演示兜底 |
| 多模态模型输出不符合 schema | UI 和后续流程崩溃 | 后端 schema 校验，失败转安全降级结构 |
| 模型编造视觉内容 | 偏离题目核心且容易被质疑 | prompt 明确禁止编造，低置信度必须追问 |
| 七牛云上传失败 | 端云协同证据不足 | fake storage 不影响开发，真实上传失败不阻塞回复但必须提示 |
| TTS 或音乐生成拖慢主链路 | 对话体验变差 | 全部异步化，失败不影响下一轮 |
| P1/P2 抢占 P0 时间 | 核心演示不稳 | P0 checklist 未过前禁止开发 Spotify，MusicGen 可用预生成样例 |

## 排期建议

如果以 3 天比赛冲刺为单位：

- Day 1：完成 PR 0、PR 1、PR 2。
- Day 2：完成 PR 3、PR 4、PR 5。
- Day 3 上午：完成 PR 6、PR 7。
- Day 3 下午：只在 P0 稳定后做 PR 8 或 PR 9；否则全部时间用于演示修补和录制。

如果以更稳妥的工程节奏推进：

- 第 1 阶段：PR 0-2，完成输入能力。
- 第 2 阶段：PR 3-5，完成核心智能和端云闭环。
- 第 3 阶段：PR 6-7，完成 P0 可演示质量。
- 第 4 阶段：PR 8-10，选择性做 P1/P2 加分项。

## 最终交付定义

P0 可交付不是“功能都写了”，而是满足以下条件：

- 用户可以通过语音表达音乐创作意图。
- 系统每轮对话能采集或明确无法采集摄像头截图。
- `/api/chat` 返回结构化回复。
- AI 回复展示视觉依据，或展示明确视觉失败原因。
- 音乐建议能落到情绪、节奏、音色或结构。
- 七牛云保存至少一种关键产物，并可用于演示端云协同。
- 失败状态不会中断下一轮对话。

只有以上全部成立，才进入 P1/P2。
