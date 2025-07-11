# Sherpa-NCNN 真实集成指南

## 方案一：Python + FastAPI 后端服务

### 1. 安装 Sherpa-NCNN

```bash
# 安装依赖
pip install sherpa-ncnn
pip install fastapi uvicorn python-multipart
```

### 2. 下载模型文件

```bash
# 下载中文语音识别模型
wget https://github.com/k2-fsa/sherpa-ncnn/releases/download/models/sherpa-ncnn-streaming-zipformer-bilingual-zh-en-2023-02-13.tar.bz2
tar -xvf sherpa-ncnn-streaming-zipformer-bilingual-zh-en-2023-02-13.tar.bz2
```

### 3. 创建 Python API 服务

```python
# api_server.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sherpa_ncnn
import tempfile
import os
import asyncio
from typing import Optional

app = FastAPI()

# 添加CORS支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量存储识别器
recognizer: Optional[sherpa_ncnn.Recognizer] = None

def initialize_recognizer():
    """初始化Sherpa-NCNN识别器"""
    global recognizer
    
    # 模型路径（需要根据实际下载的模型调整）
    model_dir = "./sherpa-ncnn-streaming-zipformer-bilingual-zh-en-2023-02-13"
    
    config = sherpa_ncnn.RecognizerConfig(
        feat_config=sherpa_ncnn.FeatureConfig(),
        model_config=sherpa_ncnn.ModelConfig(
            encoder=f"{model_dir}/encoder_jit_trace-pnnx.ncnn.param",
            decoder=f"{model_dir}/decoder_jit_trace-pnnx.ncnn.param",
            joiner=f"{model_dir}/joiner_jit_trace-pnnx.ncnn.param",
            tokens=f"{model_dir}/tokens.txt",
            num_threads=4,
            use_vulkan_compute=False,
        ),
        decoder_config=sherpa_ncnn.DecoderConfig(
            decoding_method="greedy_search",
            num_active_paths=4,
        ),
        enable_endpoint=True,
        rule1_min_trailing_silence=2.4,
        rule2_min_trailing_silence=1.2,
        rule3_min_utterance_length=300,
    )
    
    recognizer = sherpa_ncnn.Recognizer(config)

@app.on_event("startup")
async def startup_event():
    """应用启动时初始化识别器"""
    try:
        initialize_recognizer()
        print("Sherpa-NCNN 识别器初始化成功")
    except Exception as e:
        print(f"初始化失败: {e}")

@app.post("/api/sherpa-ncnn")
async def recognize_audio(audio: UploadFile = File(...)):
    """语音识别API端点"""
    global recognizer
    
    if recognizer is None:
        raise HTTPException(status_code=500, detail="识别器未初始化")
    
    try:
        # 保存上传的音频文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # 读取音频文件并进行识别
            import soundfile as sf
            
            # 读取音频数据
            audio_data, sample_rate = sf.read(temp_file_path)
            
            # 确保是16kHz单声道
            if sample_rate != 16000:
                import librosa
                audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=16000)
                sample_rate = 16000
            
            if len(audio_data.shape) > 1:
                audio_data = audio_data[:, 0]  # 取第一声道
            
            # 创建音频流
            stream = recognizer.create_stream()
            
            # 分块处理音频
            chunk_size = int(0.1 * sample_rate)  # 100ms chunks
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i:i + chunk_size]
                stream.accept_waveform(sample_rate, chunk.astype(np.float32))
            
            # 结束输入
            stream.input_finished()
            
            # 获取识别结果
            while recognizer.is_ready(stream):
                recognizer.decode_stream(stream)
            
            result = recognizer.get_result(stream)
            text = result.text.strip()
            
            return {
                "text": text if text else "未识别到语音",
                "status": "success",
                "engine": "sherpa-ncnn"
            }
            
        finally:
            # 清理临时文件
            os.unlink(temp_file_path)
            
    except Exception as e:
        print(f"识别错误: {e}")
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 4. 启动服务

```bash
# 安装额外依赖
pip install soundfile librosa numpy

# 启动API服务器
python api_server.py
```

### 5. 修改 Next.js API 路由

```typescript
// src/app/api/sherpa-ncnn/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: '未找到音频文件' }, { status: 400 });
    }

    // 转发到Python API服务器
    const pythonApiFormData = new FormData();
    pythonApiFormData.append('audio', audioFile);

    const response = await fetch('http://localhost:8000/api/sherpa-ncnn', {
      method: 'POST',
      body: pythonApiFormData,
    });

    if (!response.ok) {
      throw new Error(`Python API错误: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Sherpa-NCNN API错误:', error);
    return NextResponse.json(
      { error: '语音识别失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
```

## 方案二：Docker 容器化部署

### 1. 创建 Dockerfile

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    libsndfile1-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip install -r requirements.txt

# 下载模型文件
RUN wget https://github.com/k2-fsa/sherpa-ncnn/releases/download/models/sherpa-ncnn-streaming-zipformer-bilingual-zh-en-2023-02-13.tar.bz2 \
    && tar -xvf sherpa-ncnn-streaming-zipformer-bilingual-zh-en-2023-02-13.tar.bz2 \
    && rm sherpa-ncnn-streaming-zipformer-bilingual-zh-en-2023-02-13.tar.bz2

COPY api_server.py .

EXPOSE 8000

CMD ["python", "api_server.py"]
```

### 2. requirements.txt

```txt
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
sherpa-ncnn==1.9.14
soundfile==0.12.1
librosa==0.10.1
numpy==1.24.3
```

### 3. 构建和运行

```bash
# 构建Docker镜像
docker build -t sherpa-ncnn-api .

# 运行容器
docker run -p 8000:8000 sherpa-ncnn-api
```

## 方案三：使用 WebAssembly (实验性)

Sherpa-NCNN 也支持编译为 WebAssembly，可以直接在浏览器中运行，但这需要：

1. 编译 Sherpa-NCNN 为 WASM
2. 加载模型文件到浏览器
3. 处理大文件加载和内存管理

## 总结

**为什么当前使用模拟：**
- 简化部署和演示
- 避免复杂的环境配置
- 专注于前端界面和交互逻辑

**真实集成的价值：**
- 本地化部署，数据更安全
- 可以自定义模型和参数
- 不依赖网络连接

您希望我帮您实现哪种方案呢？我可以根据您的需求提供详细的实现指导。 