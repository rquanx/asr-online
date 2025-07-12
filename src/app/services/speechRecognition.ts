// 语音识别服务接口
export interface SpeechRecognitionService {
  recognize(audioBlob: Blob): Promise<string>;
}

// Sherpa-NCNN 语音识别服务
export class SherpaNcnnService implements SpeechRecognitionService {
  private readonly apiUrl: string;
  private selectedModel: string;

  constructor(apiUrl: string = '/api/sherpa-ncnn', model: string = 'zipformer-zh-en') {
    this.apiUrl = apiUrl;
    this.selectedModel = model;
  }

  // 设置当前模型
  setModel(model: string): void {
    this.selectedModel = model;
  }

  // 获取当前模型
  getModel(): string {
    return this.selectedModel;
  }

  // 获取可用模型列表
  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.availableModels || [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  async recognize(audioBlob: Blob): Promise<string> {
    try {
      // 将 webm 格式转换为 wav 格式（如果需要）
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('model', this.selectedModel); // 添加模型参数

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.text || '识别失败';
    } catch (error) {
      console.error('Sherpa-NCNN recognition error:', error);
      // 模拟识别结果用于演示
      return `识别异常: ${error}`
    }
  }
}


// 工厂函数
export function createSherpaService(): SpeechRecognitionService {
  return new SherpaNcnnService();
}
