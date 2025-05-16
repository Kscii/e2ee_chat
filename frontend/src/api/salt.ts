import axios, { AxiosError } from 'axios';
import { getCache, setCache, removeCache } from '../utils/cacheManager';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 定义盐值接口
export interface SystemSalts {
  encryption_salt: string;
}

// 盐值缓存键
const SALT_CACHE_KEY = 'user_encryption_salt';

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
    const token = getCache<string>('token');
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
  // 检查是否有缓存的盐值
  const cachedSalt = getCache<string>(`${SALT_CACHE_KEY}_${username}`);
  if (cachedSalt) {
    console.log(`[SaltAPI] 使用缓存的盐值: ${cachedSalt.substring(0, 8)}...`);
    return cachedSalt;
  }

  try {
    console.log(`[SaltAPI] 从服务器获取用户 ${username} 的盐值`);
    const response = await apiClient.get(`/user/encryption-salt/${username}`);
    const salt = response.data.encryption_salt;
    
    if (salt) {
      console.log(`[SaltAPI] 获取到盐值: ${salt.substring(0, 8)}...`);
      // 缓存盐值，使用用户名作为键的一部分以支持多用户
      setCache(`${SALT_CACHE_KEY}_${username}`, salt);
      return salt;
    }
    
    throw new Error('服务器返回了空的盐值');
  } catch (error) {
    console.error('[SaltAPI] 获取用户加密盐值失败:', error);
    
    // 如果请求失败，返回默认盐值（仅作为临时后备方案）
    const fallbackSalt = 'fallback_encryption_salt_value';
    console.warn('[SaltAPI] 使用备用盐值:', fallbackSalt.substring(0, 8) + '...');
    return fallbackSalt;
  }
};

/**
 * 清除盐值缓存，强制下次调用重新获取
 * @param username 特定用户名，如果提供，只清除该用户的盐值缓存
 */
export const clearSaltCache = (username?: string): void => {
  if (username) {
    // 清除特定用户的盐值缓存
    removeCache(`${SALT_CACHE_KEY}_${username}`);
    console.log(`[SaltAPI] 已清除用户 ${username} 的盐值缓存`);
  } else {
    // 清除所有盐值缓存（查找所有以SALT_CACHE_KEY开头的键）
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SALT_CACHE_KEY)) {
        removeCache(key);
      }
    }
    console.log('[SaltAPI] 已清除所有盐值缓存');
  }
};

/**
 * 设置用户加密盐值
 * @param username 用户名
 * @param salt 盐值
 * @returns 保存的盐值
 */
export const setUserEncryptionSalt = async (username: string, salt: string): Promise<string> => {
  try {
    console.log(`[SaltAPI] 设置用户 ${username} 的盐值: ${salt.substring(0, 8)}...`);
    const response = await apiClient.post(`/user/encryption-salt/${username}`, {
      salt: salt
    });
    
    // 更新缓存
    setCache(`${SALT_CACHE_KEY}_${username}`, salt);
    
    return salt;
  } catch (error) {
    console.error('[SaltAPI] 设置用户加密盐值失败:', error);
    throw error;
  }
}; 