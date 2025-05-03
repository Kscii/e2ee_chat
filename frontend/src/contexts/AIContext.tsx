import React, { createContext, useContext, useState } from 'react';
import OpenAI from 'openai';
import { useAPI } from './APIContext';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';


interface AIContextType {
  aiEnabled: boolean;
  toggleAI: () => void;
  sendMessage: (content: string) => Promise<string>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiEnabled, setAIEnabled] = useState(true);
  const { apiKey } = useAPI();
  const { t } = useTranslation();

  const toggleAI = () => {
    setAIEnabled(!aiEnabled);
  };

  const sendMessage = async (content: string): Promise<string> => {
    if (!apiKey) {
      message.error(t('errors.api.configMissing'));
      return '';
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: "" //提示词
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '抱歉，我现在无法回答这个问题。';
    } catch (error) {
      console.error('OpenAI API error:', error);
      message.error(t('errors.api.requestFailed'));
      return t('errors.api.requestFailed');
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