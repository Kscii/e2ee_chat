import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Server } from '../types/server';

interface ServerContextProps {
  servers: Server[];
  currentServer?: Server;
  addServer: (server: Server) => void;
  setCurrentServer: (serverId: string) => void;
}

const ServerContext = createContext<ServerContextProps | undefined>(undefined);

// 示例数据
const initialServers: Server[] = [
  {
    id: '1',
    name: '主服务器',
    description: '这是主要的服务器',
    ownerId: 'user1',
    members: ['user1', 'user2'],
    channels: [
      {
        id: 'channel1',
        name: '常规',
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
    name: '测试服务器',
    description: '用于测试的服务器',
    ownerId: 'user1',
    members: ['user1'],
    channels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const ServerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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