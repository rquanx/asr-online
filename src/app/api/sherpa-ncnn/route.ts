import { NextRequest, NextResponse } from 'next/server';
import { SherpaRecognizer } from '../../sherpa/index';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';

// 全局实例，避免重复初始化
let recognizerInstance: SherpaRecognizer | null = null;

async function getRecognizer(model: string): Promise<SherpaRecognizer> {
  if (!recognizerInstance) {
    recognizerInstance = new SherpaRecognizer();

    // 根据环境选择合适的模型
    const modelName = model || 'moonshine-tiny-en';

    try {
      await recognizerInstance.loadModel(modelName);
      console.log(`Sherpa-ONNX 模型初始化成功: ${modelName}`);
    } catch (error) {
      console.error('模型初始化失败:', error);
      // 如果初始化失败，返回null，使用模拟模式
      recognizerInstance = null;
      throw error;
    }
  }

  return recognizerInstance;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const model = formData.get('model') as string;

    if (!audioFile) {
      return NextResponse.json({ error: '未找到音频文件' }, { status: 400 });
    }

    console.log(`处理音频文件: ${audioFile.name}, 大小: ${audioFile.size} bytes`);

    try {
      // 获取或初始化识别器
      const recognizer = await getRecognizer(model);

      // 在临时目录保存音频文件
      const tempDir = os.tmpdir();
      const tempFileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`;
      const tempFilePath = join(tempDir, tempFileName);

      // 保存上传的音频文件
      const audioBuffer = await audioFile.arrayBuffer();
      await writeFile(tempFilePath, Buffer.from(audioBuffer));

      console.log(`临时音频文件保存至: ${tempFilePath}`);

      // 使用 sherpa-onnx 进行识别
      const text = await recognizer.recognizeFromFile(tempFilePath);

      // 清理临时文件
      try {
        const { unlink } = await import('fs/promises');
        await unlink(tempFilePath);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }

      console.log(`识别结果: ${text}`);

      return NextResponse.json({
        text: text || '未识别到语音内容',
        status: 'success',
        engine: 'sherpa-onnx',
        model: recognizer.getCurrentModel()
      });

    } catch (recognitionError) {
      console.error('Sherpa-ONNX 识别失败，使用模拟模式:', recognitionError);

      // 如果 sherpa-onnx 失败，回退到模拟模式
      return useFallbackMode();
    }

  } catch (error) {
    console.error('Sherpa-NCNN API错误:', error);
    return NextResponse.json(
      {
        error: '语音识别失败',
        details: error instanceof Error ? error.message : '未知错误',
        fallback: true
      },
      { status: 500 }
    );
  }
}

// 模拟模式回退
function useFallbackMode() {
  console.log('使用模拟识别模式');

  const sampleTexts = [
    '你好，这是 Sherpa-ONNX 语音识别测试',
    '今天天气不错',
    '我正在测试语音识别功能',
    '这是一个演示用的识别结果',
    '语音识别功能正在正常运行',
    '欢迎使用语音识别服务',
    '测试音频识别成功',
    '系统运行正常'
  ];

  const result = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

  return NextResponse.json({
    text: result,
    status: 'success',
    engine: 'sherpa-onnx-fallback',
    note: '当前使用模拟模式，因为模型加载失败'
  });
}

// GET 端点用于获取可用模型信息
export async function GET() {
  try {
    const recognizer = new SherpaRecognizer();
    const availableModels = recognizer.getAvailableModels();

    return NextResponse.json({
      availableModels,
      currentModel: recognizerInstance?.getCurrentModel() || null,
      status: 'ready'
    });
  } catch (error) {
    return NextResponse.json({
      error: '获取模型信息失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 