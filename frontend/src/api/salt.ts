import axios from 'axios';
import { apiClient } from './client';

// 盐值接口
export interface SystemSalts {
  encryption_salt: string;
  auth_salt: string;
  [key: string]: string;
}

// 用于缓存盐值，避免频繁请求
let cachedSalts: SystemSalts | null = null;

/**
 * 从服务器获取系统盐值
 * @returns 返回包含所有盐值的对象
 */
export const getSystemSalts = async (): Promise<SystemSalts> => {
  // 如果已经有缓存的盐值，直接返回
  if (cachedSalts) {
    return cachedSalts;
  }

  try {
    const response = await apiClient.get('/system/salts');
    cachedSalts = response.data.salts;
    return cachedSalts;
  } catch (error) {
    console.error('获取系统盐值失败:', error);
    
    // 如果请求失败，返回默认盐值（仅作为临时后备方案）
    const defaultSalts: SystemSalts = {
      encryption_salt: 'fallback_encryption_salt_value',
      auth_salt: 'fallback_auth_salt_value'
    };
    
    return defaultSalts;
  }
};

/**
 * 清除盐值缓存，强制下次调用重新获取
 */
export const clearSaltCache = () => {
  cachedSalts = null;
}; 