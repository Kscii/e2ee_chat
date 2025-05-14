import axios, { AxiosError } from 'axios';
import { CryptoService } from '../utils/crypto';
import { validateServerDomain, verifyCertificate } from '../utils/certificateValidator';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: import.meta.env.VITE_SECURE_MODE === 'true' // 允许跨域请求携带凭证
});

// 请求拦截器添加token和验证服务器
apiClient.interceptors.request.use(
  async (config) => {
    // 生产环境下验证域名和协议
    if (import.meta.env.MODE === 'production') {
      if (!validateServerDomain()) {
        throw new Error('服务器验证失败，为保护您的账户安全，已阻止请求');
      }
    }
    
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

// 在登录前验证服务器证书
const verifyServerBeforeLogin = async (username: string, password: string): Promise<LoginResponse> => {
  if (import.meta.env.MODE === 'production' && import.meta.env.VITE_SECURE_MODE === 'true') {
    const isVerified = await verifyCertificate();
    if (!isVerified) {
      throw new Error('服务器证书验证失败，为保护您的账户安全，已阻止登录请求');
    }
  }
  
  // 证书验证通过后，发送登录请求
  const response = await apiClient.post<LoginResponse>('/login', {
    username,
    password
  });
  
  return response.data;
};

// 用户注册
export const register = async (username: string, password: string, email: string, phone: string) => {
  try {
    // 服务器验证在拦截器中完成
    const response = await apiClient.post('/register', {
      username,
      password,
      email,
      phone
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
    // 在发送敏感信息前验证服务器证书
    const data = await verifyServerBeforeLogin(username, password);
    
    // 保存认证信息
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
    }
    
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error || '登录失败');
      }
    }
    throw new Error(error instanceof Error ? error.message : '网络错误，请稍后重试');
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