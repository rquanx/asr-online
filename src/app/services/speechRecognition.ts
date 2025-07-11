import CryptoJS from 'crypto-js';

// 语音识别服务接口

export interface SpeechRecognitionService {
  recognize(audioBlob: Blob): Promise<string>;
}

// Sherpa-NCNN 语音识别服务
export class SherpaNcnnService implements SpeechRecognitionService {
  private readonly apiUrl: string;

  constructor(apiUrl: string = '/api/sherpa-ncnn') {
    this.apiUrl = apiUrl;
  }

  async recognize(audioBlob: Blob): Promise<string> {
    try {
      // 将 webm 格式转换为 wav 格式（如果需要）
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

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

// 讯飞语音识别服务
export class XunfeiService implements SpeechRecognitionService {
  private readonly appId: string = "4af2effd";
  private readonly apiKey: string = "17a10900936c5127bdc432c66ebcf782";
  private readonly apiSecret: string = "NzZiMDg5MDI0NWVkYzFhNDZjZTIwZGE1";

  constructor(config?: { appId?: string; apiKey?: string; apiSecret?: string }) {
    if (config?.appId) this.appId = config.appId;
    if (config?.apiKey) this.apiKey = config.apiKey;
    if (config?.apiSecret) this.apiSecret = config.apiSecret;
  }

  async recognize(audioBlob: Blob): Promise<string> {
    try {
      // 转换音频格式为PCM
      const pcmData = await this.convertToPCM(audioBlob);
      
      // 调用讯飞实时语音识别API
      return await this.callXunfeiWebSocketApi(pcmData);
    } catch (error) {
      console.error('Xunfei recognition error:', error);
      throw new Error(`讯飞语音识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async convertToPCM(audioBlob: Blob): Promise<ArrayBuffer> {
    // 使用Web Audio API转换音频格式
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 重新采样到16kHz单声道
      const targetSampleRate = 16000;
      const channels = 1;
      
      if (audioBuffer.sampleRate === targetSampleRate && audioBuffer.numberOfChannels === channels) {
        // 已经是目标格式，转换为ArrayBuffer
        const channelData = audioBuffer.getChannelData(0);
        const int16Array = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(channelData[i] * 32768)));
        }
        return int16Array.buffer;
      }
      
      // 创建离线音频上下文进行重新采样
      const offlineContext = new OfflineAudioContext(
        channels,
        Math.ceil(audioBuffer.duration * targetSampleRate),
        targetSampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const resampledBuffer = await offlineContext.startRendering();
      const pcmData = resampledBuffer.getChannelData(0);
      
      // 转换为16位PCM
      const int16Array = new Int16Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(pcmData[i] * 32768)));
      }
      
      return int16Array.buffer;
    } finally {
      audioContext.close();
    }
  }

  private async callXunfeiWebSocketApi(pcmData: ArrayBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // 构建WebSocket URL
        const wsUrl = this.buildWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        
        let resultText = '';
        let isConnected = false;
        
        ws.onopen = () => {
          console.log('讯飞WebSocket连接已建立');
          isConnected = true;
          
          // 发送音频数据
          this.sendAudioData(ws, pcmData);
        };
        
        ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log('收到讯飞响应:', response);
            
            if (response.action === 'result') {
              const data = response.data;
              if (data && data.result && data.result.ws) {
                for (const word of data.result.ws) {
                  for (const cw of word.cw) {
                    resultText += cw.w;
                  }
                }
              }
              
              // 检查是否是最终结果
              if (data && data.result && data.result.pgs === 'rpl' && data.status === 2) {
                ws.close();
                resolve(resultText || '未识别到语音');
              }
            } else if (response.action === 'error') {
              ws.close();
              reject(new Error(`讯飞API错误: ${response.desc || '未知错误'}`));
            }
          } catch (parseError) {
            console.error('解析讯飞响应失败:', parseError);
          }
        };
        
        ws.onerror = (error) => {
          console.error('讯飞WebSocket错误:', error);
          reject(new Error('WebSocket连接错误'));
        };
        
        ws.onclose = (event) => {
          console.log('讯飞WebSocket连接已关闭:', event.code, event.reason);
          if (isConnected && !resultText) {
            resolve('未识别到语音内容');
          }
        };
        
        // 设置超时
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error('识别超时'));
          }
        }, 30000);
        
      } catch (error) {
        reject(new Error(`创建WebSocket连接失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    });
  }

  private buildWebSocketUrl(): string {
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();
    
    // 构建签名字符串
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    
    // 使用HMAC-SHA256计算签名
    const signature = this.hmacSha256(signatureOrigin, this.apiSecret);
    
    // 构建authorization
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    
    // 构建URL参数
    const params = new URLSearchParams({
      authorization,
      date,
      host
    });
    
    return `wss://${host}${path}?${params.toString()}`;
  }

  private hmacSha256(message: string, secret: string): string {
    // 使用crypto-js库实现HMAC-SHA256签名
    const hash = CryptoJS.HmacSHA256(message, secret);
    return CryptoJS.enc.Base64.stringify(hash);
  }

  private sendAudioData(ws: WebSocket, pcmData: ArrayBuffer): void {
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData)));
    
    // 发送开始帧
    const startFrame = {
      action: 'start',
      data: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        sample_rate: 16000,
        format: 'audio/L16;rate=16000',
        encoding: 'raw'
      }
    };
    
    ws.send(JSON.stringify(startFrame));
    
    // 分片发送音频数据
    let offset = 0;
    const chunkSize = Math.floor(base64Audio.length / 10); // 分10次发送
    
    const sendChunk = () => {
      if (offset < base64Audio.length) {
        const chunk = base64Audio.substring(offset, offset + chunkSize);
        const audioFrame = {
          action: 'audio',
          data: chunk
        };
        
        ws.send(JSON.stringify(audioFrame));
        offset += chunkSize;
        
        setTimeout(sendChunk, 100); // 100ms间隔发送
      } else {
        // 发送结束帧
        const endFrame = {
          action: 'end'
        };
        ws.send(JSON.stringify(endFrame));
      }
    };
    
    // 开始发送音频数据
    setTimeout(sendChunk, 100);
  }
}

// 工厂函数
export function createSherpaService(): SpeechRecognitionService {
  return new SherpaNcnnService();
}

export function createXunfeiService(): SpeechRecognitionService {
  return new XunfeiService();
} 