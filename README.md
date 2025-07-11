# 语音识别对比演示 (H5 Voice Recognition Demo)

这是一个基于 Next.js 的 H5 语音识别演示应用，展示了两种不同语音识别引擎的对比效果。

## 🎯 功能特点

- **双引擎对比**: 同时支持 Sherpa-ONNX 和讯飞语音识别
- **动态模型加载**: Sherpa-ONNX 支持运行时动态下载模型
- **长按录音**: 支持桌面端和移动端的长按录音功能
- **实时识别**: 音频录制完成后立即进行语音识别
- **历史记录**: 显示识别历史结果，支持清空操作
- **响应式设计**: 适配桌面端和移动端设备
- **美观界面**: 现代化的UI设计，上下两块对比展示
- **Vercel 部署**: 优化支持 Vercel 无服务器部署

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📱 使用说明

### 基本操作

1. **录音**: 长按录音按钮开始录音，松开停止
2. **识别**: 录音结束后自动调用相应的语音识别服务
3. **查看结果**: 识别结果会显示在历史记录区域
4. **清空记录**: 点击"清空"按钮可以清除历史记录

### 权限要求

- **麦克风权限**: 应用需要访问麦克风进行录音
- **HTTPS**: 在生产环境中需要HTTPS才能正常使用麦克风

## 🔧 技术实现

### 上半部分 - Sherpa-ONNX 语音识别

- **动态模型下载**: 首次使用时自动下载模型文件
- **多种模型支持**: Moonshine、Whisper、Paraformer等
- **智能回退**: 模型加载失败时自动使用模拟模式
- **缓存优化**: 模型文件本地缓存，避免重复下载

#### 可用模型

| 模型名称 | 大小 | 语言 | 适用场景 |
|---------|------|------|----------|
| moonshine-tiny-en | 40MB | 英文 | Web应用，移动端 |
| whisper-tiny-en | 70MB | 英文 | 通用应用 |
| paraformer-zh | 120MB | 中文 | 中文识别 |

### 下半部分 - 讯飞语音识别

- 使用讯飞语音WebSocket实时识别API
- 自动转换音频格式为PCM 16kHz
- 实现了完整的认证和数据传输流程
- 支持中文普通话识别

## 🛠 技术栈

- **前端框架**: Next.js 15.3.5 + React 19
- **样式**: Tailwind CSS 4
- **音频处理**: Web Audio API + MediaRecorder API
- **语音识别**: 
  - Sherpa-ONNX (本地模型 + 动态下载)
  - 讯飞语音WebSocket API
- **加密**: crypto-js (HMAC-SHA256签名)
- **语言**: TypeScript

## 📂 项目结构

```
src/
├── app/
│   ├── components/
│   │   └── VoiceRecognizer.tsx     # 语音识别组件
│   ├── services/
│   │   └── speechRecognition.ts    # 语音识别服务
│   ├── sherpa/
│   │   ├── index.ts                # Sherpa-ONNX 核心实现
│   │   └── types.d.ts              # TypeScript 类型定义
│   ├── api/
│   │   └── sherpa-ncnn/
│   │       └── route.ts            # Sherpa-ONNX API端点
│   ├── page.tsx                    # 主页面
│   └── layout.tsx                  # 页面布局
docs/
├── model-comparison.md             # 模型详细对比
├── vercel-deployment.md            # Vercel部署指南
└── sherpa-ncnn-integration.md      # 传统集成方案
```

## 🔑 配置说明

### 环境变量

#### Sherpa-ONNX 模型配置
```bash
SHERPA_MODEL=moonshine-tiny-en
```

可选值：
- `moonshine-tiny-en` - 最小英文模型（推荐Web应用）
- `whisper-tiny-en` - Whisper英文模型
- `paraformer-zh` - 中文模型

#### 讯飞语音识别配置
```bash
NEXT_PUBLIC_XUNFEI_APP_ID=your_app_id_here
NEXT_PUBLIC_XUNFEI_API_KEY=your_api_key_here
NEXT_PUBLIC_XUNFEI_API_SECRET=your_api_secret_here
```

## 🌟 特色功能

### 动态模型管理

- **按需下载**: 只有在首次使用时才下载模型
- **缓存机制**: 模型文件缓存在本地，避免重复下载
- **版本管理**: 支持多个模型并存，动态切换
- **故障恢复**: 下载失败时自动重试或回退到模拟模式

### 音频处理

- 自动重采样到16kHz单声道
- WebM到PCM格式转换
- 支持实时音频流处理

### 用户体验

- 视觉反馈（录音状态、处理状态）
- 智能错误处理和用户提示
- 历史记录管理
- 响应式设计

### 对比展示

- 同样的界面设计
- 相同的操作流程
- 方便对比两种引擎的识别效果

## 🚀 部署

### Vercel 部署

1. **推荐配置**
   ```bash
   SHERPA_MODEL=moonshine-tiny-en  # 适合Vercel的轻量模型
   ```

2. **性能优化**
   - 使用最小模型确保在时间限制内完成
   - 全局缓存避免重复初始化
   - 智能回退确保服务可用性

3. **详细指南**: 参见 [Vercel部署指南](docs/vercel-deployment.md)

### 传统部署

对于需要更大模型或本地部署的场景，可参考 [传统集成方案](docs/sherpa-ncnn-integration.md)。

## 📚 文档

- [模型类型详解](docs/model-comparison.md) - 详细对比各种语音识别模型
- [Vercel部署指南](docs/vercel-deployment.md) - Vercel部署完整指南
- [传统集成方案](docs/sherpa-ncnn-integration.md) - Python/Docker部署方案

## 🔧 开发说明

### 添加新的语音识别引擎

1. 在 `speechRecognition.ts` 中实现 `SpeechRecognitionService` 接口
2. 在主页面中添加新的 `VoiceRecognizer` 组件
3. 如需要，创建对应的API端点

### 添加新的 Sherpa-ONNX 模型

1. 在 `src/app/sherpa/index.ts` 的 `AVAILABLE_MODELS` 中添加模型配置
2. 配置模型文件的下载URL
3. 根据模型类型添加相应的配置逻辑

### 自定义样式

项目使用 Tailwind CSS，可以直接修改组件中的 className 来调整样式。

## ⚡ 性能优化

### 模型选择建议

- **Web应用**: Moonshine-tiny (40MB)
- **桌面应用**: Whisper-tiny (70MB)
- **中文应用**: Paraformer-zh (120MB)
- **服务器端**: 可选择更大的模型

### 部署优化

- 使用CDN加速模型下载
- 实现模型预热机制
- 监控模型下载成功率

## 📝 注意事项

- Sherpa-ONNX 模型首次下载需要时间，请耐心等待
- 讯飞语音识别需要有效的应用凭证
- 在生产环境中使用HTTPS协议
- 某些浏览器可能对麦克风访问有限制
- Vercel函数有执行时间限制，选择合适的模型大小

## 🔍 故障排除

### 常见问题

1. **模型下载失败**
   - 检查网络连接
   - 尝试更换模型
   - 查看控制台错误信息

2. **识别效果不佳**
   - 确保音频质量良好
   - 检查麦克风权限
   - 尝试不同的模型

3. **部署问题**
   - 检查环境变量配置
   - 确认模型大小适合部署平台
   - 查看函数执行日志

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License
