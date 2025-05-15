import axios, { AxiosError } from 'axios';
import { CryptoService } from '../utils/crypto';
import { validateServerDomain, verifyCertificate } from '../utils/certificateValidator';
import { clearSaltCache, getUserEncryptionSalt } from '../api/salt';
import { savePublicKey, savePrivateKey, getPrivateKey } from '../api/keys';

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
    
    // 确保先设置username到localStorage，这样CryptoService可以使用正确的盐值
    console.log('注册时首先保存用户名到localStorage...');
    localStorage.setItem('username', username);
    
    // 先生成密钥对，避免在注册成功后处理可能出现的错误
    console.log('注册前，预先生成密钥对...');
    const keyPair = CryptoService.generateKeyPair();
    const stringKeyPair = CryptoService.keyPairToString(keyPair);
    
    // 派生加密密钥并保存到localStorage
    console.log('从密码派生加密密钥...');
    const encryptionKey = await CryptoService.generateEncryptionKey(password);
    localStorage.setItem('encryptionKey', CryptoService.keyToString(encryptionKey));
    
    // 使用派生的密钥加密私钥
    console.log('使用派生密钥加密私钥...');
    const encryptedPrivateKey = await CryptoService.encryptPrivateKeyWithKey(
      stringKeyPair.secretKey, 
      encryptionKey,
      await CryptoService['getEncryptionSalt']() // 获取当前盐值
    );
    
    // 保存密钥对到localStorage，以供后续使用
    localStorage.setItem('userKeyPair', JSON.stringify(stringKeyPair));
    
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
    // 临时保存密码用于解密
    localStorage.setItem('temp_password', password);
    
    // 服务器认证在拦截器中完成
    const response = await apiClient.post('/login', {
      username,
      password
    });
    
    const data = response.data;
    
    // 删除临时密码
    setTimeout(() => {
      localStorage.removeItem('temp_password');
    }, 60000); // 1分钟后删除
    
    // 保存认证信息
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      
      // 清除盐值缓存，确保从服务器获取最新的用户专属盐值
      clearSaltCache();
      
      console.log('[Auth] 登录成功，正在初始化加密服务...');
      console.log('[Auth] 用户名:', username);
      
      // 检查派生密钥是否存在
      const hasEncryptionKey = !!localStorage.getItem('encryptionKey');
      console.log('[Auth] 派生密钥状态:', hasEncryptionKey ? '已存在' : '不存在');
      
      // 检查本地密钥对是否存在
      const hasKeyPair = !!localStorage.getItem('userKeyPair');
      console.log('[Auth] 本地密钥对状态:', hasKeyPair ? '已存在' : '不存在');
      
      // 加载密钥对（不再是初始化，因为密钥对应当在注册时已创建）
      // 这一步会从localStorage检查现有密钥对，如果不存在会尝试从服务器恢复
      try {
        console.log('[Auth] 尝试初始化加密密钥...');
        
        // 始终派生一次加密密钥，确保即使清除了localStorage也能恢复
        if (password) {
          // 尝试直接使用密码恢复加密密钥
          console.log('[Auth] 从密码生成派生密钥...');
          // 预先尝试多种盐值
          await tryAllSaltVariations(username, password);
        }
        
        // 初始化密钥对（会尝试从服务器恢复，使用Blob中的盐值）
        await CryptoService.initializeKeyPair(password);
        console.log('[Auth] 密钥对初始化完成');
      } catch (error) {
        console.error('[Auth] 加载密钥对失败:', error);
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
    throw new Error('网络错误，请稍后重试');
  }
};

// 尝试使用多种盐值派生密钥，找到能成功解密的那个
async function tryAllSaltVariations(username: string, password: string) {
  console.log('[Auth] 尝试使用多种盐值派生密钥...');
  
  // 尝试从服务器获取加密的私钥
  try {
    const encryptedPrivateKey = await getPrivateKey();
    if (!encryptedPrivateKey) {
      console.log('[Auth] 服务器上没有加密私钥，跳过盐值测试');
      return;
    }
    
    // 首先获取服务器上的真实盐值
    let serverSalt;
    try {
      serverSalt = await getUserEncryptionSalt(username);
      console.log('[Auth] 成功从服务器获取用户加密盐值');
    } catch (error) {
      console.error('[Auth] 从服务器获取加密盐值失败:', error);
      serverSalt = null;
    }
    
    // 构建盐值列表，优先使用服务器的盐值
    const saltVariations = [];
    
    // 服务器盐值始终是最优先的选择
    if (serverSalt) {
      saltVariations.push(serverSalt);
    }
    
    // 备用盐值选项，仅当服务器盐值不可用或无法解密时使用
    saltVariations.push(
      'user_' + username + '_salt',   // 基于用户名的盐值
      'fallback_encryption_salt',     // 默认盐值
      username,                       // 直接使用用户名
      'INFO2222_default_salt'         // 应用默认盐值
    );
    
    let successSalt = null;
    
    for (let i = 0; i < saltVariations.length; i++) {
      try {
        const salt = saltVariations[i];
        console.log(`[Auth] 尝试盐值变体 ${i+1}/${saltVariations.length}: ${salt.substring(0, 10)}...`);
        
        // 临时置换CryptoService的盐值缓存
        CryptoService['encryptionSalt'] = salt;
        
        // 从密码生成加密密钥
        const encryptionKey = await CryptoService.generateEncryptionKey(password);
        
        // 尝试解密
        const decryptedKey = await CryptoService.decryptPrivateKeyWithKey(encryptedPrivateKey, encryptionKey);
        
        if (decryptedKey) {
          console.log(`[Auth] 成功找到匹配的盐值: ${salt.substring(0, 10)}...`);
          successSalt = salt;
          
          // 保存派生的密钥到本地存储，但不保存盐值
          localStorage.setItem('encryptionKey', CryptoService.keyToString(encryptionKey));
          
          // 如果成功的盐值不是服务器盐值，记录警告
          if (serverSalt && salt !== serverSalt) {
            console.warn('[Auth] 警告: 成功的盐值与服务器盐值不匹配，可能存在数据不一致');
          }
          
          break;
        }
      } catch (error) {
        console.warn(`[Auth] 盐值变体 ${i+1} 解密失败:`, error);
      }
    }
    
    if (successSalt) {
      console.log('[Auth] 发现有效盐值，已保存派生密钥'); 
    } else {
      console.warn('[Auth] 所有盐值变体均无法解密私钥');
    }
  } catch (error) {
    console.error('[Auth] 从服务器获取私钥失败:', error);
  }
}

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