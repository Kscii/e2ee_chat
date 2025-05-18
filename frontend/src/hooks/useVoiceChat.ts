import { useState, useEffect, useCallback } from 'react';

interface UseVoiceChatProps {
  channelId: string | null;
  isMuted: boolean;
}

const useVoiceChat = ({ channelId, isMuted }: UseVoiceChatProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get microphone permission and start audio stream
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
      setError('Unable to access microphone, please check permission settings');
      console.error('🎤 Microphone access error:', err);
    }
  }, []);

  // Stop audio stream
  const stopAudio = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Toggle mute state
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [stream, isMuted]);

  // Start/stop audio stream when joining/leaving channel
  useEffect(() => {
    if (channelId && !stream) {
      startAudio();
    } else if (!channelId && stream) {
      stopAudio();
    }
  }, [channelId, stream, startAudio, stopAudio]);

  // Clean up when component unmounts
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