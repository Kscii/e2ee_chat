import React, { useRef, useState, useEffect } from 'react';
import { Typography, Input, Button, Avatar, Divider, message, Upload, Tooltip, Modal } from 'antd';
import { UserOutlined, RobotOutlined, UploadOutlined, FileOutlined, SendOutlined, TeamOutlined, SmileOutlined, CheckOutlined, CheckCircleOutlined, DownloadOutlined, SoundOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../../contexts/ThemeContext';
import { useMarkdown } from '../../contexts/MarkdownContext';
import { useAvatar } from '../../contexts/AvatarContext';
import { useTTS } from '../../contexts/TTSContext';
import { useAI } from '../../contexts/AIContext';
import { useAPI } from '../../contexts/APIContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './index.css';
import type { UploadFile } from 'antd/es/upload/interface';
import { useAuth } from '../../contexts/AuthContext';
// 使用sendEncryptedMessage发送加密消息
import { sendEncryptedMessage, getMessages, getEncryptedGroupMessages, getGroupMembers, sendEncryptedGroupMessages } from '../../api/message';
import { getAllUsers } from '../../api/auth';
import { useCrypto } from '../../contexts/CryptoContext';
import { getOrFetchPublicKey } from '../../api/keys';
import { CryptoService } from '../../utils/crypto';

const { Text } = Typography;

// 消息发送者类型
type MessageSender = 'user' | 'other';

// 消息状态
type MessageStatus = 'sending' | 'sent' | 'read' | 'failed';

// 消息类型
interface Message {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: Date;
  status?: MessageStatus;
  type?: 'text' | 'image' | 'file' | 'pdf' | 'word' | 'excel' | 'ppt' | 'txt';
  fileInfo?: {
    name: string;
    url: string;
    size?: number;
    type?: string;
    previewUrl?: string;
  };
}

// 用于Markdown渲染的组件接口
interface Components {
  [key: string]: React.ComponentType<React.PropsWithChildren<{
    className?: string;
    children?: React.ReactNode;
  }>>;
}

// 添加打字机效果组件
const TypewriterEffect: React.FC<{ text: string; speed?: number }> = ({ text, speed = 30 }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed]);

  return (
    <>
      {displayText}
      {!isComplete && <span className="typing-cursor">|</span>}
    </>
  );
};

// 添加加载动画组件
const LoadingAnimation: React.FC = () => {
  return (
    <div className="loading-animation">
      <div className="loading-dots">
        <div className="loading-dot"></div>
        <div className="loading-dot"></div>
        <div className="loading-dot"></div>
      </div>
    </div>
  );
};

const ChatPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { markdownMode } = useMarkdown();
  const { avatar } = useAvatar();
  const { ttsEnabled, autoRead, speak } = useTTS();
  const { aiEnabled, sendMessage: sendAiMessage } = useAI();
  const { user } = useAuth();
  const { apiKey } = useAPI();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isAIChat = location.pathname === '/ai';
  const { encryptMessage, decryptMessage, getMyPublicKey } = useCrypto();

  // 获取聊天对象ID或用户名
  const chatId = params.id || 'ai';
  const chatType = chatId.startsWith('user-') ? 'user' : (chatId === 'groups' ? 'groups' : 'ai');
  const chatUserId = chatType === 'user' ? chatId.replace('user-', '') : null;
  const isGroupChat = chatType === 'groups';

  // 重定向非法聊天ID
  useEffect(() => {
    if (chatId.startsWith('group-')) {
      navigate('/chat', { replace: true });
    }
  }, [chatId, navigate]);

  // 聊天状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentContact, setCurrentContact] = useState({ id: '', name: '', isOnline: true });
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: number, username: string }[]>([]);
  const [encryptedGroupMessages, setEncryptedGroupMessages] = useState<Array<{
    id: number;
    group_id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    message_timestamp: string;
    created_at: string;
    sender_username: string;
  }>>([]);
  const [decryptedGroupMessages, setDecryptedGroupMessages] = useState<Map<string, string>>(new Map());

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<Message['fileInfo']>();
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 添加表情选择器
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '👍', '👎', '👏', '🙌', '👋', '🤝', '❤️', '💔', '😢', '😭'];

  const handleEmojiClick = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // 获取所有用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getAllUsers();
        setAllUsers(users);
      } catch (error) {
        console.error('获取用户列表失败:', error);
      }
    };

    fetchUsers();
  }, []);

  // 获取群组消息
  const fetchGroupMessages = async () => {
    if (!user) return;

    setLoadingMessages(true);
    try {
      console.log('🔄 Starting to fetch group messages...');

      // 只使用加密消息API
      await fetchEncryptedGroupMessages();
    } catch (error) {
      console.error('❌ Failed to fetch group messages:', error);
      message.error('获取群组消息失败');
    } finally {
      setLoadingMessages(false);
    }
  };

  // 获取加密群组消息
  const fetchEncryptedGroupMessages = async () => {
    if (!user) return;

    try {
      console.log('📱 Starting to fetch encrypted group messages...');
      // 获取加密消息
      const encryptedMessages = await getEncryptedGroupMessages();
      console.log(`📩 Received ${encryptedMessages.length} encrypted group messages`);
      setEncryptedGroupMessages(encryptedMessages);

      // 解密消息
      console.log('🔄 Starting to decrypt group messages...');
      await decryptGroupMessages(encryptedMessages);
      console.log('✅ Group message decryption completed');
    } catch (error) {
      console.error('❌ Failed to fetch encrypted group messages:', error);
      message.error('获取加密群组消息失败');
    }
  };

  // 解密群组消息
  const decryptGroupMessages = async (encryptedMessages: Array<{
    id: number;
    group_id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    message_timestamp: string;
    created_at: string;
    sender_username: string;
  }>) => {
    if (!encryptedMessages.length) return;

    console.log(`🔍 Starting to decrypt ${encryptedMessages.length} group messages...`);

    const myKeyPair = CryptoService.getUserKeyPair();
    if (!myKeyPair) {
      console.error('❌ Key pair not found, cannot decrypt messages');
      message.error('未找到密钥对，无法解密消息');
      return;
    }

    const mySecretKey = CryptoService.stringToKey(myKeyPair.secretKey);
    console.log('🔑 Current user key loaded');

    // 获取并缓存所有发送者的公钥
    const senderPublicKeys = new Map<string, Uint8Array>();
    console.log('👥 Starting to fetch sender public keys...');

    for (const msg of encryptedMessages) {
      if (senderPublicKeys.has(msg.sender_username)) continue;

      try {
        const publicKey = await getOrFetchPublicKey(msg.sender_username);
        senderPublicKeys.set(
          msg.sender_username,
          CryptoService.stringToKey(publicKey)
        );
        console.log(`🔑 Successfully fetched public key for user ${msg.sender_username}`);
      } catch (error) {
        console.error(`❌ Failed to fetch public key for user ${msg.sender_username}:`, error);
      }
    }

    console.log(`✅ Fetched ${senderPublicKeys.size} user public keys in total`);

    // 解密消息并更新UI
    const decryptedMessages = new Map<string, string>();
    console.log('🔄 Starting to decrypt messages one by one...');

    for (const msg of encryptedMessages) {
      try {
        const senderPublicKey = senderPublicKeys.get(msg.sender_username);
        if (!senderPublicKey) {
          console.warn(`⚠️ Skipping message ${msg.id}, public key for sender ${msg.sender_username} not found`);
          continue;
        }

        // 判断是否是自己发送给别人的消息
        if (user && msg.sender_username === user.username && msg.receiver_id !== user.id) {
          // 这是自己发送给别人的消息，我们不能解密，显示提示
          console.log(`👤 Group message ${msg.id} sent by me to others, skipping decryption`);
          decryptedMessages.set(msg.id.toString(), '[Encrypted message sent by me]');
          continue;
        }

        console.log(`🔓 Decrypting message from ${msg.sender_username} ID:${msg.id}...`, {
          encryptedContent: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
        });

        const decrypted = CryptoService.decryptMessage(
          msg.content,
          senderPublicKey,
          mySecretKey
        );

        if (decrypted) {
          decryptedMessages.set(msg.id.toString(), decrypted);
          console.log(`✅ Message ${msg.id} decryption successful`);
        } else {
          console.error(`❌ Message ${msg.id} decryption result is empty`);
        }
      } catch (error) {
        console.error(`❌ Failed to decrypt message ${msg.id}:`, error);
      }
    }

    console.log(`📊 Decryption statistics: ${decryptedMessages.size}/${encryptedMessages.length} messages successfully decrypted`);

    // 更新UI，在渲染消息时使用
    setDecryptedGroupMessages(decryptedMessages);
    console.log('✅ Message decryption completed, UI state updated');
  };

  // 根据chatId加载对应的聊天记录和联系人信息
  useEffect(() => {
    if (isAIChat) {
      setCurrentContact({
        id: 'ai',
        name: aiEnabled ? 'AI Assistant' : 'Chat Bot',
        isOnline: true
      });
      setMessages([
        {
          id: '1',
          content: t('chat.demoMessages.welcome'),
          sender: 'other',
          timestamp: new Date(),
          status: 'read'
        }
      ]);
    } else if (chatType === 'user' && chatUserId) {
      // 获取用户信息
      const contactUser = allUsers.find(u => u.id.toString() === chatUserId);

      if (contactUser) {
        setCurrentContact({
          id: chatUserId,
          name: contactUser.username,
          isOnline: true
        });

        // 加载与该用户的消息历史
        fetchMessages(contactUser.username);
      }
    } else if (isGroupChat) {
      // 群组聊天页面
      setCurrentContact({
        id: 'groups',
        name: t('navigation.groups'),
        isOnline: true
      });

      // 加载群组消息
      fetchGroupMessages();
    } else {
      // 默认示例数据
      setCurrentContact({
        id: 'demo',
        name: 'Demo User',
        isOnline: true
      });
      // 保留示例消息
    }
  }, [isAIChat, aiEnabled, t, chatId, chatType, chatUserId, allUsers, isGroupChat]);

  // 获取消息历史
  const fetchMessages = async (otherUsername: string) => {
    if (!user) return;

    setLoadingMessages(true);
    try {
      console.log('📱 Fetching chat history with user:', otherUsername);
      // 获取与对方的聊天记录
      const messagesData = await getMessages(otherUsername);
      console.log('📩 Received message count:', messagesData.length);

      // 同时获取自己发给自己的消息副本
      console.log('📱 Fetching self-copies of messages...');
      let selfMessages: any[] = [];
      try {
        // 只有当聊天对象不是自己时，才需要单独获取自己的消息副本
        if (user.username !== otherUsername) {
          selfMessages = await getMessages(user.username);
          console.log('📩 Received self-messages count:', selfMessages.length);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch self messages:', error);
      }

      // 合并两组消息并按时间排序
      const allMessagesData = [...messagesData, ...selfMessages]
        .filter(msg => {
          // 只保留与当前聊天相关的消息副本
          if (msg.receiver_username === user.username && msg.sender_username === user.username) {
            // 这是自己发给自己的消息，检查它是否包含了当前对话中的内容
            // 如果能找到相应的原始消息，则保留这个副本
            return messagesData.some(origMsg =>
              origMsg.sender_username === user.username &&
              origMsg.receiver_username === otherUsername &&
              new Date(origMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 5000 // 5秒内发送的消息视为同一条
            );
          }

          // 如果是自己发给对方的消息，去除它，我们会显示自己的副本
          if (msg.sender_username === user.username && msg.receiver_username === otherUsername) {
            // 查看是否有对应的自己发给自己的副本
            const hasSelfCopy = selfMessages.some(selfMsg =>
              selfMsg.sender_username === user.username &&
              selfMsg.receiver_username === user.username &&
              Math.abs(new Date(selfMsg.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000
            );

            // 如果有自己的副本，则不显示发给对方的版本
            return !hasSelfCopy;
          }

          return true; // 保留所有其他消息
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      console.log('📩 Combined message count:', allMessagesData.length);

      // 转换API消息格式为UI消息格式
      console.log('🔄 Starting to process and decrypt messages...');
      const uiMessages: Message[] = await Promise.all(allMessagesData.map(async msg => {
        let content = msg.content;

        // 如果是加密消息，尝试解密
        if (msg.is_encrypted) {
          // 添加调试信息，查看完整的消息属性
          console.log(`📨 消息详情:`, {
            id: msg.id,
            sender: msg.sender_username,
            receiver: msg.receiver_username,
            isSelf: msg.sender_username === user.username,
            isSelfReceiver: msg.receiver_username === user.username
          });

          // 判断是否是自己发给自己的副本
          const isSelfCopy = msg.sender_username === user.username && msg.receiver_username === user.username;

          // 修改判断条件：只有当消息是自己发送给他人且不是自己的副本时才跳过解密
          if (msg.sender_username === user.username && msg.receiver_username !== user.username && !isSelfCopy) {
            console.log(`👤 消息${msg.id}是自己发给他人的，不解密显示`);
            content = '[Encrypted message sent by me]';
          } else {
            try {
              // 获取发送者的公钥
              const senderPublicKey = await getOrFetchPublicKey(msg.sender_username);
              console.log(`🔑 Retrieved public key for user ${msg.sender_username}`);
              console.log(`🔒 Encrypted message from ${msg.sender_username}:`, {
                content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
              });

              // 解密消息内容
              const decrypted = decryptMessage(content, senderPublicKey);
              if (decrypted) {
                content = decrypted;
                console.log(`🔓 Successfully decrypted message from ${msg.sender_username}`);

                // 如果是自己发给自己的副本，在内容前添加标记
                if (isSelfCopy) {
                  // 不再添加前缀标记
                  // content = `📝 ${content}`;
                }
              } else {
                console.error(`❌ Unable to decrypt message:`, msg.id);
                content = '[Encrypted message - Unable to decrypt]';
              }
            } catch (error) {
              console.error('❌ Message decryption failed:', error);
              content = '[Encrypted message - Decryption failed]';
            }
          }
        }

        return {
          id: msg.id.toString(),
          content: content,
          sender: msg.sender_username === user.username ? 'user' : 'other',
          timestamp: new Date(msg.created_at),
          status: msg.is_read ? 'read' : 'sent'
        };
      }));

      console.log('✅ Message processing complete, updating UI');
      setMessages(uiMessages);
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      message.error('获取历史消息失败');
    } finally {
      setLoadingMessages(false);
    }
  };

  // 发送群组加密消息
  const sendEncryptedGroupMessage = async (content: string) => {
    if (!user) return;

    try {
      console.log('📝 Preparing to send group message:', {
        messageLength: content.length
      });

      // 获取我的密钥
      const myKeyPair = CryptoService.getUserKeyPair();
      if (!myKeyPair) {
        message.error('未找到密钥对，无法发送加密消息');
        return;
      }

      const mySecretKey = CryptoService.stringToKey(myKeyPair.secretKey);
      const myPublicKey = CryptoService.stringToKey(myKeyPair.publicKey);

      // 获取群组所有成员
      console.log('👥 Fetching group members...');
      const members = await getGroupMembers(1); // 默认群组ID为1
      console.log('👥 Group members:', members);

      // 为每个成员加密消息（包括自己）
      console.log('🔐 Starting to encrypt message for each group member...');
      const encryptedMessages = await Promise.all(
        members
          .map(async (member) => {
            try {
              let publicKeyBytes;

              // 如果是发给自己的消息，直接使用自己的公钥
              if (member.username === user.username) {
                console.log(`🔑 Using my own public key for my copy`);
                publicKeyBytes = myPublicKey;
              } else {
                // 获取成员公钥
                const publicKey = await getOrFetchPublicKey(member.username);
                publicKeyBytes = CryptoService.stringToKey(publicKey);
              }

              // 加密消息
              const encrypted = CryptoService.encryptMessage(
                content,
                publicKeyBytes,
                mySecretKey
              );

              console.log(`🔒 Message encrypted for member ${member.username}:`, {
                encryptedContent: encrypted.substring(0, 100) + (encrypted.length > 100 ? '...' : '')
              });

              return {
                recipient: member.username,
                content: encrypted
              };
            } catch (error) {
              console.error(`❌ Failed to encrypt message for user ${member.username}:`, error);
              return null;
            }
          })
      );

      // 过滤掉失败的加密
      const validMessages = encryptedMessages.filter(msg => msg !== null);
      console.log(`✅ Successfully encrypted messages: ${validMessages.length}/${members.length}`);

      if (validMessages.length === 0) {
        message.error('所有加密操作失败，无法发送消息');
        return;
      }

      // 发送加密消息
      await sendEncryptedGroupMessages(validMessages);

      // 刷新消息列表
      await fetchGroupMessages();

      return true;
    } catch (error) {
      console.error('❌ Failed to send encrypted group message:', error);
      message.error('发送加密群组消息失败');
      return false;
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    if (!user) {
      message.error('请先登录');
      return;
    }

    console.log('🚀 Starting to send message, chat type:', isGroupChat ? 'groups' : chatType);
    console.log('📝 Message to be encrypted');

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // 自动朗读发送的消息
    if (autoRead) {
      console.log('🔊 Text-to-speech activated for outgoing message');
      speak(userMessage.content);
    }

    try {
      if (isAIChat) {
        if (!apiKey) {
          message.error(t('errors.api.configMissing'));
          setLoading(false);
          return;
        }

        // 创建一个临时的AI消息，用于显示打字效果
        const tempId = (Date.now() + 1).toString();
        const tempMessage: Message = {
          id: tempId,
          content: '',
          sender: 'other',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, tempMessage]);
        setTypingMessageId(tempId);

        console.log('🤖 Sending message to AI...');
        // 获取AI回复
        const aiResponse = await sendAiMessage(inputValue.trim());

        if (aiResponse) {
          // 更新消息内容
          console.log('✅ Received AI response');
          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempId
                ? { ...msg, content: aiResponse }
                : msg
            )
          );

          // 自动朗读接收到的消息
          if (autoRead) {
            console.log('🔊 Text-to-speech activated for AI response');
            speak(aiResponse);
          }
        }

        // 打字效果完成后清除typing状态
        setTimeout(() => {
          setTypingMessageId(null);
        }, aiResponse.length * 30 + 500);
      } else if (isGroupChat) {
        // 删除条件判断，直接使用加密群组消息发送
        console.log('👥 Sending encrypted group message...');
        const success = await sendEncryptedGroupMessage(userMessage.content);

        if (!success) {
          console.error('❌ Group message sending failed');
          // 更新消息状态为发送失败
          setMessages(prev =>
            prev.map(msg =>
              msg.id === userMessage.id
                ? { ...msg, status: 'failed' as const }
                : msg
            )
          );
        } else {
          console.log('✅ Group message sent successfully');
          // 更新消息状态
          setTimeout(() => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === userMessage.id
                  ? { ...msg, status: 'sent' as const }
                  : msg
              )
            );

            // 2秒后更新为已读
            setTimeout(() => {
              console.log('📱 Updating message status to read');
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === userMessage.id
                    ? { ...msg, status: 'read' as const }
                    : msg
                )
              );
            }, 2000);
          }, 1000);
        }
      } else if (chatType === 'user' && currentContact.name) {
        // 发送消息到后端
        try {
          console.log('📝 Preparing to send private message to:', currentContact.name);
          console.log('📄 Message length:', userMessage.content.length);

          // 获取接收者的公钥用于加密
          console.log('🔑 Fetching recipient public key...');
          const receiverPublicKey = await getOrFetchPublicKey(currentContact.name);
          console.log('🔑 Successfully obtained recipient public key');

          // 获取自己的公钥，用于给自己发送副本
          console.log('🔑 Getting my own public key...');
          const myPublicKey = getMyPublicKey();
          if (!myPublicKey) {
            console.error('❌ Cannot get my public key for self-copy encryption');
            throw new Error('无法获取自己的公钥');
          }
          console.log('🔑 Successfully got my own public key');

          // 加密发给对方的消息
          console.log('🔐 Encrypting message content for recipient...');
          const encryptedContent = encryptMessage(userMessage.content, receiverPublicKey);
          console.log('🔒 Message encryption completed:', {
            encryptedContent: encryptedContent.substring(0, 100) + (encryptedContent.length > 100 ? '...' : '')
          });

          // 加密发给自己的消息副本
          console.log('🔐 Encrypting message content for myself...');
          const selfEncryptedContent = encryptMessage(userMessage.content, myPublicKey);
          console.log('🔒 Self message encryption completed');

          // 发送给接收者的加密消息
          console.log('📤 Sending encrypted message to recipient...');
          const response = await sendEncryptedMessage(currentContact.name, encryptedContent);

          // 发送给自己的加密消息副本（如果接口支持）
          try {
            console.log('📤 Sending self copy of the message...');
            await sendEncryptedMessage(user.username, selfEncryptedContent);
            console.log('✅ Self copy sent successfully');
          } catch (selfCopyError) {
            // 如果发送给自己的消息副本失败，只记录错误但不中断主要流程
            console.error('⚠️ Failed to send self copy:', selfCopyError);
          }

          // 防止页面崩溃的安全处理
          console.log('✅ Message sent successfully:', {
            id: response.id,
            sender_id: response.sender_id,
            receiver_id: response.receiver_id,
            is_encrypted: response.is_encrypted,
            content: response.content.substring(0, 100) + (response.content.length > 100 ? '...' : '')
          });

          // 安全地更新消息状态为已发送
          setMessages(prev =>
            prev.map(msg =>
              msg.id === userMessage.id
                ? {
                  ...msg,
                  status: 'sent' as const,
                  // 安全地使用响应中的ID，如果不存在则保留原ID
                  id: (response && response.id) ? response.id.toString() : msg.id
                }
                : msg
            )
          );

          // 安全地获取消息ID用于后续更新
          const messageId = (response && response.id) ? response.id.toString() : userMessage.id;

          // 2秒后更新为已读状态
          setTimeout(() => {
            console.log('📱 Updating message status to read:', messageId);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === messageId
                  ? { ...msg, status: 'read' as const }
                  : msg
              )
            );
          }, 2000);

          // 在发送消息后主动刷新消息列表
          if (currentContact.name) {
            setTimeout(() => {
              console.log('🔄 Refreshing message list...');
              fetchMessages(currentContact.name);
            }, 2500);
          }
        } catch (error) {
          console.error('❌ Failed to send private message:', error);
          message.error('发送消息失败');

          // 更新消息状态为发送失败
          setMessages(prev =>
            prev.map(msg =>
              msg.id === userMessage.id
                ? { ...msg, status: 'failed' as const }
                : msg
            )
          );
        }
      } else {
        // 非AI聊天时，模拟一个简单的自动回复
        setTimeout(() => {
          // 先显示"发送中"状态
          const pendingMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: t('chat.demoMessages.answer'),
            sender: 'other',
            timestamp: new Date(),
            status: 'sending'
          };
          setMessages(prev => [...prev, pendingMessage]);

          // 1秒后更新为"已发送"状态
          setTimeout(() => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === pendingMessage.id
                  ? { ...msg, status: 'sent' as const }
                  : msg
              )
            );

            // 再过1秒更新为"已读"状态
            setTimeout(() => {
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === pendingMessage.id
                    ? { ...msg, status: 'read' as const }
                    : msg
                )
              );

              if (autoRead) {
                console.log('🔊 Text-to-speech activated for received message');
                speak(pendingMessage.content);
              }
            }, 1000);
          }, 1000);
        }, 1000);

        // 更新消息状态为已发送
        setTimeout(() => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === userMessage.id
                ? { ...msg, status: 'sent' as const }
                : msg
            )
          );

          // 2秒后更新为已读状态
          setTimeout(() => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === userMessage.id
                  ? { ...msg, status: 'read' as const }
                  : msg
              )
            );
          }, 2000);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      message.error(t('errors.chat.sendFailed'));

      // 更新消息状态为发送失败
      setMessages(prev =>
        prev.map(msg =>
          msg.id === userMessage.id
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 获取文件类型
  const getFileType = (file: File): Message['type'] => {
    const fileType = file.type.toLowerCase();
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word') || fileType.includes('docx')) return 'word';
    if (fileType.includes('excel') || fileType.includes('xlsx')) return 'excel';
    if (fileType.includes('powerpoint') || fileType.includes('pptx')) return 'ppt';
    if (fileType.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) return 'txt';
    return 'file';
  };

  // 获取文件图标
  const getFileIcon = (type: Message['type']) => {
    switch (type) {
      case 'pdf': return <FileOutlined />;
      case 'word': return <FileOutlined />;
      case 'excel': return <FileOutlined />;
      case 'ppt': return <FileOutlined />;
      case 'txt': return <FileOutlined />;
      default: return <FileOutlined />;
    }
  };

  // 处理文件预览
  const handlePreview = async (fileInfo: Message['fileInfo']) => {
    setPreviewFile(fileInfo);
    setPreviewVisible(true);
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t('errors.file.sizeLimitExceeded', { size: 10 }));
      return false;
    }
    const url = URL.createObjectURL(file);
    const type = getFileType(file);
    const content = t(`chat.fileMessages.${type}`, { filename: file.name });

    console.log('📄 File upload:', {
      type,
      name: file.name,
      size: Math.round(file.size / 1024) + 'KB'
    });

    // 如果是文本文件，创建预览URL
    let previewUrl;
    if (type === 'txt') {
      const text = await file.text();
      console.log('📝 Text file processed, length:', text.length);
      const blob = new Blob([text], { type: 'text/plain' });
      previewUrl = URL.createObjectURL(blob);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content,
      sender: 'user',
      timestamp: new Date(),
      type: type,
      fileInfo: {
        name: file.name,
        url: url,
        type: file.type,
        previewUrl: previewUrl || url
      }
    };

    setMessages(prev => [...prev, newMessage]);
    setFileList([]);

    if (autoRead) {
      console.log('🔊 Text-to-speech activated for file message');
      speak(content);
    }
  };

  // 处理粘贴事件
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleFileUpload(file);
        }
      }
    }
  };

  // 渲染文件消息
  const renderFileMessage = (message: Message) => {
    if (!message.fileInfo) return null;

    const icon = getFileIcon(message.type);
    const isImage = message.type === 'image';

    return (
      <div className="file-message">
        {isImage ? (
          <div className="image-preview" onClick={() => handlePreview(message.fileInfo!)}>
            <img src={message.fileInfo.url} alt={message.fileInfo.name} />
          </div>
        ) : (
          <div className="file-info" onClick={() => handlePreview(message.fileInfo!)}>
            <div className="file-icon">{icon}</div>
            <div className="file-name">{message.fileInfo.name}</div>
            <div className="file-actions">
              <Tooltip title={t('common.download')}>
                <Button type="text" icon={<DownloadOutlined />} onClick={(e) => {
                  e.stopPropagation();
                  window.open(message.fileInfo!.url);
                }} />
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 图片预览
  const handleImagePreview = (url: string) => {
    setImagePreview(url);
  };

  const handleCloseImagePreview = () => {
    setImagePreview(null);
  };

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    // 如果是正在输入的消息，显示打字机效果
    if (message.id === typingMessageId) {
      return <TypewriterEffect text={message.content} />;
    }

    if (message.type === 'image') {
      return (
        <img
          src={message.fileInfo?.url}
          alt="图片消息"
          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => handleImagePreview(message.fileInfo?.url || '')}
        />
      );
    } else if (message.type && message.type !== 'text') {
      return renderFileMessage(message);
    } else if (markdownMode) {
      const components: Components = {
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          return !isInline ? (
            <SyntaxHighlighter
              style={isDarkMode ? vscDarkPlus : vs}
              language={match ? match[1] : ''}
              PreTag="div"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      };

      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {message.content}
        </ReactMarkdown>
      );
    }

    return message.content.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < message.content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // 滚动到底部的函数
  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  // 当消息更新时，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听窗口大小变化，确保在窗口大小变化时也能正确滚动
  useEffect(() => {
    const handleResize = () => {
      scrollToBottom();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 渲染群组消息
  const renderGroupMessages = () => {
    return (
      <>
        {/* 仅显示解密后的消息 - 不显示原始加密消息 */}
        {encryptedGroupMessages.map((msg, index) => {
          // 获取解密内容
          const decryptedContent = decryptedGroupMessages.get(msg.id.toString());
          if (!decryptedContent) return null;

          return (
            <div
              key={`decrypted-${msg.id}`}
              className={`message-bubble ${msg.sender_username === user?.username ? 'user-message' : 'other-message'}`}
              style={{
                animationDelay: `${index * 0.1}s`,
                animationDuration: '0.5s'
              }}
            >
              <div className="message-avatar">
                <Avatar
                  size={40}
                  src={msg.sender_username === user?.username ? avatar :
                    // 为其他用户尝试获取头像
                    `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/avatar/${msg.sender_username}?t=${new Date().getTime()}`
                  }
                  icon={<UserOutlined />}
                />
              </div>
              <div className="message-content">
                <div className="message-sender">
                  <Text strong>{msg.sender_username}</Text>
                </div>
                <div className="message-text">
                  {decryptedContent}
                </div>
                <div className="message-footer">
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                  {ttsEnabled && (
                    <Button
                      type="text"
                      size="small"
                      icon={<SoundOutlined />}
                      onClick={() => {
                        console.log('🔊 Text-to-speech activated for group message');
                        speak(decryptedContent);
                      }}
                      className="tts-button"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // 添加AI头像URL常量
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const AI_AVATAR_URL = `${API_BASE_URL}/avatar/sakiko`;

  return (
    <div className="chat-container">
      <div className="chat-main">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar
              icon={isAIChat ? <RobotOutlined /> : (isGroupChat ? <TeamOutlined /> : <UserOutlined />)}
              src={isAIChat ? AI_AVATAR_URL : undefined}
            />
            <div className="chat-info">
              <Text strong>{currentContact.name}</Text>
              <Text type="secondary">{currentContact.isOnline ? t('chat.status.online') : t('chat.status.offline')}</Text>
            </div>
          </div>
        </div>
        <Divider style={{ margin: '0 0 16px 0' }} />
        <div className="message-container" ref={messageContainerRef}>
          {loadingMessages ? (
            <div className="loading-center">
              <LoadingAnimation />
            </div>
          ) : messages.length === 0 && (!isGroupChat || encryptedGroupMessages.length === 0) ? (
            <div className="empty-messages">
              <Text type="secondary">{t('chat.emptyMessages')}</Text>
            </div>
          ) : (
            <>
              {isGroupChat ? (
                // 渲染群组消息，使用新函数
                renderGroupMessages()
              ) : (
                // 渲染普通消息
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'other-message'}`}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      animationDuration: '0.5s'
                    }}
                  >
                    <div className="message-avatar">
                      <Avatar
                        size={40}
                        src={msg.sender === 'user' ? avatar :
                          (isAIChat ? AI_AVATAR_URL : undefined)}
                        icon={msg.sender === 'user' ?
                          <UserOutlined /> :
                          (isAIChat ? <RobotOutlined /> :
                            (isGroupChat ? <TeamOutlined /> : <UserOutlined />)
                          )
                        }
                      />
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {renderMessageContent(msg)}
                      </div>
                      <div className="message-footer">
                        <span className="message-time">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                        {msg.sender === 'user' && msg.status && (
                          <span className="message-status">
                            {msg.status === 'sending' && (
                              <>
                                <span className="sending-indicator"></span>
                                {t('chat.status.sending')}
                              </>
                            )}
                            {msg.status === 'sent' && (
                              <>
                                <CheckOutlined />
                                {t('chat.status.sent')}
                              </>
                            )}
                            {msg.status === 'read' && (
                              <>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                {t('chat.status.read')}
                              </>
                            )}
                            {msg.status === 'failed' && (
                              <>
                                <span style={{ color: '#ff4d4f' }}>!</span>
                                {t('chat.status.failed')}
                              </>
                            )}
                          </span>
                        )}
                        {msg.sender === 'other' && msg.status && (
                          <span className="message-status other-status">
                            {msg.status === 'sending' && (
                              <>
                                <span className="sending-indicator"></span>
                                {t('chat.status.sending')}
                              </>
                            )}
                            {msg.status === 'sent' && (
                              <>
                                <CheckOutlined />
                                {t('chat.status.sent')}
                              </>
                            )}
                            {msg.status === 'read' && (
                              <>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                {t('chat.status.read')}
                              </>
                            )}
                          </span>
                        )}
                        {ttsEnabled && msg.type !== 'image' && msg.type !== 'file' && (
                          <Button
                            type="text"
                            size="small"
                            icon={<SoundOutlined />}
                            onClick={() => {
                              console.log('🔊 Text-to-speech activated for private message');
                              speak(msg.content);
                            }}
                            className="tts-button"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
          {loading && (
            <div className="message-bubble other-message">
              <div className="message-avatar">
                <Avatar
                  size={40}
                  src={isAIChat ? AI_AVATAR_URL : undefined}
                  icon={isAIChat ? <RobotOutlined /> : (isGroupChat ? <TeamOutlined /> : <UserOutlined />)}
                />
              </div>
              <div className="message-content">
                <div className="message-text">
                  <LoadingAnimation />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="message-input">
          <div className="input-container">
            <Input.TextArea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              placeholder={isAIChat ? t('chat.inputPlaceholder') : t('chat.inputPlaceholder')}
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ flex: 1 }}
            />
            <div className="input-actions">
              <Button
                type="text"
                icon={<SmileOutlined />}
                onClick={() => setShowEmoji(!showEmoji)}
                title={t('chat.emojiButton')}
              />
              <Upload
                accept="*/*"  // 接受所有文件类型
                fileList={fileList}
                onChange={({ fileList, file }) => {
                  setFileList(fileList);
                  if (file.status === 'done') {
                    handleFileUpload(file.originFileObj as File);
                  }
                }}
                beforeUpload={(file) => {
                  // 统一文件大小限制为10MB
                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error(t('errors.file.sizeLimitExceeded', { size: 10 }));
                    return false;
                  }
                  return true;
                }}
                customRequest={({ onSuccess }) => {
                  setTimeout(() => {
                    onSuccess?.('ok');
                  }, 0);
                }}
              >
                <Button
                  type="text"
                  icon={<UploadOutlined />}
                  title={t('chat.attachFiles')}
                />
              </Upload>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={loading}
              />
            </div>
            {showEmoji && (
              <div className="emoji-picker">
                {emojis.map(emoji => (
                  <span
                    key={emoji}
                    className="emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal
        open={previewVisible}
        title={previewFile?.name || t('chat.preview.title')}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        {previewFile?.type?.startsWith('image/') ? (
          <img src={previewFile.url} alt={previewFile.name} style={{ width: '100%' }} />
        ) : (
          <div className="preview-error">{t('chat.preview.unsupported')}</div>
        )}
      </Modal>
      {/* 图片预览模态框 */}
      <Modal
        open={!!imagePreview}
        footer={null}
        onCancel={handleCloseImagePreview}
        width="auto"
        centered
        styles={{ body: { padding: 0 } }}
        className="image-preview-modal"
      >
        {imagePreview && (
          <img
            src={imagePreview}
            alt={t('chat.preview.title')}
            style={{ maxWidth: '100%', maxHeight: '80vh' }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ChatPage;