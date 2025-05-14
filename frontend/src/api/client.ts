import axios from 'axios';
import { validateServerDomain, verifyCertificate } from '../utils/certificateValidator';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 证书验证状态
let certificateVerified = false;

// 创建axios实例
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // 在浏览器环境中，不需要显式配置HTTPS证书验证
  // 浏览器会自动处理证书验证
  withCredentials: import.meta.env.VITE_SECURE_MODE === 'true' // 允许跨域请求携带凭证
});

// 请求拦截器添加token和验证服务器
apiClient.interceptors.request.use(
  async (config) => {
    // 在生产环境下验证服务器证书
    if (import.meta.env.MODE === 'production' && import.meta.env.VITE_SECURE_MODE === 'true') {
      // 首次发送请求前验证证书，之后使用缓存结果
      if (!certificateVerified) {
        const isVerified = await verifyCertificate();
        if (!isVerified) {
          throw new Error('服务器证书验证失败，为保护您的账户安全，已阻止请求');
        }
        // 记录验证状态，避免每次请求都验证
        certificateVerified = true;
      }
      
      // 域名和协议验证（作为额外的安全层）
      if (!validateServerDomain()) {
        throw new Error('服务器域名验证失败，为保护您的账户安全，已阻止请求');
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

// 导出API客户端以供其他模块使用
export default apiClient; 