import React, { createContext, useContext, useState } from 'react';
import OpenAI from 'openai';
import { useAPI } from './APIContext';
import { message } from 'antd';

interface AIContextType {
  aiEnabled: boolean;
  toggleAI: () => void;
  sendMessage: (content: string) => Promise<string>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiEnabled, setAIEnabled] = useState(true);
  const { apiKey } = useAPI();

  const toggleAI = () => {
    setAIEnabled(!aiEnabled);
  };

  const sendMessage = async (content: string): Promise<string> => {
    if (!apiKey) {
      message.error('请先在设置页面配置OpenAI API Key');
      return '';
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '抱歉，我现在无法回答这个问题。';
    } catch (error) {
      console.error('OpenAI API error:', error);
      message.error('AI助手出现错误，请检查您的API Key是否正确');
      return '抱歉，发生了一些错误。请检查您的API Key是否正确。';
    }
  };

  return (
    <AIContext.Provider value={{ aiEnabled, toggleAI, sendMessage }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}; 