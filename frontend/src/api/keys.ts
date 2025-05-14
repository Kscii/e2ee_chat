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
  if (cachedSalts && 'encryption_salt' in cachedSalts && 'auth_salt' in cachedSalts) {
    return cachedSalts;
  }

  try {
    const response = await apiClient.get('/system/salts');
    const responseData = response.data.salts;
    
    // 验证响应数据是否符合SystemSalts接口要求
    if (responseData && 
        typeof responseData === 'object' && 
        'encryption_salt' in responseData && 
        'auth_salt' in responseData) {
      
      // 使用类型断言确保类型安全
      const salts = responseData as SystemSalts;
      cachedSalts = salts;
      return salts;
    } else {
      throw new Error('服务器返回的盐值格式不正确');
    }
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