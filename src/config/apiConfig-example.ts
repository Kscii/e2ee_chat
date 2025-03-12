/**
 * API配置文件
 * 
 * 此文件用于存储默认的API密钥和服务地址
 * 如果不需要默认值，可以将对应的值设为空字符串
 */

interface APIConfig {
  // OpenAI API密钥
  gpt: {
    apiKey: string;
  };
  
  // Azure TTS服务配置
  azure: {
    apiKey: string;
    region: string;
  };
  
  // Google TTS服务配置
  google: {
    apiKey: string;
  };
  
  // GPT-SoVITS服务配置
  gptSovits: {
    url: string;
  };
}

// 默认API配置
const apiConfig: APIConfig = {
  gpt: {
    apiKey: "OPENAI_API_KEY_PLACEHOLDER"
  },
  azure: {
    apiKey: "AZURE_AI_SERVICES_KEY_PLACEHOLDER",
    region: "australiaeast"
  },
  google: {
    apiKey: "AIzaSyAPQwlQ-IHLzJtC5IAftcgjbFYx5PZt93c"
  },
  gptSovits: {
    url: "https://tts.kscii.tech/tts"
  }
};

export default apiConfig; 