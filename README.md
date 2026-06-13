# Riff

Riff 是一个面向音乐创作的 AI 视觉对话助手。它会观察创作者的摄像头画面，听取语音表达，并把“视觉现场 + 语音意图”转化为具体的音乐创作方向。

## 当前范围

本仓库采用 Next.js App Router、TypeScript 和 Tailwind 构建。当前开发重点是围绕 P0 主链路持续切片交付：摄像头预览与截图、语音录制与 ASR、结构化 `/api/chat` 响应，以及后续的视觉依据展示和端云产物存档。

比赛核心链路：

1. 采集麦克风输入，并将语音转换为文本。
2. 每一轮对话采集一张压缩后的摄像头截图。
3. 将 `userText + snapshot + motionSignal` 发送到 `/api/chat`。
4. 返回结构化 AI 输出，其中包含视觉依据和音乐建议。
5. 将关键会话产物存储到七牛云。
6. 异步生成 TTS 和参考音频，并提供可靠降级。

## 仓库结构

```text
app/             Next.js App Router 页面骨架
components/      摄像头、录音和对话相关 UI 组件
lib/client/      浏览器端媒体采集与处理逻辑
lib/contracts/   前后端共享 API 合约与失败状态
lib/server/      服务端环境变量、ASR 和 AI provider 封装
tests/           单元测试与浏览器 smoke test
```

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 查看当前应用。

常用验收命令：

```bash
npm run lint
npm run typecheck
npm test
npm run test:smoke
```

本机 Playwright smoke 使用已安装的 Microsoft Edge channel，避免首次运行时下载浏览器阻塞开发。

## 主要依赖与原创功能边界

主要第三方依赖：

- Next.js / React：应用框架与页面渲染。
- Tailwind CSS：样式系统。
- Zod：环境变量和 API 合约校验。
- Vitest：单元测试。
- Playwright：浏览器 smoke test。
- lucide-react：界面图标。

当前原创功能部分包括 Riff 的产品结构、页面信息架构、摄像头和语音输入流程、环境变量校验规则、失败状态枚举、`/api/chat` 数据合约、AI provider 边界和对应测试。

## 演示中的硬性要求

每一次成功的 AI 回复都必须包含以下二者之一：

- 来自摄像头截图的具体视觉观察；
- 清晰的视觉失败原因，以及纯文本降级回复。

如果没有这一点，Riff 就会退化成普通语音聊天机器人，也会偏离题目的核心。
