import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/login';
import ChatPage from './pages/chat';
import ProfilePage from './pages/profile';
import RegisterPage from './pages/register';
import SettingsPage from './pages/settings';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import enUS from 'antd/lib/locale/en_US';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { MarkdownProvider } from './contexts/MarkdownContext';
import { AvatarProvider } from './contexts/AvatarContext';
import { TTSProvider } from './contexts/TTSContext';
import { AIProvider } from './contexts/AIContext';
import { APIProvider } from './contexts/APIContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import './i18n'; // 导入 i18n 配置
import './App.css';

// 应用内容组件
const AppContent = () => {
  const { algorithm } = useTheme();
  const { language } = useLanguage();
  
  // 根据当前语言选择 Ant Design 的语言包
  const antdLocale = language.startsWith('zh') ? zhCN : enUS;
  
  return (
    <ConfigProvider 
      locale={antdLocale} 
      theme={{
        algorithm: algorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat/:id?" element={<ChatPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="ai" element={<ChatPage />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

// 主应用组件
function App() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <APIProvider>
          <LanguageProvider>
            <MarkdownProvider>
              <AvatarProvider>
                <TTSProvider>
                  <AIProvider>
                    <AppContent />
                  </AIProvider>
                </TTSProvider>
              </AvatarProvider>
            </MarkdownProvider>
          </LanguageProvider>
        </APIProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}

export default App;
