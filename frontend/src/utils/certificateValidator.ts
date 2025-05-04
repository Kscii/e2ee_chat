/**
 * 从环境变量获取证书指纹和公钥哈希值，如果不存在则使用硬编码的默认值
 * 这样可以在构建时通过环境变量注入这些值
 */
const TRUSTED_CERTIFICATE_FINGERPRINT = import.meta.env.VITE_CERT_FINGERPRINT ||
  '8fc2abc2e4aec03dfc9924ae1fada3e83efa483d3299fc88616dd08eedad1d12';
const TRUSTED_PUBLIC_KEY_HASH = import.meta.env.VITE_PUBLIC_KEY_HASH ||
  'fbfd19dab4c0165c9b964bc0e543d83f18477d79377335798c2d02f6617fabe9';

/**
 * 验证服务器域名和协议是否符合预期
 * 适用于无法直接访问证书信息的情况
 */
export const validateServerDomain = (): boolean => {
  // 确保API URL和预期域名匹配
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const trustedDomain = getTrustedDomain();
  
  // 在生产环境中进行严格验证
  if (import.meta.env.MODE === 'production') {
    return apiUrl.includes(trustedDomain) && 
          window.location.protocol === 'https:';
  }
  
  // 在开发环境中返回true
  return true;
};

/**
 * 获取受信任的域名
 */
export const getTrustedDomain = (): string => {
  return import.meta.env.VITE_TRUSTED_DOMAIN || 'kang-mi.com';
};

/**
 * 检查当前连接是否安全
 */
export const isConnectionSecure = (): boolean => {
  // 检查是否使用HTTPS
  const isHttps = window.location.protocol === 'https:';
  const trustedDomain = getTrustedDomain();
  
  // 检查是否连接到正确的域名
  const correctDomain = window.location.hostname === trustedDomain || 
                        import.meta.env.VITE_API_URL?.includes(trustedDomain);
  
  // 在生产环境中强制要求HTTPS和正确域名
  if (import.meta.env.MODE === 'production') {
    return isHttps && correctDomain;
  }
  
  // 在开发环境中允许HTTP和不同域名
  return true;
};

/**
 * 在应用初始化时进行连接安全检查
 */
export const enforceSecureConnection = (): void => {
  if (!isConnectionSecure()) {
    // 如果连接不安全，可以:
    // 1. 重定向到安全版本
    if (window.location.protocol !== 'https:') {
      window.location.href = window.location.href.replace('http:', 'https:');
      return;
    }
    // 2. 显示警告
    alert('警告：您的连接不安全。为保护账户安全，请确保连接到正确的服务器。');
  }
};

/**
 * 获取环境相关配置信息
 * 可用于调试环境配置问题
 */
export const getEnvironmentInfo = (): Record<string, string | boolean> => {
  return {
    mode: import.meta.env.MODE,
    apiUrl: import.meta.env.VITE_API_URL || 'not set',
    secureMode: import.meta.env.VITE_SECURE_MODE === 'true',
    trustedDomain: getTrustedDomain(),
    certFingerprint: TRUSTED_CERTIFICATE_FINGERPRINT.substring(0, 8) + '...',
    publicKeyHash: TRUSTED_PUBLIC_KEY_HASH.substring(0, 8) + '...',
    isProduction: import.meta.env.MODE === 'production',
    isHttps: window.location.protocol === 'https:',
    currentHostname: window.location.hostname
  };
}; 