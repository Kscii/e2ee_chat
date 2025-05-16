import axios, { AxiosError } from 'axios';
import { CryptoService } from '../utils/crypto';
import { validateServerDomain, verifyCertificate } from '../utils/certificateValidator';
import { clearSaltCache, getUserEncryptionSalt, setUserEncryptionSalt } from '../api/salt';
import { savePublicKey, savePrivateKey, getPrivateKey, getUserPublicKey } from '../api/keys';
import { setCache, getCache, clearAllCache, resetCacheOnLogin } from '../utils/cacheManager';

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
    console.log('[AuthAPI] 开始注册流程...');
    
    // 首先重置所有缓存，确保清洁环境
    resetCacheOnLogin(username);
    
    // 1. 在前端生成用户专属盐值
    console.log('[AuthAPI] 生成用户专属盐值');
    const salt = CryptoService.generateSalt();
    console.log('[AuthAPI] 盐值生成成功:', salt.substring(0, 8) + '...');
    
    // 2. 使用密码和盐值生成哈希值1（SHA-256）- 第一层哈希
    console.log('[AuthAPI] 使用密码和盐值生成第一层哈希(SHA-256)');
    const hash1 = await CryptoService.generateHash1(password, salt);
    
    // 3. 生成E2EE密钥对
    console.log('[AuthAPI] 生成端到端加密密钥对');
    const keyPair = CryptoService.generateKeyPair();
    const stringKeyPair = CryptoService.keyPairToString(keyPair);
    
    // 4. 派生加密密钥用于保护私钥
    console.log('[AuthAPI] 从密码派生加密密钥');
    const encryptionKey = await CryptoService.generateEncryptionKey(password, salt);
    setCache('encryptionKey', CryptoService.keyToString(encryptionKey));
    
    // 5. 使用派生的密钥加密私钥
    console.log('[AuthAPI] 加密私钥');
    const encryptedPrivateKey = await CryptoService.encryptPrivateKey(
      stringKeyPair.secretKey, 
      password,
      salt
    );
    
    // 6. 保存密钥对到缓存
    setCache('userKeyPair', stringKeyPair);
    
    // 7. 发送哈希值1到服务器进行注册
    console.log('[AuthAPI] 发送第一层哈希到服务器，服务器将添加pepper并使用bcrypt再次哈希');
    const response = await apiClient.post('/register', {
      username,
      password: hash1,  // 发送第一层哈希
      email,
      phone,
      is_hashed: true   // 告知服务器密码已哈希
    });
    
    // 8. 如果注册成功且返回token，保存身份验证信息
    if (response.status === 201) {
      const token = response.data.token;
      if (token) {
        setCache('token', token);
        
        // 9. 保存公钥、加密的私钥和盐值到服务器
        console.log('[AuthAPI] 保存公钥、加密私钥和盐值到服务器');
        try {
          // 保存公钥
          await savePublicKey(stringKeyPair.publicKey);
          // 保存加密的私钥
          await savePrivateKey(encryptedPrivateKey);
          // 保存盐值到服务器
          await setUserEncryptionSalt(username, salt);
          console.log('[AuthAPI] 所有密钥和盐值保存成功');
        } catch (error) {
          console.error('[AuthAPI] 保存密钥或盐值到服务器失败:', error);
        }
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
    console.log('[AuthAPI] 开始登录流程...');
    
    // 重置缓存，保留用户名
    resetCacheOnLogin(username);
    
    // 清除特定用户的盐值缓存，确保获取最新值
    clearSaltCache(username);
    
    // 1. 从服务器获取用户盐值（仅获取，不创建）
    console.log('[AuthAPI] 获取用户盐值');
    const salt = await getUserEncryptionSalt(username);
    if (!salt) {
      throw new Error('用户不存在或无法获取盐值');
    }
    
    // 2. 使用密码和盐值生成哈希值1（SHA-256）- 第一层哈希
    console.log('[AuthAPI] 使用密码和盐值生成第一层哈希(SHA-256)');
    const hash1 = await CryptoService.generateHash1(password, salt);
    
    // 3. 派生加密密钥用于解密私钥
    console.log('[AuthAPI] 从密码派生加密密钥');
    const encryptionKey = await CryptoService.generateEncryptionKey(password, salt);
    setCache('encryptionKey', CryptoService.keyToString(encryptionKey));
    
    // 4. 将哈希值1发送到服务器进行验证（服务器会添加pepper并与存储的bcrypt哈希比较）
    console.log('[AuthAPI] 发送第一层哈希到服务器进行验证');
    const response = await apiClient.post('/login', {
      username,
      password: hash1,
      is_hashed: true
    });
    
    const data = response.data;
    
    // 5. 登录成功后，尝试获取和解密私钥
    if (data.token) {
      setCache('token', data.token);
      
      try {
        // 6. 获取加密的私钥并解密
        console.log('[AuthAPI] 获取并解密私钥');
        const encryptedPrivateKey = await getPrivateKey();
        if (encryptedPrivateKey) {
          const decryptedKey = await CryptoService.decryptPrivateKey(encryptedPrivateKey, password);
          
          if (decryptedKey) {
            // 7. 获取公钥并构建密钥对
            const publicKey = await getUserPublicKey(username);
            if (publicKey) {
              const keyPair = {
                publicKey: publicKey,
                secretKey: decryptedKey
              };
              
              // 保存密钥对到缓存
              setCache('userKeyPair', keyPair);
              console.log('[AuthAPI] 密钥对恢复成功');
            }
          }
        }
      } catch (error) {
        console.error('[AuthAPI] 获取或解密私钥失败:', error);
        // 不中断登录流程
      }
    }
    
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.data) {
        console.error('[AuthAPI] 登录失败:', axiosError.response.data);
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
        // 如果token失效，清除所有缓存
        clearAllCache();
        throw new Error('登录已过期，请重新登录');
      }
    }
    console.error('[AuthAPI] 获取用户列表失败:', error);
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
        // 如果token失效，清除所有缓存
        clearAllCache();
        throw new Error('登录已过期，请重新登录');
      }
    }
    throw new Error('获取用户信息失败');
  }
};

// 退出登录
export const logout = () => {
  console.log('[AuthAPI] 用户登出，清除所有缓存');
  // 清除所有本地缓存
  clearAllCache();
};

// 检查是否已登录
export const isAuthenticated = () => {
  return !!getCache<string>('token');
}; 