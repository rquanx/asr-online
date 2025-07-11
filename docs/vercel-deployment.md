# Vercel 部署指南

## 🚀 部署到 Vercel

### 1. 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

#### Sherpa-ONNX 模型配置
```bash
SHERPA_MODEL=moonshine-tiny-en
```

可选值：
- `moonshine-tiny-en` - 40MB，最小英文模型（推荐）
- `whisper-tiny-en` - 70MB，Whisper英文模型
- `paraformer-zh` - 120MB，中文模型

#### 讯飞语音识别配置
```bash
NEXT_PUBLIC_XUNFEI_APP_ID=your_app_id_here
NEXT_PUBLIC_XUNFEI_API_KEY=your_api_key_here
NEXT_PUBLIC_XUNFEI_API_SECRET=your_api_secret_here
```

### 2. Vercel 配置注意事项

#### 函数执行时间限制
- **Hobby 计划**: 10秒
- **Pro 计划**: 15秒
- **Enterprise 计划**: 30秒

建议选择最小的模型以确保在时间限制内完成下载和初始化。

#### 内存限制
- **Hobby 计划**: 1024MB
- **Pro 计划**: 3008MB

#### 临时存储
- Vercel 函数有 512MB 临时存储空间
- 模型文件会缓存在 `/tmp` 目录中

### 3. 模型选择建议

#### 对于 Vercel Hobby 计划
推荐使用 `moonshine-tiny-en`：
- 模型大小：40MB
- 下载时间：~3-5秒
- 初始化时间：~2-3秒
- 总计：~5-8秒（符合10秒限制）

#### 对于 Vercel Pro 计划
可以使用更大的模型：
- `whisper-tiny-en`：70MB
- `paraformer-zh`：120MB

### 4. 部署命令

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署
vercel --prod

# 4. 设置环境变量（通过 Vercel Dashboard 或 CLI）
vercel env add SHERPA_MODEL
vercel env add NEXT_PUBLIC_XUNFEI_APP_ID
vercel env add NEXT_PUBLIC_XUNFEI_API_KEY
vercel env add NEXT_PUBLIC_XUNFEI_API_SECRET
```

### 5. 性能优化

#### 冷启动优化
- 使用全局变量缓存已初始化的模型
- 首次请求可能需要较长时间下载模型
- 后续请求将直接使用缓存的模型

#### 模型缓存策略
```typescript
// 全局实例，避免重复下载
let recognizerInstance: SherpaRecognizer | null = null;
```

### 6. 故障处理

#### 模型下载失败
- 自动回退到模拟模式
- 返回示例识别结果
- 确保服务可用性

#### 超时处理
- 设置合理的超时时间
- 监控函数执行时间
- 考虑异步处理长任务

### 7. 监控和日志

#### 查看函数日志
```bash
vercel logs your-deployment-url
```

#### 性能监控
- 函数执行时间
- 内存使用情况
- 模型下载成功率

### 8. 错误排查

#### 常见问题

1. **模型下载超时**
   - 检查网络连接
   - 尝试更小的模型
   - 增加超时时间

2. **内存不足**
   - 升级 Vercel 计划
   - 使用量化模型（int8）
   - 优化模型加载方式

3. **函数超时**
   - 使用更小的模型
   - 优化初始化逻辑
   - 考虑预热策略

### 9. 成本考虑

#### Vercel 计费
- 函数调用次数
- 执行时间
- 带宽使用

#### 优化建议
- 缓存模型文件
- 减少冷启动
- 选择合适的模型大小

### 10. 本地开发

```bash
# 本地开发服务器
npm run dev

# 模拟 Vercel 环境
vercel dev
```

### 11. 生产部署检查清单

- [ ] 设置环境变量
- [ ] 选择合适的模型
- [ ] 测试音频上传
- [ ] 验证识别结果
- [ ] 检查性能指标
- [ ] 监控错误日志 