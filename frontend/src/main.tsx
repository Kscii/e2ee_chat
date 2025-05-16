import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './i18n' // 导入国际化配置
import './index.css'
// 导入 Ant Design 样式
import 'antd/dist/reset.css'
// 导入安全检查
import { enforceSecureConnection, getEnvironmentInfo } from './utils/certificateValidator'
// 导入缓存管理器
import { initializeCache, destroyCache } from './utils/cacheManager'

// 在生产环境下执行安全检查
if (import.meta.env.MODE === 'production') {
  enforceSecureConnection();
} else {
  // 在开发环境下输出环境信息，帮助调试
  console.info('Development environment configuration:', getEnvironmentInfo());
}

// 初始化缓存管理器
initializeCache();

// 在应用卸载或页面关闭时清理资源
window.addEventListener('beforeunload', () => {
  destroyCache();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
