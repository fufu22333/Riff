# Riff

Riff 是一个面向音乐创作的 AI 视觉对话助手。它会观察创作者的摄像头画面，听取语音表达，并把“视觉现场 + 语音意图”转化为具体的音乐创作方向。

## 当前范围

本仓库目前处于架构设计与项目初始化阶段。

比赛核心链路：

1. 采集麦克风输入，并将语音转换为文本。
2. 每一轮对话采集一张压缩后的摄像头截图。
3. 将 `userText + snapshot + motionSignal` 发送到 `/api/chat`。
4. 返回结构化 AI 输出，其中包含视觉依据和音乐建议。
5. 将关键会话产物存储到七牛云。
6. 异步生成 TTS 和参考音频，并提供可靠降级。

## 仓库结构

```text
docs/
  product/        产品设计文档
  architecture/   系统架构与实现边界
  api/            API 合约与数据结构
  ops/            环境、部署与成本说明
  assets/         架构图、截图与演示素材
```

## 阅读入口

- 产品文档：`docs/product/Riff_product_design_v4.1.md`
- 架构概览：`docs/architecture/overview.md`
- API 合约：`docs/api/contracts.md`
- 实施计划：`docs/ops/implementation-plan.md`
- 环境指南：`docs/ops/environment.md`

## 演示中的硬性要求

每一次成功的 AI 回复都必须包含以下二者之一：

- 来自摄像头截图的具体视觉观察；
- 清晰的视觉失败原因，以及纯文本降级回复。

如果没有这一点，Riff 就会退化成普通语音聊天机器人，也会偏离题目的核心。
