# PR4 对话主链路交接说明

## 这份说明的目的

PR4 的目标是把 PR1 到 PR3 的摄像头、ASR 和 `/api/chat` 能力串成同一轮可演示对话。之前最容易出错的点不是“有没有把 snapshot 发给 `/api/chat`”，而是“是不是在 ASR 完成后，为当前 turn 重新截取当前画面”。

文档要求的 P0 顺序是：

```text
语音输入 -> ASR userText -> 当前摄像头截图 -> POST /api/chat -> 结构化对话 UI
```

如果用户连续说两轮，第二轮不能复用旧的手动截图。每轮都必须要么截取一张新的当前帧，要么发送 `snapshot: null`，并让视觉失败原因解释为什么没有视觉依据。

## 当前 PR4 行为

- `Home` 维护对话 turn 列表。
- 每条 ASR transcript 会创建一个 turn，包含：
  - `sessionId`
  - `turnId`
  - `userText`
  - 当前 turn 截到的 snapshot，或 `null`
  - 提交状态
  - 结构化 chat response
  - chat 失败时的 fallback reason
- `CameraPreview` 通过 ref 暴露 `captureSnapshot()`。
- `Home.submitChat()` 在调用 `/api/chat` 之前立即执行 `captureSnapshot()`。
- 摄像头不可用时，`captureSnapshot()` 返回 `null`，页面继续走纯语音 fallback，而不是编造视觉观察。
- 下一轮 chat 请求会带上最近几轮完成 turn 生成的轻量 `historySummary`。
- UI 展示用户文本、AI 回复、视觉依据和音乐建议。

## 与原始文档对照

已满足：

- 每轮 ASR 后生成当前截图或明确视觉不可用。
- `/api/chat` 收到 `sessionId`、`turnId`、`userText`、`snapshot`、`motionSignal`、`historySummary`。
- AI 回复展示 `replyText`、`visualObservation`、`musicSuggestion`、`followUpQuestion`、`suggestedActions`。
- 视觉不可用时展示 `failureReason`，不编造观察。
- 连续 turn 保留在页面中，并把历史摘要传给下一轮。

未包含在 PR4：

- 七牛云存储证据。该部分属于 PR5。
- TTS、音乐生成和动作能量检测。它们属于后续范围。

## 回归测试

修改 PR4 主链路时必须保留这些测试：

- `tests/unit/home-chat-flow.test.tsx`
  - ASR 文本提交到 `/api/chat`
  - chat 提交前截取当前摄像头 snapshot
  - 连续 turn 可见，并向下一轮发送 history summary
- `tests/unit/visual-evidence.test.tsx`
  - 可用视觉依据
  - 不可用视觉 fallback reason
  - 低置信度视觉观察
- `tests/unit/music-suggestion-card.test.tsx`
  - 展示已填充的音乐建议字段
  - 可选字段缺失时不隐藏已有字段

## 给 PR5 的边界

PR5 应基于 PR4 的 turn 边界做存储。

应做：

- 持久化同一个 turn 提交给 `/api/chat` 的 snapshot。
- 持久化校验后的 chat response 为 turn JSON。
- 将完成的 turn 合并进 session JSON。
- 保留 fake storage，支持本地和 CI。
- 七牛上传失败不能阻塞 AI reply。

不应做：

- 在 storage 层重新截图。
- 依赖旧的全局 `latestSnapshot`。
- 把七牛 AK/SK 暴露给浏览器。
- 让 storage 成功成为渲染 `replyText` 的前置条件。

