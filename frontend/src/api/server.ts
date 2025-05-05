import axios, { AxiosError } from 'axios';
import { validateServerDomain } from '../utils/certificateValidator';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 服务器相关类型定义
export interface Server {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  owner_username: string;
  avatar?: string;
  created_at: string;
  updated_at?: string;
  member_count?: number;
  members?: ServerMember[];
}

export interface ServerMember {
  id: number;
  username: string;
  email?: string;
  joined_at: string;
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
  (config) => {
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

// 获取用户所属的所有服务器
export const getAllServers = async (): Promise<Server[]> => {
  try {
    const response = await apiClient.get('/servers');
    return response.data.servers;
  } catch (error) {
    console.error('获取服务器列表失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取服务器列表失败，请稍后重试');
  }
};

// 获取单个服务器的详细信息
export const getServer = async (serverId: number): Promise<Server> => {
  try {
    const response = await apiClient.get(`/servers/${serverId}`);
    return response.data;
  } catch (error) {
    console.error('获取服务器详情失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取服务器详情失败，请稍后重试');
  }
};

// 创建新服务器
export const createServer = async (
  name: string, 
  description?: string, 
  avatar?: string
): Promise<Server> => {
  try {
    const response = await apiClient.post('/servers', {
      name,
      description,
      avatar
    });
    return response.data;
  } catch (error) {
    console.error('创建服务器失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('创建服务器失败，请稍后重试');
  }
};

// 更新服务器信息
export const updateServer = async (
  serverId: number, 
  data: {
    name?: string;
    description?: string;
    avatar?: string;
  }
): Promise<void> => {
  try {
    await apiClient.put(`/servers/${serverId}`, data);
  } catch (error) {
    console.error('更新服务器信息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('更新服务器信息失败，请稍后重试');
  }
};

// 添加成员到服务器
export const addServerMember = async (
  serverId: number, 
  username: string
): Promise<void> => {
  try {
    await apiClient.post(`/servers/${serverId}/members`, {
      username
    });
  } catch (error) {
    console.error('添加服务器成员失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('添加服务器成员失败，请稍后重试');
  }
}; 