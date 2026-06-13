# PR5 存储与云端证据交接说明

## 范围

PR5 在 `/api/chat` 产出 schema-valid response 后，补齐服务端 turn 持久化和前端云端证据展示。它基于 PR4 已建立的 turn 边界：

```text
ASR userText -> 当前 turn snapshot 或 null -> /api/chat -> 校验后的结构化回复 -> storage -> UI 展示云端证据
```

## 当前 PR5 行为

- storage 层接收同一个提交给 `/api/chat` 的 `snapshot`，不会重新截图。
- 完成的 turn 会写入：
  - `snapshots/{sessionId}/{turnId}.webp`
  - `turns/{sessionId}/{turnId}.json`
  - `sessions/{sessionId}.json`
- turn JSON 包含原始 chat request、校验后的 chat response 和返回浏览器的 storage URLs。
- session JSON 保存轻量 turn 列表，包括用户文本、AI 回复、snapshot URL、turn JSON URL 和创建时间。
- 请求没有 snapshot 时，`snapshotUrl` 为 `null`，但仍写入 turn JSON。
- storage 失败不阻塞 AI 回复：`/api/chat` 仍返回 AI response，并附带 `qiniu: { snapshotUrl: null, turnJsonUrl: null }`。
- fake storage 仍用于本地开发和 CI，返回稳定的 fake CDN URL。
- UI 在每轮回复中展示 `Cloud evidence`，列出 snapshot URL 和 turn JSON URL；如果 storage 不可用，则显示 storage unavailable 状态。
- session JSON 合并有同进程内存缓存兜底，避免真实七牛 CDN 回读延迟或 miss 时丢掉前序 turn。演示时仍优先使用每轮 `turnJsonUrl` 作为可靠云端证据。

## Provider 说明

- `STORAGE_PROVIDER=fake` 使用进程内 fake provider，并使用 `QINIU_PUBLIC_DOMAIN` 生成确定性 URL。
- `STORAGE_PROVIDER=qiniu` 使用服务端七牛密钥。
- `QINIU_ACCESS_KEY` 和 `QINIU_SECRET_KEY` 不能进入 client component 或浏览器 bundle。
- `QINIU_UPLOAD_URL` 可覆盖内置 region upload host mapping。

## 与原始文档对照

已满足：

- 每轮成功对话至少保存 turn JSON；有 snapshot 时额外保存 snapshot。
- 存储路径符合原计划。
- `ChatResponse.qiniu` 返回 snapshot URL 和 turn JSON URL。
- 页面展示至少一个云端证据 URL，满足“端云协同证据”展示要求。
- 七牛密钥只在服务端使用。
- storage 失败不会阻塞 AI 回复。

当前边界：

- 音频上传不属于 PR5 当前实现，因为 TTS 和音乐生成还未进入 P0 主链路。
- `sessions/{sessionId}.json` 适合作为 demo 回放辅助；真实评审证据优先看每轮 `turnJsonUrl`。
- fake provider 可验证链路和 UI，但不能证明真实七牛上传成功；真实演示前仍需用 `STORAGE_PROVIDER=qiniu` 手动 smoke。

## 回归测试

修改 PR5 行为时必须保留这些测试：

- `tests/unit/storage.test.ts`
  - 持久化提交的 snapshot，并合并 turn metadata 到 session JSON
  - 无 snapshot 时跳过 snapshot 上传
  - storage 上传失败时返回 null URLs
  - storage readback miss 时仍保留同进程内前序 session turns
- `tests/api/chat.test.ts`
  - fake storage 成功时返回 storage URLs
  - storage 失败时 AI reply 不被阻塞
- `tests/unit/home-chat-flow.test.tsx`
  - 页面展示 `Cloud evidence` 和返回的 qiniu URLs

