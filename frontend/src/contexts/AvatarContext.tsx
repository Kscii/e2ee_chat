import React, { createContext, useContext, useState } from 'react';

interface AvatarContextType {
  avatar: string | null;
  setAvatar: (url: string | null) => void;
}

const AvatarContext = createContext<AvatarContextType>({
  avatar: null,
  setAvatar: () => {},
});

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avatar, setAvatar] = useState<string | null>(null);

  return (
    <AvatarContext.Provider value={{ avatar, setAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
}; 