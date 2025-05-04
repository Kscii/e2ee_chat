import axios, { AxiosError } from 'axios';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: import.meta.env.VITE_SECURE_MODE === 'true' // 允许跨域请求携带凭证
});

// 请求拦截器添加token
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 用户公钥信息接口
export interface PublicKeyInfo {
  username: string;
  publicKey: string;
}

// 保存用户公钥
export const savePublicKey = async (publicKey: string): Promise<void> => {
  try {
    await apiClient.post('/keys', { publicKey });
  } catch (error) {
    console.error('保存公钥失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('保存公钥失败，请稍后重试');
  }
};

// 获取指定用户的公钥
export const getUserPublicKey = async (username: string): Promise<string> => {
  try {
    const response = await apiClient.get(`/keys/${username}`);
    return response.data.publicKey;
  } catch (error) {
    console.error(`获取用户 ${username} 的公钥失败:`, error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error(`无法获取用户 ${username} 的公钥`);
  }
};

// 获取所有用户的公钥
export const getAllPublicKeys = async (): Promise<PublicKeyInfo[]> => {
  try {
    const response = await apiClient.get('/keys');
    return response.data.keys;
  } catch (error) {
    console.error('获取所有公钥失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取用户公钥列表失败');
  }
};

// 本地缓存公钥
const publicKeyCache: Map<string, string> = new Map();

// 从缓存或服务器获取用户公钥
export const getOrFetchPublicKey = async (username: string): Promise<string> => {
  // 先检查缓存
  if (publicKeyCache.has(username)) {
    return publicKeyCache.get(username)!;
  }
  
  // 从服务器获取
  const publicKey = await getUserPublicKey(username);
  // 缓存结果
  publicKeyCache.set(username, publicKey);
  return publicKey;
}; 