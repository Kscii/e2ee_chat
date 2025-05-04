import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './i18n' // 导入国际化配置
import './index.css'
// 导入 Ant Design 样式
import 'antd/dist/reset.css'
// 导入安全检查
import { enforceSecureConnection } from './utils/certificateValidator'

// 在生产环境下执行安全检查
if (import.meta.env.MODE === 'production') {
  enforceSecureConnection();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
