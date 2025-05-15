import axios, { AxiosError } from 'axios';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 定义盐值接口
export interface SystemSalts {
  encryption_salt: string;
  auth_salt?: string;  // 已废弃，保留兼容性
}

// 缓存的盐值
let cachedSalt: string | null = null;

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器添加token
apiClient.interceptors.request.use(
  async (config) => {
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

// 获取用户私钥加密盐值
export const getUserEncryptionSalt = async (username: string): Promise<string> => {
  // 如果已经有缓存的盐值，直接返回
  if (cachedSalt) {
    return cachedSalt;
  }

  try {
    const response = await apiClient.get(`/user/encryption-salt/${username}`);
    const salt = response.data.encryption_salt;
    if (salt) {
      cachedSalt = salt;
      return salt;
    }
    throw new Error('服务器返回了空的盐值');
  } catch (error) {
    console.error('获取用户加密盐值失败:', error);
    
    // 如果请求失败，返回默认盐值（仅作为临时后备方案）
    const fallbackSalt = 'fallback_encryption_salt_value';
    return fallbackSalt;
  }
};

// 以下方法已弃用，仅保留API兼容性
export const getSystemSalts = async (): Promise<SystemSalts> => {
  // 从localStorage获取用户名
  const username = localStorage.getItem('username');
  
  if (!username) {
    // 如果没有用户名，返回默认盐值
    return {
      encryption_salt: 'fallback_encryption_salt_value'
    };
  }
  
  try {
    // 使用新API获取用户私钥加密盐
    const salt = await getUserEncryptionSalt(username);
    
    // 保持API兼容性，返回旧格式
    return {
      encryption_salt: salt
    };
  } catch (error) {
    console.error('获取系统盐值失败:', error);
    
    // 如果请求失败，返回默认盐值
    return {
      encryption_salt: 'fallback_encryption_salt_value'
    };
  }
};

/**
 * 清除盐值缓存，强制下次调用重新获取
 */
export const clearSaltCache = () => {
  cachedSalt = null;
}; 