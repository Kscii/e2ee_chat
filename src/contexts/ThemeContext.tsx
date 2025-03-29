import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { theme } from 'antd';

// 主题类型
type ThemeMode = 'light' | 'dark';

// 主题上下文接口
interface ThemeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isDarkMode: boolean;
  algorithm?: any;
}

// 创建上下文
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// 主题提供者组件属性
interface ThemeProviderProps {
  children: ReactNode;
}

// Discord主题配置
const discordTheme = {
  light: {
    backgroundColor: '#ffffff',
    antdAlgorithm: theme.defaultAlgorithm,
    antdToken: {
      colorPrimary: '#5865f2',
      colorBgBase: '#ffffff',
      colorTextBase: '#2e3338',
    }
  },
  dark: {
    backgroundColor: '#313338',
    antdAlgorithm: theme.darkAlgorithm,
    antdToken: {
      colorPrimary: '#5865f2',
      colorBgBase: '#313338',
      colorTextBase: '#dbdee1',
    }
  }
};

// 主题提供者组件
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 从本地存储中获取主题模式，如果没有则默认为亮色模式
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('themeMode');
    return (savedTheme as ThemeMode) || 'light';
  });

  // 切换主题
  const toggleTheme = () => {
    setThemeMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  // 监听主题变化，更新HTML根元素的data-theme属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    // 更新body的背景色为Discord风格
    document.body.style.backgroundColor = discordTheme[themeMode].backgroundColor;
  }, [themeMode]);

  // 主题上下文值
  const contextValue: ThemeContextProps = {
    themeMode,
    toggleTheme,
    isDarkMode: themeMode === 'dark',
    algorithm: discordTheme[themeMode].antdAlgorithm,
  };

  // 提供主题上下文和antd主题
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义钩子，用于在组件中访问主题上下文
export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 