## 初测情况

- 准确率：还是要看场景、语速......
  - Sherpa 要看模型，就目前测试的几个模型，整体讯飞语音听写感觉好点
- 标点符号：讯飞默认有标点符号输出，Sherpa 要看模型或自己增加标点模型处理
- 速度：Sherpa 要看设备性能以及模型大小
  - 我电脑测试是 sherpa > 讯飞
- 开发
  - 讯飞：跑通通讯协议即可，主要考虑价格、用量
  - sherpa：测模型估计需要不少时间，模型选型 + 设备性能 + 模型配置测试（wasm 跑的话）
    - 好处是可以自部署 or 客户端部署

## 讯飞

 - 两种 ASR 模式：**大模型识别**、**语音听写**  
 - 单次时长限制：**1 min**  
 - 大模型需实名认证并等待审核，暂未测试
 - 语音听写只支持单语种（参数中指定）
 - 大模型有多语种支持 [语种列表](https://www.xfyun.cn/doc/spark/spark_mul_cn_iat.html#%E4%B8%83%E3%80%81%E8%AF%AD%E7%A7%8D%E5%88%97%E8%A1%A8)

价格  
 - [语音听写](https://www.xfyun.cn/services/voicedictation?target=price)  
 - [大模型](https://www.xfyun.cn/services/speech_big_model)

开发

只需要实现通讯处理（demo 已实现），不同 ASR 方式，仅参数略有不同  
 - WebSocket 示例：参考官方 [WebAPI 示例](https://www.xfyun.cn/doc/asr/voicedictation/API.html)  
 - [大模型 API 文档](https://www.xfyun.cn/doc/spark/spark_mul_cn_iat.html)

## Sherpa

Sherpa 更像是一种框架，需要自己选模型
- 需要训练模型 → sherpa（PyTorch）。
- 部署到服务器/PC/手机 → sherpa-onnx（ONNX Runtime）。
- 部署到手机/嵌入式设备 → sherpa-ncnn（NCNN）。

使用方式
- 在移动端本地加载模型：[flutter 包](https://pub.dev/packages/sherpa_onnx)
- 服务端部署
  - wasm 在 node 加载模型：[node 包](https://www.npmjs.com/package/sherpa-onnx)

sherpa-onnx 可选模型（大小几十MB ~ 1GB）
 - [在线 Transducer 模型索引](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/online-transducer/index.html)
 - [官方 Release 打包](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)
 - [issue 有推荐模型，未测试](https://github.com/k2-fsa/sherpa-onnx/issues/1906#issuecomment-2673752996)

- 语种：中英日韩.....,看具体选择的模型
- 标点符号输出要看模型，或自己增加标点处理模型
 - [标点符号问题](https://github.com/k2-fsa/sherpa-onnx/issues/1453#issuecomment-2428155544)

开发
- 服务部署的话，需要看服务器费用和承载能力，CPU 也可以跑
- 模型加载逻辑通用，但是每个模型的加载配置不同，模型数量也多
  - 如果用 wasm ,每次添加新模型都要猜 + 测配置

