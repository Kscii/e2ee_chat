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
  const { t, i18n } = useTranslation();

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

      // 获取当前语言
      const currentLanguage = i18n.language;
      let languageInstruction = "";

      // 根据当前语言设置对应的指令
      switch (currentLanguage) {
        case 'zh':
        case 'zh-CN':
          languageInstruction = "请使用中文回答所有问题。";
          break;
        case 'en':
          languageInstruction = "Please answer all questions in English.";
          break;
        case 'ja':
          languageInstruction = "すべての質問に日本語で答えてください。";
          break;
        case 'ko':
          languageInstruction = "모든 질문에 한국어로 대답해 주세요.";

          break;
        default:
          // 默认使用英语
          languageInstruction = "Please answer all questions in English.";
      }


      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `你是一个AI助手，你的名字是Sakiko。${languageInstruction} 请确保以用户所选的语言回答。当前语言设置为: ${currentLanguage}`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '抱歉，我现在无法回答这个问题。';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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