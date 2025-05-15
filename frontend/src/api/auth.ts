import axios, { AxiosError } from 'axios';
import { CryptoService } from '../utils/crypto';
import { validateServerDomain, verifyCertificate } from '../utils/certificateValidator';
import { clearSaltCache } from '../api/salt';
import { savePublicKey, savePrivateKey } from '../api/keys';

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

// 获取用户的密码哈希（仅用于验证）
const getUserPasswordHash = async (username: string): Promise<string> => {
  try {
    const response = await apiClient.get(`/user/passwordhash/${username}`);
    return response.data.password_hash;
  } catch (error) {
    console.error('获取密码哈希失败:', error);
    throw new Error('验证失败，无法获取用户信息');
  }
};

// 用户注册
export const register = async (username: string, password: string, email: string, phone: string) => {
  try {
    // 使用bcrypt生成密码哈希
    const bcryptHash = await CryptoService.generateBcryptHash(password);
    
    // 先生成密钥对，避免在注册成功后处理可能出现的错误
    console.log('注册前，预先生成密钥对...');
    const keyPair = CryptoService.generateKeyPair();
    const stringKeyPair = CryptoService.keyPairToString(keyPair);
    
    // 加密私钥
    console.log('加密私钥...');
    const encryptionKey = await CryptoService.generateEncryptionKey(password);
    const encryptedPrivateKey = await CryptoService.encryptPrivateKey(stringKeyPair.secretKey, password);
    
    // 保存密钥对到localStorage，以供后续使用
    localStorage.setItem('userKeyPair', JSON.stringify(stringKeyPair));
    localStorage.setItem('encryptionKey', CryptoService.keyToString(encryptionKey));
    
    // 服务器验证在拦截器中完成
    const response = await apiClient.post('/register', {
      username,
      password: bcryptHash,
      email,
      phone,
      is_hashed: true  // 告知服务器密码已哈希
    });
    
    // 注册成功后，保存用户名和加密的私钥到服务器
    if (response.status === 201) {
      // 保存用户名以便后续操作
      localStorage.setItem('username', username);
      
      // 清除盐值缓存，确保从服务器获取新的用户专属盐值
      clearSaltCache();
      
      // 尝试保存公钥和加密私钥到服务器
      try {
        console.log('保存公钥和加密私钥到服务器...');
        
        // 如果注册响应包含token，保存到localStorage用于API认证
        const token = response.data.token;
        if (token) {
          localStorage.setItem('token', token);
        } else {
          // 如果没有token，尝试登录获取token
          const loginData = await verifyServerBeforeLogin(username, password);
          if (loginData && loginData.token) {
            localStorage.setItem('token', loginData.token);
          }
        }
        
        // 保存公钥和加密私钥到服务器
        if (stringKeyPair && stringKeyPair.publicKey) {
          await savePublicKey(stringKeyPair.publicKey);
          await savePrivateKey(encryptedPrivateKey);
          console.log('密钥对成功保存到服务器');
        }
      } catch (error) {
        console.error('保存密钥到服务器失败，但注册流程已完成:', error);
        // 不因为保存密钥失败而中断注册流程
      }
    }
    
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
    // 首先获取存储的密码哈希
    const storedHash = await getUserPasswordHash(username);
    
    // 使用bcrypt在前端验证密码
    const isPasswordValid = await CryptoService.compareBcryptHash(password, storedHash);
    
    if (!isPasswordValid) {
      throw new Error('密码不正确');
    }
    
    // 在发送敏感信息前验证服务器证书
    const data = await verifyServerBeforeLogin(username, password);
    
    // 保存认证信息
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      
      // 清除盐值缓存，确保从服务器获取最新的用户专属盐值
      clearSaltCache();
      
      // 加载密钥对（不再是初始化，因为密钥对应当在注册时已创建）
      // 这一步会从localStorage检查现有密钥对，如果不存在会尝试从服务器恢复
      // 但不会创建新的密钥对，除非用户在完成注册后未能成功保存密钥对
      try {
        await CryptoService.initializeKeyPair(password);
      } catch (error) {
        console.error('加载密钥对失败，可能需要重置密钥:', error);
        // 不阻止登录流程，但记录错误以便调试
      }
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