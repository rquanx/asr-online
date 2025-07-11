'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecognizerProps {
  title: string;
  onRecognize: (audioBlob: Blob) => Promise<string>;
  className?: string;
}

const VoiceRecognizer: React.FC<VoiceRecognizerProps> = ({ 
  title, 
  onRecognize, 
  className = '' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionHistory, setRecognitionHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        
        try {
          const result = await onRecognize(audioBlob);
          if (result.trim()) {
            setRecognitionHistory(prev => [...prev, result]);
          }
        } catch (error) {
          console.error('Recognition error:', error);
          setRecognitionHistory(prev => [...prev, '识别失败，请重试']);
        } finally {
          setIsProcessing(false);
        }

        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearHistory = () => {
    setRecognitionHistory([]);
  };

  const handleMouseDown = () => {
    if (!isRecording && !isProcessing) {
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
    if (!isRecording && !isProcessing) {
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
      if (isRecording) {
        stopRecording();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* 标题 */}
      <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
        {title}
      </h2>

      {/* 录音按钮 */}
      <div className="flex justify-center mb-6">
        <button
          className={`w-20 h-20 rounded-full font-semibold text-white transition-all duration-200 select-none ${
            isRecording
              ? 'bg-red-500 scale-110 shadow-lg animate-pulse'
              : isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-md'
          }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // 鼠标离开时也停止录音
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={isProcessing}
          style={{ touchAction: 'none' }} // 防止触摸滚动
        >
          {isProcessing ? (
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
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">长按录音</span>
            </div>
          )}
        </button>
      </div>

      {/* 状态提示 */}
      <div className="text-center mb-4">
        {isRecording && (
          <p className="text-red-500 font-medium">🔴 正在录音...</p>
        )}
        {isProcessing && (
          <p className="text-blue-500 font-medium">⏳ 正在识别...</p>
        )}
        {!isRecording && !isProcessing && (
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
                  className="bg-white p-3 rounded border-l-4 border-blue-400 shadow-sm"
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

export default VoiceRecognizer; 