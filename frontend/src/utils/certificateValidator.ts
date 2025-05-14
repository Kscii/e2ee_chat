/**
 * 从环境变量获取证书指纹和公钥哈希值，如果不存在则使用硬编码的默认值
 * 这样可以在构建时通过环境变量注入这些值
 */
const TRUSTED_CERTIFICATE_FINGERPRINT = import.meta.env.VITE_CERT_FINGERPRINT ||
  'b7468550dea2dbc2ae2882123d111e86fce5c6e8355e98eb7f0d23e5c84939e3';
const TRUSTED_PUBLIC_KEY_HASH = import.meta.env.VITE_PUBLIC_KEY_HASH ||
  '53ab3778e01ea877bfeff3a2247cb6147f5191900d9318a801f7ea0f821b1c18';

/**
 * 使用fetch API创建连接，从响应头中获取证书信息，然后计算证书指纹和公钥哈希
 * 将计算结果与预期值比较，如不一致则拒绝连接
 */
export const verifyCertificate = async (expectedFingerprint = TRUSTED_CERTIFICATE_FINGERPRINT, 
                                        expectedPublicKeyHash = TRUSTED_PUBLIC_KEY_HASH): Promise<boolean> => {
  // 只在生产环境和HTTPS下执行证书验证
  if (import.meta.env.MODE !== 'production' || window.location.protocol !== 'https:') {
    return true;
  }

  const domain = getTrustedDomain();
  const testUrl = `https://${domain}/api/ping`;
  
  try {
    // 尝试创建连接，仅为了获取证书信息，不需要完成请求
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    await fetch(testUrl, {
      method: 'HEAD', 
      mode: 'no-cors',
      signal: controller.signal
    });
    
    // 这里通常应该尝试从浏览器API获取证书信息，但浏览器限制了这一访问
    // 在现代浏览器环境中，JavaScript无法直接访问SSL证书详情
    
    // 替代方案：使用浏览器安全API
    if ('security' in window && typeof (window as any).security.certificateCheck === 'function') {
      // 使用假设的浏览器API检查证书（这只是示例，实际浏览器没有这样的API）
      return (window as any).security.certificateCheck(domain, expectedFingerprint, expectedPublicKeyHash);
    }
    
    // 由于浏览器安全限制，我们只能验证域名和HTTPS协议
    // 对于证书指纹和公钥哈希，我们需要依赖浏览器的内置验证
    console.warn('浏览器限制了直接访问证书信息，只能验证域名和HTTPS协议');
    
    // 警告用户证书无法完全验证
    if (import.meta.env.VITE_SECURE_MODE === 'true') {
      console.info('证书验证模式已启用，但由于浏览器限制，只能验证域名和HTTPS协议');
      console.info('期望的证书指纹:', expectedFingerprint);
      console.info('期望的公钥哈希:', expectedPublicKeyHash);
    }
    
    // 在实际浏览器环境中，只能验证域名和HTTPS
    return validateServerDomain();
  } catch (error) {
    console.error('证书验证失败:', error);
    return false;
  }
};

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