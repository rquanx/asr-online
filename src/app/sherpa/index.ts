const sherpa_onnx = require('sherpa-onnx')
import path from 'path'
import fs from 'fs'
import { writeFile } from 'fs/promises'
import os from 'os'
const inly = require('inly')
import { CHINESE_MODELS } from './models'


interface ModelDownloadStatus {
  [key: string]: {
    downloaded: boolean
    loading: boolean
    error?: string
    size?: number
  }
}

function getFirstDirSync(directory: string) {
  try {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const fullPath = path.join(directory, file);
      if (fs.statSync(fullPath).isDirectory()) {
        return file; // 返回第一个文件夹名
      }
    }
    return null; // 没有文件夹
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}

class ModelDownloader {
  private cache: { [key: string]: ArrayBuffer } = {}
  private recognizers: { [key: string]: any } = {}

  private modelFiles: { [key: string]: { [filename: string]: string } } = {} // 存储文件路径
  private modelDir: string

  constructor() {
    // 使用临时目录存储模型文件
    this.modelDir = path.join(os.tmpdir(), 'sherpa-models')
  }

  async extractTarBz2(filePath: string, outputDir: string) {
    return new Promise((resolve, reject) => {
      const extract = inly(filePath, outputDir)
      extract.on('end', () => {
        resolve(undefined);
      });
    });
  }

  async downloadModel(model: typeof CHINESE_MODELS[0], onProgress?: (progress: number) => void) {
    if (this.recognizers[model.id]) {
      return this.recognizers[model.id]
    }

    try {

      const compressedFilePath = path.join(this.modelDir, `${model.id}.tar.bz2`)
      if (!fs.existsSync(compressedFilePath)) {
        // 下载压缩包
        onProgress?.(0)
        console.log(`开始下载模型: ${model.name}`)

        const response = await fetch(model.url)
        if (!response.ok) {
          throw new Error(`下载失败: ${response.status} ${response.statusText}`)
        }

        const contentLength = response.headers.get('content-length')
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0

        // 监控下载进度
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法获取响应流')
        }

        const chunks: Uint8Array[] = []
        let downloadedLength = 0
        let prevProgress = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          chunks.push(value)
          downloadedLength += value.length

          if (totalSize > 0) {
            const progress = downloadedLength * 100 / totalSize
            if (progress - prevProgress > 1) {
              prevProgress = progress
              console.log('下载进度:', Math.round(progress), '%', downloadedLength / 1024 / 1024, 'MB ', totalSize / 1024 / 1024, 'MB')
            }
            onProgress?.(progress)
          }
        }

        // 合并数据
        const buffer = new ArrayBuffer(downloadedLength)
        const uint8Array = new Uint8Array(buffer)
        let offset = 0
        for (const chunk of chunks) {
          uint8Array.set(chunk, offset)
          offset += chunk.length
        }

        console.log(`下载完成，文件大小: ${(downloadedLength / 1024 / 1024).toFixed(2)} MB`)

        // 保存压缩文件到临时目录
        if (!fs.existsSync(this.modelDir)) {
          fs.mkdirSync(this.modelDir, { recursive: true })
        }


        await writeFile(compressedFilePath, Buffer.from(buffer))
        console.log(`压缩文件已保存到: ${compressedFilePath}`)
      }

      onProgress?.(0.6)

      // 解压文件
      console.log('开始解压文件...')

      // 保存解压后的文件到临时目录
      const modelSubDir = path.join(this.modelDir, model.id)
      if (!fs.existsSync(modelSubDir)) {
        fs.mkdirSync(modelSubDir, { recursive: true })
      }
      let folder = getFirstDirSync(modelSubDir) || ''
      if (!folder) {
        await this.extractTarBz2(compressedFilePath, modelSubDir);
        folder = getFirstDirSync(modelSubDir) || ''
      }

      onProgress?.(0.8)

      // 创建模型配置，将文件名替换为实际的文件路径
      const resolvedConfig: any = {}

      const pushPath = (from: any, to: any) => {
        for (const [key, filename] of Object.entries(from)) {
          if (['modelType', 'language', 'task', 'tailPaddings', ''].includes(key)) {
            to[key] = filename
          }
          else if (typeof filename === 'object') {
            if (!to[key]) {
              to[key] = {}
            }
            pushPath(from[key], to[key])
          } else if (typeof filename === 'string' && fs.existsSync(path.join(modelSubDir, folder, filename))) {
            to[key] = path.join(modelSubDir, folder, filename)
          } else {
            console.warn(`找不到模型文件: ${filename}`)
            to[key] = filename // 保持原值，可能会导致错误
          }
        }
      }

      pushPath(model.modelConfig, resolvedConfig)

      console.log('创建识别器配置:', resolvedConfig)
      // 创建识别器
      const recognizer = sherpa_onnx.createOfflineRecognizer({ modelConfig: resolvedConfig })
      this.recognizers[model.id] = recognizer

      onProgress?.(1.0)
      console.log(`模型 ${model.name} 加载完成`)

      return recognizer
    } catch (error) {
      console.error('模型下载/加载错误:', error)
      throw error
    }
  }
  getRecognizer(modelId: string): any {
    return this.recognizers[modelId]
  }

  isModelAvailable(modelId: string): boolean {
    return !!this.recognizers[modelId]
  }

  // 清理资源
  cleanup(modelId?: string) {
    if (modelId) {
      // 清理特定模型
      if (this.modelFiles[modelId]) {
        Object.values(this.modelFiles[modelId]).forEach(url => {
          URL.revokeObjectURL(url)
        })
        delete this.modelFiles[modelId]
      }
      delete this.recognizers[modelId]
    } else {
      // 清理所有资源
      Object.values(this.modelFiles).forEach(files => {
        Object.values(files).forEach(url => {
          URL.revokeObjectURL(url)
        })
      })
      this.modelFiles = {}
      this.recognizers = {}
    }
  }
}

class SherpaRecognizer {
  private modelDownloader: ModelDownloader
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
    } catch (error) {
      throw new Error(`模型加载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async recognize(modelId: string, waveFilename: string): Promise<string> {
    if (!this.isModelLoaded(modelId)) {
      throw new Error('请先加载模型')
    }

    if (this.isRecognizing) {
      return ''
    }

    try {
      this.isRecognizing = true
      const recognizer = this.modelDownloader.getRecognizer(modelId)

      if (!recognizer) {
        throw new Error('识别器未初始化')
      }

      const stream = recognizer.createStream()
      const wave = sherpa_onnx.readWave(waveFilename);
      stream.acceptWaveform(wave.sampleRate, wave.samples);

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

  isModelLoaded(model: string): boolean {
    return this.modelDownloader.isModelAvailable(model)
  }


  getAvailableModels() {
    return CHINESE_MODELS
  }
}

export { SherpaRecognizer, CHINESE_MODELS }
export type { ModelDownloadStatus }