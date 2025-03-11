import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

// 扩展Window接口以包含currentAudio属性
declare global {
  interface Window {
    currentAudio: HTMLAudioElement | null;
  }
}

// 初始化全局音频对象
if (typeof window !== 'undefined') {
  window.currentAudio = null;
}

export type TTSService = 'browser' | 'azure' | 'google' | 'gpt-sovits';

interface TTSConfig {
  service: TTSService;
  azureKey?: string;
  azureRegion?: string;
  googleKey?: string;
  gptSovitsUrl?: string;
  gptSovitsConfig?: {
    character: string;
    emotion: number;
    speed: number;
    textLanguage: string;
  };
}

interface TTSContextType {
  ttsEnabled: boolean;
  autoRead: boolean;
  ttsSpeed: number;
  ttsConfig: TTSConfig;
  toggleTTS: () => void;
  toggleAutoRead: () => void;
  setTTSSpeed: (speed: number) => void;
  speak: (text: string) => void;
  updateTTSConfig: (config: Partial<TTSConfig>) => void;
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  availableVoices: SpeechSynthesisVoice[];
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

// 语言检测函数
const detectLanguage = (text: string): string => {
  const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(text);
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  if (hasJapanese && !hasChinese) return 'ja-JP';
  if (hasChinese) return 'zh-CN';
  if (hasEnglish) return 'en-US';
  return 'zh-CN';
};

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ttsEnabled, setTTSEnabled] = useState(true);
  const [autoRead, setAutoRead] = useState(false);
  const [ttsSpeed, setTTSSpeed] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [ttsConfig, setTTSConfig] = useState<TTSConfig>({
    service: 'browser',
    azureKey: '',
    azureRegion: '',
    googleKey: '',
    gptSovitsUrl: '',
    gptSovitsConfig: {
      character: 'Anon',
      emotion: 0,
      speed: 1.5,
      textLanguage: 'auto'
    }
  });

  // 加载和更新可用的语音
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // 默认选择中文语音
      const defaultVoice = voices.find(voice => 
        voice.lang.startsWith('zh') && voice.localService
      ) || voices.find(voice => 
        voice.lang.startsWith('zh')
      ) || voices[0];
      
      setSelectedVoice(defaultVoice || null);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const savedTTS = localStorage.getItem('tts_enabled');
    const savedAutoRead = localStorage.getItem('auto_read');
    const savedConfig = localStorage.getItem('tts_config');

    if (savedTTS !== null) {
      setTTSEnabled(savedTTS === 'true');
    }
    if (savedAutoRead !== null) {
      setAutoRead(savedAutoRead === 'true');
    }
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setTTSConfig(config);
      } catch {
        console.error('Failed to parse saved TTS config');
      }
    }
  }, []);

  const toggleTTS = () => {
    const newValue = !ttsEnabled;
    setTTSEnabled(newValue);
    localStorage.setItem('tts_enabled', String(newValue));
  };

  const toggleAutoRead = () => {
    const newValue = !autoRead;
    setAutoRead(newValue);
    localStorage.setItem('auto_read', String(newValue));
  };

  const updateTTSConfig = (config: Partial<TTSConfig>) => {
    const newConfig = { ...ttsConfig, ...config };
    setTTSConfig(newConfig);
    localStorage.setItem('tts_config', JSON.stringify(newConfig));
  };

  const getAzureVoiceName = (lang: string): string => {
    switch (lang) {
      case 'en-US':
        return 'en-US-JennyNeural';
      case 'ja-JP':
        return 'ja-JP-NanamiNeural';
      default:
        return 'zh-CN-XiaoxiaoNeural';
    }
  };

  const speakWithAzure = async (text: string, lang: string) => {
    const azureKey = ttsConfig.azureKey || '';
    const azureRegion = ttsConfig.azureRegion || '';

    try {
      const voiceName = getAzureVoiceName(lang);
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
          <voice name="${voiceName}">
            <prosody rate="${ttsSpeed}">
              ${text}
            </prosody>
          </voice>
        </speak>
      `;

      const response = await fetch(
        `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'User-Agent': 'ChatApp',
          },
          body: ssml.trim(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure TTS request failed: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      // 清理之前的音频
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }
      
      window.currentAudio = audio;
      await audio.play();
    } catch (error) {
      console.error('Azure TTS error:', error);
      message.error('语音合成失败，请检查API配置');
    }
  };

  const speakWithGoogle = async (text: string, lang: string) => {
    const googleKey = ttsConfig.googleKey || '';

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: lang },
            audioConfig: { 
              audioEncoding: 'MP3',
              speakingRate: ttsSpeed
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Google TTS request failed');

      const { audioContent } = await response.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      
      // 清理之前的音频
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }
      
      window.currentAudio = audio;
      await audio.play();
    } catch (error) {
      console.error('Google TTS error:', error);
    }
  };

  const speakWithGPTSovits = async (text: string) => {
    try {
      const response = await fetch(ttsConfig.gptSovitsUrl || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          character: ttsConfig.gptSovitsConfig?.character || 'Anon',
          emotion: ttsConfig.gptSovitsConfig?.emotion || 0,
          speed: ttsSpeed,
          text_language: ttsConfig.gptSovitsConfig?.textLanguage || 'auto',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioData = await response.arrayBuffer();
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }

      const audio = new Audio(audioUrl);
      window.currentAudio = audio;
      
      audio.onerror = (e) => {
        console.error('音频播放错误:', e);
        message.error('音频播放失败');
      };

      await audio.play();
    } catch (error) {
      console.error('Error in GPT-SoVITS TTS:', error);
    }
  };

  const speak = async (text: string) => {
    if (!ttsEnabled || !text) return;

    // 停止当前正在播放的音频
    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
    }

    const detectedLang = detectLanguage(text);

    try {
      switch (ttsConfig.service) {
        case 'azure':
          await speakWithAzure(text, detectedLang);
          break;
        case 'google':
          await speakWithGoogle(text, detectedLang);
          break;
        case 'gpt-sovits':
          await speakWithGPTSovits(text);
          break;
        default: {
          // 使用浏览器默认TTS
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = detectedLang;
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          utterance.rate = ttsSpeed;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
          break;
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      message.error('语音合成失败');
    }
  };

  return (
    <TTSContext.Provider value={{ 
      ttsEnabled, 
      autoRead, 
      ttsSpeed,
      ttsConfig,
      toggleTTS, 
      toggleAutoRead,
      setTTSSpeed,
      updateTTSConfig,
      speak,
      selectedVoice,
      setSelectedVoice,
      availableVoices
    }}>
      {children}
    </TTSContext.Provider>
  );
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
}; 