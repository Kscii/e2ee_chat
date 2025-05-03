import React, { createContext, useState, useContext, ReactNode } from 'react';

// Markdown上下文接口
interface MarkdownContextProps {
  markdownMode: boolean;
  toggleMarkdownMode: () => void;
}

// 创建上下文
const MarkdownContext = createContext<MarkdownContextProps | undefined>(undefined);

// Markdown提供者组件属性
interface MarkdownProviderProps {
  children: ReactNode;
}

// Markdown提供者组件
export const MarkdownProvider: React.FC<MarkdownProviderProps> = ({ children }) => {
  // 从本地存储中获取Markdown模式状态，如果没有则默认为关闭
  const [markdownMode, setMarkdownMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('markdownMode');
    return savedMode === 'true';
  });

  // 切换Markdown模式
  const toggleMarkdownMode = () => {
    setMarkdownMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('markdownMode', String(newMode));
      return newMode;
    });
  };

  // Markdown上下文值
  const contextValue: MarkdownContextProps = {
    markdownMode,
    toggleMarkdownMode
  };

  // 提供Markdown上下文
  return (
    <MarkdownContext.Provider value={contextValue}>
      {children}
    </MarkdownContext.Provider>
  );
};

// 自定义钩子，用于在组件中访问Markdown上下文
export const useMarkdown = (): MarkdownContextProps => {
  const context = useContext(MarkdownContext);
  if (!context) {
    throw new Error('useMarkdown must be used within a MarkdownProvider');
  }
  return context;
}; 