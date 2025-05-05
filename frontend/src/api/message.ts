import axios, { AxiosError } from 'axios';
import { validateServerDomain } from '../utils/certificateValidator';

// 从环境变量获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
console.log('使用API URL:', API_URL);

// 消息相关类型定义
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_username: string;
  receiver_username: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_encrypted?: boolean; // 标记消息是否已加密
}

export interface GroupMessage {
  id: number;
  group_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  other_user_id: number;
  other_username: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface MessageResponse {
  messages: Message[];
}

interface GroupMessageResponse {
  messages: GroupMessage[];
}

interface ConversationsResponse {
  conversations: Conversation[];
}

// 创建axios实例，复用与auth.ts相同的配置
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: import.meta.env.VITE_SECURE_MODE === 'true' // 允许跨域请求携带凭证
});

// 请求拦截器添加token和验证服务器
apiClient.interceptors.request.use(
  (config) => {
    // 生产环境下验证域名和协议
    if (import.meta.env.MODE === 'production') {
      if (!validateServerDomain()) {
        throw new Error('服务器验证失败，为保护您的账户安全，已阻止请求');
      }
    }
    
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 发送加密消息
export const sendEncryptedMessage = async (receiver: string, encryptedContent: string): Promise<Message> => {
  try {
    const response = await apiClient.post('/messages', {
      receiver,
      content: encryptedContent,
      is_encrypted: true // 标记为加密消息
    });
    return response.data;
  } catch (error) {
    console.error('发送加密消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('发送加密消息失败，请稍后重试');
  }
};

// 发送消息
export const sendMessage = async (receiver: string, content: string): Promise<Message> => {
  try {
    const response = await apiClient.post('/messages', {
      receiver,
      content
    });
    return response.data;
  } catch (error) {
    console.error('发送消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('发送消息失败，请稍后重试');
  }
};

// 获取与指定用户的消息历史
export const getMessages = async (otherUsername: string, limit = 50, offset = 0): Promise<Message[]> => {
  try {
    const response = await apiClient.get<MessageResponse>(
      `/messages/${otherUsername}`,
      { params: { limit, offset } }
    );
    return response.data.messages;
  } catch (error) {
    console.error('获取消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取消息失败，请稍后重试');
  }
};

// 获取所有会话
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await apiClient.get<ConversationsResponse>('/conversations');
    return response.data.conversations;
  } catch (error) {
    console.error('获取会话列表失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取会话列表失败，请稍后重试');
  }
};

// 发送群组消息
export const sendGroupMessage = async (content: string): Promise<GroupMessage> => {
  try {
    console.log('调用群组消息API, 内容:', content);
    const response = await apiClient.post('/group/messages', {
      content
    });
    console.log('群组消息API响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('发送群组消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      console.error('API错误详情:', axiosError.response?.data, axiosError.message);
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('发送群组消息失败，请稍后重试');
  }
};

// 获取群组消息
export const getGroupMessages = async (limit = 50, offset = 0): Promise<GroupMessage[]> => {
  try {
    const response = await apiClient.get<GroupMessageResponse>(
      '/group/messages',
      { params: { limit, offset } }
    );
    return response.data.messages;
  } catch (error) {
    console.error('获取群组消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取群组消息失败，请稍后重试');
  }
};

// 获取群组成员
export const getGroupMembers = async (groupId = 1): Promise<{ id: number, username: string }[]> => {
  try {
    const response = await apiClient.get(`/groups/${groupId}/members`);
    return response.data.members;
  } catch (error) {
    console.error('获取群组成员失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取群组成员失败，请稍后重试');
  }
};

// 获取加密群组消息
export const getEncryptedGroupMessages = async (groupId = 1): Promise<any[]> => {
  try {
    const response = await apiClient.get('/group/encrypted-messages', {
      params: { group_id: groupId }
    });
    return response.data.messages;
  } catch (error) {
    console.error('获取加密群组消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取加密群组消息失败，请稍后重试');
  }
};

// 发送加密群组消息 - 添加群组ID参数
export const sendEncryptedGroupMessages = async (messages: { recipient: string, content: string }[], groupId = 1): Promise<any> => {
  try {
    const response = await apiClient.post('/group/encrypted-messages', {
      messages,
      group_id: groupId
    });
    return response.data;
  } catch (error) {
    console.error('发送加密群组消息失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('发送加密群组消息失败，请稍后重试');
  }
};

// 创建新群组
export const createNewGroup = async (name: string, description: string, members: string[]): Promise<{ id: number, name: string }> => {
  try {
    const response = await apiClient.post('/groups', {
      name,
      description,
      members
    });
    return response.data;
  } catch (error) {
    console.error('创建群组失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('创建群组失败，请稍后重试');
  }
};

// 获取所有群组
export const getAllGroups = async (): Promise<{ id: number, name: string }[]> => {
  try {
    const response = await apiClient.get('/groups');
    return response.data.groups;
  } catch (error) {
    console.error('获取群组列表失败:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{error: string}>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error('获取群组列表失败，请稍后重试');
  }
}; 