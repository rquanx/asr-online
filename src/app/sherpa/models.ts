export const CHINESE_MODELS = [
  {
    id: 'zipformer-zh-en',
    name: '300m Zipformer-中英双语',
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-zh-en-2023-11-22.tar.bz2',
    modelConfig: {
      transducer: {
        encoder: 'encoder-epoch-34-avg-19.int8.onnx',
        decoder: 'decoder-epoch-34-avg-19.onnx',
        joiner: 'joiner-epoch-34-avg-19.int8.onnx',
      }
      ,
      tokens: 'tokens.txt',
      modelType: 'transducer',
    }
  },
  {
    id: 'conformer-zh',
    name: '400mb conformer-zh-stateless2-2023-05-23',
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-conformer-zh-stateless2-2023-05-23.tar.bz2',
    modelConfig: {
      transducer: {
        encoder: 'encoder-epoch-99-avg-1.int8.onnx',
        decoder: 'decoder-epoch-99-avg-1.onnx',
        joiner: 'joiner-epoch-99-avg-1.int8.onnx',
      },
      tokens: 'tokens.txt',
      modelType: 'transducer',
    }
  },
  {
    id: 'paraformer-zh',
    name: '70mb paraformer-zh-small-2024-03-09 (Chinese + English)',
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2',
    modelConfig: {
      paraformer: {
        model: 'model.int8.onnx'
      },
      tokens: 'tokens.txt'
    }
  }
]
