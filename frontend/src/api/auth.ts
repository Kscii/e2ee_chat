import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器添加token
apiClient.interceptors.request.use(
  (config) => {
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

// 用户注册
export const register = async (username: string, password: string, email: string, phone: string) => {
  try {
    const response = await apiClient.post('/register', {
      username,
      password,
      email,
      phone
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.error || '注册失败');
    }
    throw new Error('网络错误，请稍后重试');
  }
};

// 用户登录
export const login = async (username: string, password: string) => {
  try {
    const response = await apiClient.post('/login', {
      username,
      password
    });
    
    // 保存token到localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.error || '登录失败');
    }
    throw new Error('网络错误，请稍后重试');
  }
};

// 获取用户信息
export const getUserInfo = async () => {
  try {
    const response = await apiClient.get('/user');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      // 如果token失效，清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      throw new Error('登录已过期，请重新登录');
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