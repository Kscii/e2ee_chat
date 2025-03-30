export interface User {
  id: string;
  name: string;
  avatar?: string;
  status: UserStatus;
  statusMessage?: string;
  email?: string;
  lastActive?: string;
}

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface UserStatusInfo {
  status: UserStatus;
  lastActive?: string;
  customMessage?: string;
} 