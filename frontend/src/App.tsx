import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/login';
import ChatPage from './pages/chat';
import RegisterPage from './pages/register';
import SettingsPage from './pages/settings';
import ChannelPage from './pages/Channel/ChannelPage';
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
import { AuthProvider } from './contexts/AuthContext';
import { CryptoProvider } from './contexts/CryptoContext';
import PrivateRoute from './components/PrivateRoute';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import './i18n'; // 导入 i18n 配置
import './styles/theme.css';
import './App.css';
import { ServerProvider } from './contexts/ServerContext';

// Discord主题配置
const discordTheme = {
  light: {
    token: {
      colorPrimary: '#5865f2',
      colorBgBase: '#ffffff',
      colorTextBase: '#2e3338',
      borderRadius: 4,
    }
  },
  dark: {
    token: {
      colorPrimary: '#5865f2',
      colorBgBase: '#313338',
      colorTextBase: '#dbdee1',
      borderRadius: 4,
    }
  }
};

// 应用内容组件
const AppContent = () => {
  const { algorithm, themeMode } = useTheme();
  const { language } = useLanguage();
  const location = useLocation();

  // 根据当前语言选择 Ant Design 的语言包
  const antdLocale = language.startsWith('zh') ? zhCN : enUS;

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: algorithm,
        token: {
          ...discordTheme[themeMode].token,
        },
      }}
    >
      <TransitionGroup>
        <CSSTransition
          key={location.key}
          classNames="page-transition"
          timeout={300}
        >
          <Routes location={location}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              <Route index element={<Navigate to="/chat/groups" replace />} />
              <Route path="chat/:id?" element={<ChatPage />} />
              <Route path="channels" element={<ChannelPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="ai" element={<ChatPage />} />
            </Route>
          </Routes>
        </CSSTransition>
      </TransitionGroup>
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
            <AuthProvider>
              <CryptoProvider>
                <ServerProvider>
                  <MarkdownProvider>
                    <AvatarProvider>
                      <TTSProvider>
                        <AIProvider>
                          <Router>
                            <AppContent />
                          </Router>
                        </AIProvider>
                      </TTSProvider>
                    </AvatarProvider>
                  </MarkdownProvider>
                </ServerProvider>
              </CryptoProvider>
            </AuthProvider>
          </LanguageProvider>
        </APIProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}

export default App;
