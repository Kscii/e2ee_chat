import axios, { AxiosError } from 'axios';
import { CryptoService } from '../utils/crypto';
import { apiClient } from './client';

// 定义API响应类型
interface ApiErrorResponse {
  error: string;
}

interface LoginResponse {
  message: string;
  username: string;
  token: string;
}

interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  created_at?: string;
  last_login?: string;
}

interface UsersResponse {
  users: User[];
}

// 用户注册
export const register = async (username: string, password: string, email: string, phone: string) => {
  try {
    // 对密码进行哈希用于服务器认证，而不发送明文密码
    const passwordHash = await CryptoService.generateAuthHash(password);
    
    const response = await apiClient.post('/register', {
      username,
      password: passwordHash,
      email,
      phone,
      is_hashed: true  // 告知服务器密码已经哈希处理
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error || '注册失败');
      }
    }
    throw new Error('网络错误，请稍后重试');
  }
};

// 用户登录
export const login = async (username: string, password: string) => {
  try {
    // 对密码进行哈希用于服务器认证，而不发送明文密码
    const passwordHash = await CryptoService.generateAuthHash(password);
    
    const response = await apiClient.post<LoginResponse>('/login', {
      username,
      password: passwordHash,
      is_hashed: true  // 告知服务器密码已经哈希处理
    });
    
    // 保存token到localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
    }
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error || '登录失败');
      }
    }
    throw new Error('网络错误，请稍后重试');
  }
};

// 获取所有用户列表
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get<UsersResponse>('/users');
    return response.data.users;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response && axiosError.response.status === 401) {
        // 如果token失效，清除本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        throw new Error('登录已过期，请重新登录');
      }
    }
    console.error('获取用户列表失败:', error);
    return []; // 返回空数组而不是抛出错误，使应用更健壮
  }
};

// 获取用户信息
export const getUserInfo = async () => {
  try {
    const response = await apiClient.get('/user');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response && axiosError.response.status === 401) {
        // 如果token失效，清除本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        throw new Error('登录已过期，请重新登录');
      }
    }
    throw new Error('获取用户信息失败');
  }
};

// 退出登录
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
};

// 检查是否已登录
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
}; 