'use client'

import { useState, useCallback, useRef } from 'react'

const sherpa_onnx = require('sherpa-onnx')

// 中文模型配置（仅经过验证的官方模型）
const CHINESE_MODELS = [
  {
    id: 'paraformer-zh',
    name: 'Paraformer-中文（推荐）',
    description: '阿里达摩院Paraformer模型，专为中文优化，准确率高',
    size: '120MB',
    baseUrl: 'https://huggingface.co/csukuangfj/sherpa-onnx-paraformer-zh-2024-03-09/resolve/main',
    files: {
      model: 'model.int8.onnx',
      tokens: 'tokens.txt'
    }
  },
  {
    id: 'zipformer-zh',
    name: 'Zipformer-中文',
    description: '基于Zipformer架构的中文模型，平衡准确率和速度',
    size: '67MB',
    baseUrl: 'https://huggingface.co/zrjin/sherpa-onnx-zipformer-multi-zh-hans-2023-9-2/resolve/main',
    files: {
      encoder: 'encoder-epoch-20-avg-1.int8.onnx',
      decoder: 'decoder-epoch-20-avg-1.onnx',
      joiner: 'joiner-epoch-20-avg-1.int8.onnx',
      tokens: 'tokens.txt'
    }
  },
  {
    id: 'whisper-zh',
    name: 'Whisper-中文版',
    description: 'OpenAI Whisper模型的中文版本',
    size: '70MB',
    baseUrl: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main',
    files: {
      encoder: 'tiny-encoder.onnx',
      decoder: 'tiny-decoder.onnx',
      tokens: 'tiny-tokens.txt'
    }
  }
]

interface ModelDownloadStatus {
  [key: string]: {
    downloaded: boolean
    loading: boolean
    error?: string
    size?: number
  }
}

class ModelDownloader {
  private cache: { [key: string]: ArrayBuffer } = {}
  private recognizers: { [key: string]: any } = {}

  async downloadFile(url: string, onProgress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
    if (this.cache[url]) {
      return this.cache[url]
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status}`)
    }

    const total = parseInt(response.headers.get('content-length') || '0', 10)
    const reader = response.body?.getReader()
    
    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      loaded += value.length
      onProgress?.(loaded, total)
    }

    const buffer = new ArrayBuffer(loaded)
    const view = new Uint8Array(buffer)
    let offset = 0
    
    for (const chunk of chunks) {
      view.set(chunk, offset)
      offset += chunk.length
    }

    this.cache[url] = buffer
    return buffer
  }

  async downloadModel(modelConfig: typeof CHINESE_MODELS[0], onProgress?: (progress: number) => void): Promise<any> {
    if (this.recognizers[modelConfig.id]) {
      return this.recognizers[modelConfig.id]
    }

    const files: { [key: string]: ArrayBuffer } = {}
    const fileEntries = Object.entries(modelConfig.files)
    let completedFiles = 0

    // 并行下载所有文件
    await Promise.all(
      fileEntries.map(async ([key, filename]) => {
        const url = `${modelConfig.baseUrl}/${filename}`
        files[key] = await this.downloadFile(url, (loaded, total) => {
          const fileProgress = total > 0 ? loaded / total : 0
          const overallProgress = (completedFiles + fileProgress) / fileEntries.length
          onProgress?.(Math.round(overallProgress * 100))
        })
        completedFiles++
      })
    )

    // 创建识别器配置
    let recognizerConfig: any

    if (modelConfig.id === 'paraformer-zh') {
      recognizerConfig = {
        'featConfig': {
          'sampleRate': 16000,
          'featureDim': 80,
        },
        'modelConfig': {
          'paraformer': {
            'model': files.model,
          },
          'tokens': files.tokens,
          'numThreads': 1,
          'provider': 'cpu',
          'debug': 0
        }
      }
    } else if (modelConfig.id.includes('zipformer')) {
      recognizerConfig = {
        'featConfig': {
          'sampleRate': 16000,
          'featureDim': 80,
        },
        'modelConfig': {
          'transducer': {
            'encoder': files.encoder,
            'decoder': files.decoder,
            'joiner': files.joiner,
          },
          'tokens': files.tokens,
          'numThreads': 1,
          'provider': 'cpu',
          'debug': 0
        }
      }
    } else if (modelConfig.id.includes('whisper')) {
      recognizerConfig = {
        'featConfig': {
          'sampleRate': 16000,
          'featureDim': 80,
        },
        'modelConfig': {
          'whisper': {
            'encoder': files.encoder,
            'decoder': files.decoder,
          },
          'tokens': files.tokens,
          'numThreads': 1,
          'provider': 'cpu',
          'debug': 0
        }
      }
    }

    const recognizer = new sherpa_onnx.OfflineRecognizer(recognizerConfig)
    this.recognizers[modelConfig.id] = recognizer
    return recognizer
  }

  getRecognizer(modelId: string): any {
    return this.recognizers[modelId]
  }

  isModelAvailable(modelId: string): boolean {
    return !!this.recognizers[modelId]
  }
}

class SherpaRecognizer {
  private modelDownloader: ModelDownloader
  private currentModel: string = ''
  private isRecognizing: boolean = false

  constructor() {
    this.modelDownloader = new ModelDownloader()
  }

  async loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    const modelConfig = CHINESE_MODELS.find(m => m.id === modelId)
    if (!modelConfig) {
      throw new Error(`未找到模型配置: ${modelId}`)
    }

    try {
      await this.modelDownloader.downloadModel(modelConfig, onProgress)
      this.currentModel = modelId
    } catch (error) {
      throw new Error(`模型加载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async recognize(audioData: Float32Array): Promise<string> {
    if (!this.currentModel) {
      throw new Error('请先加载模型')
    }

    if (this.isRecognizing) {
      return ''
    }

    try {
      this.isRecognizing = true
      const recognizer = this.modelDownloader.getRecognizer(this.currentModel)
      
      if (!recognizer) {
        throw new Error('识别器未初始化')
      }

      const stream = recognizer.createStream()
      stream.acceptWaveform({
        samples: audioData,
        sampleRate: 16000
      })
      
      recognizer.decode(stream)
      const result = recognizer.getResult(stream)
      stream.free()
      
      return result.text || ''
    } catch (error) {
      console.error('识别错误:', error)
      return ''
    } finally {
      this.isRecognizing = false
    }
  }

  isModelLoaded(): boolean {
    return this.modelDownloader.isModelAvailable(this.currentModel)
  }

  getCurrentModel(): string {
    return this.currentModel
  }

  getAvailableModels() {
    return CHINESE_MODELS
  }
}

export { SherpaRecognizer, CHINESE_MODELS }
export type { ModelDownloadStatus }