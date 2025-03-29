export interface Server {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  ownerId: string;
  members: string[];
  channels: Channel[];
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  description?: string;
  serverId: string;
  createdAt: string;
  updatedAt: string;
} 