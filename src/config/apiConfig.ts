/**
 * API配置文件示例
 * 
 * 此文件是apiConfig.ts的示例，用于分享代码时使用
 * 请复制此文件并重命名为apiConfig.ts，然后填入你的API密钥和服务地址
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
    apiKey: "" // 填入你的OpenAI API密钥
  },
  azure: {
    apiKey: "", // 填入你的Azure API密钥
    region: "" // 填入你的Azure区域，例如：eastus, westus, australiaeast等
  },
  google: {
    apiKey: "" // 填入你的Google API密钥
  },
  gptSovits: {
    url: "" // 填入你的GPT-SoVITS服务URL，例如：http://127.0.0.1:5000/tts
  }
};

export default apiConfig; 