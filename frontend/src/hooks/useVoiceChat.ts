import { useState, useEffect, useCallback } from 'react';

interface UseVoiceChatProps {
  channelId: string | null;
  isMuted: boolean;
}

const useVoiceChat = ({ channelId, isMuted }: UseVoiceChatProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取麦克风权限并开启音频流
  const startAudio = useCallback(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      setStream(audioStream);
      setError(null);
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置');
      console.error('麦克风访问错误:', err);
    }
  }, []);

  // 停止音频流
  const stopAudio = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // 切换静音状态
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [stream, isMuted]);

  // 当加入/退出频道时，开启/关闭音频流
  useEffect(() => {
    if (channelId && !stream) {
      startAudio();
    } else if (!channelId && stream) {
      stopAudio();
    }
  }, [channelId, stream, startAudio, stopAudio]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    stream,
    error,
    isStreaming: !!stream
  };
};

export default useVoiceChat; 