import { GroupMessage } from '../api/message';

/**
 * 将群组消息转换为频道消息格式
 */
export interface ChannelMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  files?: {
    url: string;
    name: string;
    type: string;
  }[];
}

/**
 * 将群组消息转换为频道消息格式
 */
export const convertGroupMessagesToChannelFormat = (
  groupMessages: GroupMessage[],
  systemMessage?: ChannelMessage
): ChannelMessage[] => {
  const convertedMessages = groupMessages.map((msg) => ({
    id: msg.id.toString(),
    content: msg.content,
    sender: {
      id: msg.sender_id.toString(),
      name: msg.sender_username,
    },
    timestamp: msg.created_at,
  }));

  return systemMessage ? [systemMessage, ...convertedMessages] : convertedMessages;
};

/**
 * 创建系统消息
 */
export const createSystemMessage = (content: string): ChannelMessage => {
  return {
    id: 'system',
    content,
    sender: {
      id: 'system',
      name: 'System',
    },
    timestamp: new Date().toISOString(),
  };
}; 