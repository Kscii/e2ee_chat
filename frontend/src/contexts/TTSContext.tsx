import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import apiConfig from '../config/apiConfig';

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
    azureKey: apiConfig.azure.apiKey || '',
    azureRegion: apiConfig.azure.region || '',
    googleKey: apiConfig.google.apiKey || '',
    gptSovitsUrl: apiConfig.gptSovits.url || '',
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        message.error('无法解析保存的TTS配置');
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
    // 处理空值，使用默认配置
    if (config.azureKey === '') {
      config.azureKey = undefined; // 设为undefined，这样会使用默认值
    }
    if (config.azureRegion === '') {
      config.azureRegion = undefined;
    }
    if (config.googleKey === '') {
      config.googleKey = undefined;
    }
    if (config.gptSovitsUrl === '') {
      config.gptSovitsUrl = undefined;
    }

    const newConfig = { ...ttsConfig, ...config };
    setTTSConfig(newConfig);
    try {
      localStorage.setItem('tts_config', JSON.stringify(newConfig));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error('无法保存TTS配置到本地存储');
    }
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
    // 如果azureKey为空，则使用apiConfig中的默认值
    const azureKey = ttsConfig.azureKey || apiConfig.azure.apiKey || '';
    const azureRegion = ttsConfig.azureRegion || apiConfig.azure.region || '';

    try {
      if (!azureKey || !azureRegion) {
        message.error('Azure TTS服务配置不完整，请检查API密钥和区域设置');
        return;
      }

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const errorText = await response.text().catch(() => '未知错误');
        message.error(`语音合成失败: ${response.status} ${response.statusText}`);
        return;
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error('Azure语音合成失败，请检查API配置和网络连接');
    }
  };

  const speakWithGoogle = async (text: string, lang: string) => {
    // 如果googleKey为空，则使用apiConfig中的默认值
    const googleKey = ttsConfig.googleKey || apiConfig.google.apiKey || '';

    try {
      if (!googleKey) {
        message.error('Google TTS服务API密钥未配置');
        return;
      }

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

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const errorText = await response.text().catch(() => '未知错误');
        message.error(`语音合成失败: ${response.status} ${response.statusText}`);
        return;
      }

      const { audioContent } = await response.json();
      if (!audioContent) {
        message.error('语音合成失败: 响应中没有音频内容');
        return;
      }

      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);

      // 清理之前的音频
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }

      window.currentAudio = audio;
      await audio.play();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error('Google语音合成失败，请检查API配置和网络连接');
    }
  };

  const speakWithGPTSovits = async (text: string) => {
    try {
      // 如果gptSovitsUrl为空，则使用apiConfig中的默认值
      const gptSovitsUrl = ttsConfig.gptSovitsUrl || apiConfig.gptSovits.url || '';

      if (!gptSovitsUrl) {
        message.error('GPT-SoVITS服务地址未配置');
        return;
      }

      const response = await fetch(gptSovitsUrl, {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const errorText = await response.text().catch(() => '未知错误');
        message.error(`语音合成失败: ${response.status} ${response.statusText}`);
        return;
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      audio.onerror = (e) => {
        message.error('音频播放失败');
      };

      await audio.play();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error('GPT-SoVITS语音合成失败，请检查服务地址和网络连接');
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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