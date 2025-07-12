'use client';

import React, { useState, useRef, useEffect } from 'react';
import XfyunASR from '../../xfyun-asr/index.js'
interface XunfeiVoiceRecognizerProps {
  title: string;
  className?: string;
  appId: string;
  apiKey: string;
  apiSecret: string;
}

const XunfeiVoiceRecognizer: React.FC<XunfeiVoiceRecognizerProps> = ({
  title,
  className = '',
  appId,
  apiKey,
  apiSecret
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionHistory, setRecognitionHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const recognizerRef = useRef<XfyunASR | null>(null);

  // 创建识别器实例
  const createRecognizer = async () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      return;
    }
    let resultText = ''
    recognizerRef.current = new XfyunASR({
      appId,
      apiKey,
      apiSecret,
      onConnect: () => {
        setIsConnecting(true);
      },
      onClose: () => {
        setIsConnecting(false);
        setIsProcessing(false);
        setIsRecording(false);
        if (resultText) {
          setRecognitionHistory(prev => [resultText, ...prev]);
        }
      },
      onRender: (text: string) => {
        resultText = text?.trim?.() || ''
      },
      onError: (error: any) => {
        console.error('识别错误:', error);
        setRecognitionHistory(prev => ['识别失败，请重试', ...prev]);
        setIsProcessing(false);
        setIsRecording(false);
        setIsConnecting(false);
      }
    });

    await recognizerRef.current.init()
  };

  const startRecording = async () => {
    try {
      await createRecognizer();
      recognizerRef.current?.start()
      setIsConnecting(false);
      setIsRecording(true);
    } catch (error) {
      console.error('开始识别:', error);
      setIsConnecting(false);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognizerRef.current && isRecording) {
      recognizerRef.current.stop();
      console.log('识别结束');
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const clearHistory = () => {
    setRecognitionHistory([]);
  };

  const handleMouseDown = () => {
    if (!isRecording && !isProcessing && !isConnecting) {
      startRecording();
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isRecording && !isProcessing && !isConnecting) {
      startRecording();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  // 防止意外离开时停止录音
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
    };
  }, []);

  // 清理识别器
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* 标题 */}
      <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
        {title}
      </h2>

      {/* 录音按钮 */}
      <div className="flex justify-center mb-6">
        <button
          className={`w-20 h-20 rounded-full font-semibold text-white transition-all duration-200 select-none ${isRecording
            ? 'bg-red-500 scale-110 shadow-lg animate-pulse'
            : isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : isConnecting
                ? 'bg-yellow-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-md'
            }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // 鼠标离开时也停止录音
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={isProcessing || isConnecting}
          style={{ touchAction: 'none' }} // 防止触摸滚动
        >
          {isConnecting ? (
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
              <span className="text-xs">连接中</span>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
              <span className="text-xs">处理中</span>
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 bg-white rounded-full mb-1"></div>
              <span className="text-xs">松开停止</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">长按录音</span>
            </div>
          )}
        </button>
      </div>

      {/* 状态提示 */}
      <div className="text-center mb-4">
        {isConnecting && (
          <p className="text-yellow-500 font-medium">🔗 正在连接...</p>
        )}
        {isRecording && (
          <p className="text-red-500 font-medium">🔴 正在录音...</p>
        )}
        {isProcessing && (
          <p className="text-blue-500 font-medium">⏳ 正在识别...</p>
        )}
        {!isRecording && !isProcessing && !isConnecting && (
          <p className="text-gray-500">长按按钮开始录音</p>
        )}
      </div>

      {/* 历史记录区域 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-700">识别历史</h3>
          <button
            onClick={clearHistory}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-600 transition-colors"
            disabled={recognitionHistory.length === 0}
          >
            清空
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
          {recognitionHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无识别记录</p>
          ) : (
            <div className="space-y-2">
              {recognitionHistory.map((text, index) => (
                <div
                  key={index}
                  className="bg-white p-3 rounded border-l-4 border-green-400 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-gray-800 flex-1">{text}</p>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XunfeiVoiceRecognizer; 