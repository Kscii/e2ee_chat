import React, { createContext, useContext, useState, useEffect } from 'react';

interface APIContextType {
  apiKey: string;
  setAPIKey: (key: string) => void;
}

const DEFAULT_API_KEY = '';

const APIContext = createContext<APIContextType | undefined>(undefined);

export const APIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setAPIKey] = useState<string>(DEFAULT_API_KEY);

  useEffect(() => {
    // 从localStorage加载API Key
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey && savedKey !== DEFAULT_API_KEY) {
      setAPIKey(savedKey);
    }
  }, []);

  const handleSetAPIKey = (key: string) => {
    const finalKey = key || DEFAULT_API_KEY;
    setAPIKey(finalKey);
    // 只有当密钥不是默认值时才保存到localStorage
    if (finalKey !== DEFAULT_API_KEY) {
      localStorage.setItem('openai_api_key', finalKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  };

  return (
    <APIContext.Provider value={{ apiKey, setAPIKey: handleSetAPIKey }}>
      {children}
    </APIContext.Provider>
  );
};

export const useAPI = () => {
  const context = useContext(APIContext);
  if (context === undefined) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
}; 