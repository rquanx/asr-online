'use client';

import VoiceRecognizer from './components/VoiceRecognizer';
import { createSherpaService, createXunfeiService } from './services/speechRecognition';

export default function Home() {
  // 创建语音识别服务实例
  const sherpaService = createSherpaService();
  const xunfeiService = createXunfeiService();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* 页面标题 */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          语音识别演示
        </h1>
        <p className="text-gray-600 text-lg">
          比较不同语音识别服务的效果
        </p>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 上半部分 - Sherpa-NCNN */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <VoiceRecognizer
            title="🚀 Sherpa-NCNN 语音识别"
            onRecognize={async (audioBlob) => {
              return await sherpaService.recognize(audioBlob);
            }}
            className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200"
          />
        </div>

        {/* 分隔线 */}
        <div className="flex items-center justify-center">
          <div className="flex-1 h-px bg-gray-300"></div>
          <div className="px-4 text-gray-500 font-medium">VS</div>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* 下半部分 - 讯飞语音 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <VoiceRecognizer
            title="🎤 讯飞语音识别"
            onRecognize={async (audioBlob) => {
              return await xunfeiService.recognize(audioBlob);
            }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
          />
        </div>
      </div>

      {/* 页面底部信息 */}
      <div className="text-center py-8 text-gray-500">
        <p className="mb-2">长按录音按钮开始录音，松开停止并开始识别</p>
        <p className="text-sm">
          支持桌面端和移动端，需要麦克风权限
        </p>
      </div>
    </div>
  );
}
