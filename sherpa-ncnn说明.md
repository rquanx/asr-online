Sherpa-ONNX 模型类型详解

1. 流式 vs 非流式模型
Online (流式): 实时边说边识别，适合实时对话
Offline (非流式): 需要完整音频，精度更高，适合文件转写


2. 模型架构
Transducer: RNN/Transformer架构，流式支持好
Paraformer: 阿里达摩院架构，中文效果好
CTC: 简单高效，适合移动端
Whisper: OpenAI模型，多语言支持强
Dolphin: 清华的多语言模式


模型使用方法
1.编译成 wasm 在前端运行
2.在服务器下载模型在线运行(需要服务器资源)
3.内置到移动端运行
- pubget



需要训练模型 → sherpa（PyTorch）。
部署到服务器/PC → sherpa-onnx（ONNX Runtime）。
部署到手机/边缘设备 → sherpa-ncnn（NCNN）。