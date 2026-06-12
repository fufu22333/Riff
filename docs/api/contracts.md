# API 合约

## POST /api/chat

主对话入口。当前端拿到 ASR 返回的 `userText`，并准备好摄像头截图后，调用该接口。

### 请求

```json
{
  "sessionId": "uuid",
  "turnId": "uuid",
  "userText": "我想要一种凌晨三点孤独路灯的感觉",
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
  "historySummary": "用户之前想要偏黑暗氛围的方向..."
}
```

### 响应

```json
{
  "sessionId": "uuid",
  "turnId": "uuid",
  "replyText": "我能看到耳机、偏暗的房间，以及桌面上像键盘的东西...",
  "visualObservation": {
    "isUsable": true,
    "summary": "用户在偏暗的房间里戴着耳机，桌上有键盘",
    "objects": ["耳机", "键盘"],
    "sceneMood": "低光 / 安静",
    "motionEnergy": "low",
    "confidence": 0.78,
    "failureReason": null
  },
  "musicSuggestion": {
    "mood": "黑暗氛围",
    "tempo": "70-85 BPM",
    "instruments": ["铺底音色", "低频贝斯", "柔和噪声"],
    "structure": "引子 -> 纹理堆叠 -> 稀疏鼓点",
    "promptForMusicGen": "dark ambient, slow tempo, wide pads..."
  },
  "followUpQuestion": "要我生成一段慢速氛围参考音频吗？",
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

## 失败原因

允许的视觉或流程失败原因：

```text
no_camera_permission
snapshot_failed
snapshot_blurry
too_dark
no_visual_subject
vision_api_failed
asr_failed
tts_failed
music_generation_failed
```

如果 `visualObservation.isUsable` 为 `false`，必须设置 `failureReason`，并且 `replyText` 必须清楚说明当前使用了降级回复。

## TTS

### POST /api/tts

```json
{
  "sessionId": "uuid",
  "turnId": "uuid",
  "replyText": "需要朗读的 AI 回复",
  "voice": "default",
  "speed": 1
}
```

### GET /api/tts/{jobId}

```json
{
  "status": "ready",
  "ttsUrl": "https://cdn.example.com/tts/session/turn.mp3",
  "errorCode": null
}
```

允许的状态：

```text
pending
ready
failed
fallback
```

## 音乐生成

### POST /api/generate

```json
{
  "sessionId": "uuid",
  "turnId": "uuid",
  "promptForMusicGen": "dark ambient, slow tempo, wide pads..."
}
```

### GET /api/generate/{jobId}

```json
{
  "status": "ready",
  "musicUrl": "https://cdn.example.com/audio/session/demo.mp3",
  "errorCode": null
}
```

允许的状态：

```text
queued
processing
ready
failed
```

产品只承诺快速返回任务状态，不承诺生成音频一定在 15 秒内完成。

## 七牛云会话 JSON

```json
{
  "sessionId": "uuid",
  "createdAt": "2026-06-12T16:00:00+08:00",
  "turns": [
    {
      "turnId": "uuid",
      "createdAt": "2026-06-12T16:01:00+08:00",
      "userText": "我想要一种凌晨三点的孤独感",
      "snapshotUrl": "https://cdn.example.com/snapshots/session/turn.webp",
      "aiReply": "我能看到你戴着耳机...",
      "visualObservation": {},
      "musicSuggestion": {},
      "ttsUrl": "https://cdn.example.com/tts/session/turn.mp3",
      "musicUrl": "https://cdn.example.com/music/session/demo.mp3"
    }
  ]
}
```
