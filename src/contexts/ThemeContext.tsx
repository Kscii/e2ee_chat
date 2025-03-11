import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { theme } from 'antd';

// 主题类型
type ThemeMode = 'light' | 'dark';

// 主题上下文接口
interface ThemeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isDarkMode: boolean;
  algorithm?: any; // 添加algorithm属性
}

// 创建上下文
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// 主题提供者组件属性
interface ThemeProviderProps {
  children: ReactNode;
}

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
    // 更新body的背景色
    if (themeMode === 'dark') {
      document.body.style.backgroundColor = '#141414';
    } else {
      document.body.style.backgroundColor = '#f0f2f5';
    }
  }, [themeMode]);

  // 主题上下文值
  const contextValue: ThemeContextProps = {
    themeMode,
    toggleTheme,
    isDarkMode: themeMode === 'dark'
  };

  // 获取antd的主题算法
  const { darkAlgorithm, defaultAlgorithm } = theme;

  // 根据主题模式选择相应的算法并导出，供App.tsx使用
  const algorithm = themeMode === 'dark' ? darkAlgorithm : defaultAlgorithm;

  // 提供主题上下文和antd主题
  return (
    <ThemeContext.Provider value={{...contextValue, algorithm}}>
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