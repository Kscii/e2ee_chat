import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Server } from '../types/server';
import { useTranslation } from 'react-i18next';

interface ServerContextProps {
  servers: Server[];
  currentServer?: Server;
  addServer: (server: Server) => void;
  setCurrentServer: (serverId: string) => void;
}

const ServerContext = createContext<ServerContextProps | undefined>(undefined);

export const ServerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  
  // 示例数据
  const initialServers: Server[] = [
    {
      id: '1',
      name: t('server.main'),
      description: t('server.mainDescription'),
      ownerId: 'user1',
      members: ['user1', 'user2'],
      channels: [
        {
          id: 'channel1',
          name: t('channel.default'),
          type: 'text',
          serverId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
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

  const addServer = (server: Server) => {
    setServers(prev => [...prev, server]);
  };

  const setCurrentServer = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    setCurrentServerState(server);
  };

  return (
    <ServerContext.Provider value={{ servers, currentServer, addServer, setCurrentServer }}>
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