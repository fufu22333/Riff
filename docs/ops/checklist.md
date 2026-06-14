# P0 验收清单

提交 PR、录制 demo 或交接前，按这份清单检查。

## 自动化检查

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test -- --run`
- [ ] `npm run test:smoke`
- [ ] `npm run test:p0`

## Happy Path

- [ ] 应用可以用 `AI_PROVIDER=fake`、`ASR_PROVIDER=fake`、`STORAGE_PROVIDER=fake`、`TTS_PROVIDER=browser` 启动。
- [ ] 首页可以在 `http://localhost:3000` 打开。
- [ ] 无真实 API Key 时，`Test ASR` 可以创建一轮对话。
- [ ] turn 展示 `userText`。
- [ ] turn 展示 `replyText`。
- [ ] turn 展示 `visualObservation.summary` 或 `visualObservation.failureReason`。
- [ ] turn 展示音乐建议，至少覆盖 mood、tempo、instruments 或 structure。
- [ ] fake storage 模式下展示云端证据 URL。
- [ ] TTS 状态展示为 `fallback`、`pending`、`ready` 或 `failed`。
- [ ] 可以继续创建第二轮 turn，第一轮状态不丢失。

## 失败路径

- [ ] 无摄像头权限时展示 `no_camera_permission`，并保持 voice-only 模式可用。
- [ ] 截图失败时展示 `snapshot_failed`，并保持文本对话可用。
- [ ] ASR provider 失败时展示 `asr_failed`，提供重新录制入口，且不创建正式 turn。
- [ ] Chat provider 失败时返回安全的 `vision_api_failed` 结构化回复。
- [ ] 视觉不可用时不编造场景，并包含明确 `failureReason`。
- [ ] Storage 失败时 AI 回复仍可见，并展示云端证据不可用。
- [ ] TTS 失败时展示 `tts_failed`，文本仍可见，下一轮不被阻塞。

## 真实 Provider Smoke

- [ ] 真实 AI key 只存在于 `.env` 或部署密钥中。
- [ ] 真实 ASR key 只存在于 `.env` 或部署密钥中。
- [ ] 七牛 AK/SK 只在服务端使用。
- [ ] `STORAGE_PROVIDER=qiniu` 至少写入一个 snapshot 或 turn JSON。
- [ ] 返回的 CDN URL 可以在应用外打开。
- [ ] 没有真实 API Key、音频产物或生成媒体文件进入 git 暂存区。

## Demo 证据

- [ ] demo 能证明 Riff 使用了用户语音文本。
- [ ] demo 能证明 Riff 使用了视觉截图，或明确说明视觉输入不可用原因。
- [ ] demo 能证明关键产物已通过 fake storage 或真实七牛保存。
- [ ] demo 能展示降级路径不会中断主对话链路。
