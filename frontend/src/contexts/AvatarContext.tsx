import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface AvatarContextType {
  avatar: string | null;
  setAvatar: (avatar: string | null) => void;
  uploadAvatar: (file: File) => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export const AvatarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const { user } = useAuth();

  // 从服务器获取头像
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;

      try {
        // 使用新的头像API
        const avatarUrl = `${API_URL}/avatar/${user.username}`;

        // 检查头像是否存在
        const response = await fetch(avatarUrl, { method: 'HEAD' });

        if (response.ok) {
          setAvatar(`${avatarUrl}?t=${new Date().getTime()}`); // 添加时间戳避免缓存
        } else {
          // 当头像不存在时，设置为null但不记录错误
          setAvatar(null);
        }
      } catch (error) {
        // 头像不存在时设置为null，但不输出错误日志
        setAvatar(null);
        // 只记录非404错误
        if (!(error instanceof Error && error.message.includes('404'))) {
          console.error('获取头像失败:', error);
        }
      }
    };

    fetchAvatar();
  }, [user]);

  // 上传头像到服务器
  const uploadAvatar = async (file: File) => {
    if (!user) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('未登录');
      }

      const response = await axios.post(`${API_URL}/upload-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.avatar_path) {
        // 更新头像，添加时间戳避免缓存
        setAvatar(`${API_URL}/avatar/${user.username}?t=${new Date().getTime()}`);
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      throw error;
    }
  };

  return (
    <AvatarContext.Provider value={{ avatar, setAvatar, uploadAvatar }}>
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