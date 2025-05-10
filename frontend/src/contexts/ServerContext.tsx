import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Server } from '../types/server';
import { useTranslation } from 'react-i18next';
import { getAllServers, createServer as apiCreateServer } from '../api/server';
import { useAuth } from './AuthContext';

interface ServerContextProps {
  servers: Server[];
  currentServer?: Server;
  addServer: (server: Server) => void;
  setCurrentServer: (serverId: string) => void;
  refreshServers: () => Promise<void>;
  isLoading: boolean;
}

const ServerContext = createContext<ServerContextProps | undefined>(undefined);

export const ServerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // 示例数据 - 作为初始状态和后备方案
  const initialServers: Server[] = [
    {
      id: '1',
      name: t('server.main'),
      description: t('server.mainDescription'),
      ownerId: 'user1',
      members: ['kscii', 'user1', 'user2'],
      channels: [
        // 移除默认的General频道
        // {
        //   id: 'channel1',
        //   name: t('channel.default'),
        //   type: 'text',
        //   serverId: '1',
        //   createdAt: new Date().toISOString(),
        //   updatedAt: new Date().toISOString(),
        // }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: t('server.test'),
      description: t('server.testDescription'),
      ownerId: 'user1',
      members: ['user1'],
      channels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const [servers, setServers] = useState<Server[]>(initialServers);
  const [currentServer, setCurrentServerState] = useState<Server | undefined>(servers[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 从API获取服务器列表
  const fetchServers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const apiServers = await getAllServers();

      // 将API服务器转换为前端格式
      const mappedServers = apiServers.map(apiServer => ({
        id: apiServer.id.toString(),
        name: apiServer.name,
        description: apiServer.description || '',
        ownerId: apiServer.owner_id.toString(),
        avatar: apiServer.avatar,
        members: apiServer.members?.map(m => m.username) || [],
        channels: [], // 初始为空，频道将在ChannelPage中从群组加载
        createdAt: apiServer.created_at,
        updatedAt: apiServer.updated_at || apiServer.created_at
      }));

      if (mappedServers.length > 0) {
        setServers(mappedServers);

        // 如果没有选中服务器或当前选中的服务器不在列表中，选择第一个服务器
        if (!currentServer || !mappedServers.find(s => s.id === currentServer.id)) {
          setCurrentServerState(mappedServers[0]);
        }
      }
    } catch (error) {
      console.error('获取服务器列表失败:', error);
      // 如果API获取失败，保留初始示例数据
    } finally {
      setIsLoading(false);
    }
  };

  // 用户登录后获取服务器列表
  useEffect(() => {
    fetchServers();
  }, [user]);

  const addServer = async (server: Server) => {
    try {
      // 使用API创建服务器
      if (user) {
        const apiServer = await apiCreateServer(
          server.name,
          server.description,
          server.avatar
        );

        // 将返回的服务器转换为前端格式并添加到列表
        const newServer: Server = {
          id: apiServer.id.toString(),
          name: apiServer.name,
          description: apiServer.description || '',
          ownerId: apiServer.owner_id.toString(),
          avatar: apiServer.avatar,
          members: [user.username],
          channels: [],
          createdAt: apiServer.created_at,
          updatedAt: apiServer.updated_at || apiServer.created_at
        };

        setServers(prev => [...prev, newServer]);
        return;
      }
    } catch (error) {
      console.error('创建服务器失败:', error);
    }

    // 如果API调用失败或用户未登录，回退到本地添加
    setServers(prev => [...prev, server]);
  };

  const setCurrentServer = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    setCurrentServerState(server);
  };

  // 刷新服务器列表
  const refreshServers = async () => {
    await fetchServers();
  };

  return (
    <ServerContext.Provider value={{
      servers,
      currentServer,
      addServer,
      setCurrentServer,
      refreshServers,
      isLoading
    }}>
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
}; 