import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Layout, Button, Input, Tooltip, Modal, Form, Upload, message, Menu, Dropdown, Radio, Avatar } from 'antd';
import {
  UserOutlined,
  BellOutlined,
  PushpinOutlined,
  UsergroupAddOutlined,
  SearchOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  NumberOutlined,
  SoundOutlined,
  AudioMutedOutlined,
  AudioOutlined,
  SettingOutlined,
  LogoutOutlined,
  WarningOutlined,
  SmileOutlined,
  GiftOutlined,
  PictureOutlined,
  SendOutlined,
  FileOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useServer } from '../../contexts/ServerContext';
import type { Server, Channel } from '../../types/server';
import type { UploadFile } from 'antd/es/upload/interface';
import useVoiceChat from '../../hooks/useVoiceChat';
import ChatBox from '../../components/ChatBox';
import { useAvatar } from '../../contexts/AvatarContext';
import './ChannelPage.css';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
// 导入加密相关API和上下文
import { getGroupMembers, sendEncryptedGroupMessages, getEncryptedGroupMessages, createNewGroup, getAllGroups } from '../../api/message';
import { getOrFetchPublicKey } from '../../api/keys';
import { CryptoService } from '../../utils/crypto';
import { useAuth } from '../../contexts/AuthContext';
import { useCrypto } from '../../contexts/CryptoContext';

// 从环境变量获取API URL，与message.ts中相同
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const { Content, Sider } = Layout;

interface Message {
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

// 加密消息接口
interface EncryptedMessage {
  id: number;
  group_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  original_message_id?: number;
  created_at: string;
  sender_username: string;
  message_timestamp?: string;
}

const ChannelPage: React.FC = () => {
  const { t } = useTranslation();
  const { servers, currentServer, setCurrentServer, addServer } = useServer();
  const { avatar } = useAvatar();
  const { user } = useAuth(); // 获取用户信息
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChannelModalVisible, setIsChannelModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [channelForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [joinedVoiceChannel, setJoinedVoiceChannel] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  // 加密消息状态
  const [encryptedMessages, setEncryptedMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  // 添加群组状态
  const [groups, setGroups] = useState<{ id: number, name: string, server_id: number }[]>([]);

  // 使用语音通话hook
  const { stream, error: voiceError, isStreaming } = useVoiceChat({
    channelId: joinedVoiceChannel,
    isMuted
  });

  // 显示麦克风错误
  useEffect(() => {
    if (voiceError) {
      setMicPermissionError(voiceError);
      message.error(voiceError);
    }
  }, [voiceError]);

  // 组件初始化时加载所有群组
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // 获取所有群组
        const groupsData = await getAllGroups();
        setGroups(groupsData);

        // 如果当前server有频道，显示现有频道
        if (currentServer) {
          // 从数据库中的群组数据创建频道列表
          const existingChannelIds = currentServer.channels.map(ch => ch.id);

          // 将每个群组转换为频道，如果该频道不存在
          // 同时过滤掉id为1的群组，这个群组不应该在channel页面显示
          // 只显示属于当前服务器的群组（server_id等于当前服务器ID）
          const newChannels: Channel[] = groupsData
            .filter(group =>
              !existingChannelIds.includes(`channel-${group.id}`) &&
              group.id !== 1 &&
              group.server_id === parseInt(currentServer.id, 10)
            )
            .map(group => ({
              id: `channel-${group.id}`,
              name: group.name,
              type: 'text' as const, // 使用 as const 确保类型是 'text' 而不是 string
              serverId: currentServer.id,
              description: '', // 群组API可能不包含description，使用空字符串
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

          // 只有在有新频道时才更新
          if (newChannels.length > 0) {
            // 将新频道添加到当前服务器的频道列表中
            currentServer.channels = [...currentServer.channels, ...newChannels];
            // 更新当前服务器状态，触发重新渲染
            setCurrentServer(currentServer.id);
            console.log('已从数据库同步群组到频道:', newChannels);
          }

          // 如果有频道但没有选中的频道，选择第一个频道
          if (currentServer.channels.length > 0 && !selectedChannel) {
            setSelectedChannel(currentServer.channels[0]);
          }
        }
      } catch (error) {
        console.error('获取群组列表失败:', error);
        message.error('获取群组列表失败');
      }
    };

    if (user) {
      fetchGroups();
    }
  }, [user, currentServer?.id]);

  // 获取加密消息 - 修改为按照选中的频道（群组）获取消息
  const fetchEncryptedMessages = async () => {
    if (!user || !selectedChannel) return;

    try {
      // 获取群组ID - 修复NaN错误
      let groupId = 1; // 默认群组ID
      if (selectedChannel.id && selectedChannel.id.startsWith('channel-')) {
        const idMatch = selectedChannel.id.match(/channel-(\d+)/);
        if (idMatch && idMatch[1]) {
          groupId = parseInt(idMatch[1], 10);
        }
      }

      // 确保groupId有效
      if (isNaN(groupId)) {
        console.error('无效的群组ID:', selectedChannel.id);
        message.error('无法确定群组ID，请重新选择频道');
        return;
      }

      console.log('获取群组ID:', groupId, '的消息');

      // 使用频道ID作为群组ID获取加密消息
      const encryptedMessagesData = await getEncryptedGroupMessages(groupId);
      setEncryptedMessages(encryptedMessagesData as unknown as EncryptedMessage[]);

      // 解密消息
      await decryptMessages(encryptedMessagesData as unknown as EncryptedMessage[]);
    } catch (error) {
      console.error('获取加密消息失败:', error);
      message.error('获取加密消息失败');
    }
  };

  // 解密消息
  const decryptMessages = async (encryptedMessagesData: EncryptedMessage[]) => {
    if (!encryptedMessagesData.length) return;

    const myKeyPair = CryptoService.getUserKeyPair();
    if (!myKeyPair) {
      message.error('未找到密钥对，无法解密消息');
      return;
    }

    const mySecretKey = CryptoService.stringToKey(myKeyPair.secretKey);

    // 获取并缓存所有发送者的公钥
    const senderPublicKeys = new Map<string, Uint8Array>();

    for (const msg of encryptedMessagesData) {
      if (senderPublicKeys.has(msg.sender_username)) continue;

      try {
        const publicKey = await getOrFetchPublicKey(msg.sender_username);
        senderPublicKeys.set(
          msg.sender_username,
          CryptoService.stringToKey(publicKey)
        );
      } catch (error) {
        console.error(`获取用户 ${msg.sender_username} 的公钥失败:`, error);
      }
    }

    // 解密消息并更新UI
    const decryptedMsgs = new Map<string, string>();

    for (const msg of encryptedMessagesData) {
      try {
        const senderPublicKey = senderPublicKeys.get(msg.sender_username);
        if (!senderPublicKey) continue;

        const decrypted = CryptoService.decryptMessage(
          msg.content,
          senderPublicKey,
          mySecretKey
        );

        if (decrypted) {
          decryptedMsgs.set(msg.id.toString(), decrypted);
        }
      } catch (error) {
        console.error(`解密消息 ${msg.id} 失败:`, error);
      }
    }

    // 更新UI，在渲染消息时使用
    setDecryptedMessages(decryptedMsgs);
  };

  // 在选择频道后加载消息 - 修改为仅在直接加载时执行
  useEffect(() => {
    if (selectedChannel && !loading) {
      // 仅当selectedChannel变化且不是由handleChannelSelect函数触发的加载时执行
      // 避免与handleChannelSelect中的加载重复
      if (!isMobile) {
        // 移除系统欢迎消息，直接初始化为空数组
        setMessages([]);

        // 加载加密消息
        fetchEncryptedMessages();
      }
    }
  }, [selectedChannel]);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 控制MainLayout菜单的显示与隐藏
  useLayoutEffect(() => {
    if (isMobile) {
      // 获取MainLayout的侧边栏元素和菜单按钮
      const mainSider = document.querySelector('.app-sider') as HTMLElement;
      const mobileMenuButton = document.querySelector('.mobile-menu-button') as HTMLElement;

      if (mainSider && mobileMenuButton) {
        // 保留移动菜单按钮的位置和层级，但不修改其原有行为
        mobileMenuButton.style.display = 'flex';
        mobileMenuButton.style.top = '10px';
        mobileMenuButton.style.right = '10px';
        mobileMenuButton.style.zIndex = '1002';

        // 使用MutationObserver监听MainLayout侧边栏的class变化
        // 这样可以保持与MainLayout组件的状态同步
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              // 检测.show类是否存在来判断菜单是否打开
              const isMenuOpen = mainSider.classList.contains('show');

              // 更新Channel页面的显示状态
              const channelPageElement = document.querySelector('.channel-page') as HTMLElement;
              if (channelPageElement) {
                if (isMenuOpen) {
                  channelPageElement.classList.add('dimmed');
                  channelPageElement.style.opacity = '0.3';
                  channelPageElement.style.pointerEvents = 'none';
                } else {
                  channelPageElement.classList.remove('dimmed');
                  channelPageElement.style.opacity = '1';
                  channelPageElement.style.pointerEvents = 'auto';
                }
              }
            }
          });
        });

        // 观察侧边栏的class属性变化
        observer.observe(mainSider, { attributes: true });

        // 清理函数
        return () => {
          observer.disconnect();
          // 清理我们添加的样式，不影响MainLayout的状态
          const channelPageElement = document.querySelector('.channel-page') as HTMLElement;
          if (channelPageElement) {
            channelPageElement.classList.remove('dimmed');
            channelPageElement.style.removeProperty('opacity');
            channelPageElement.style.removeProperty('pointer-events');
          }

          // 去除移动按钮的自定义样式
          if (mobileMenuButton) {
            mobileMenuButton.style.removeProperty('top');
            mobileMenuButton.style.removeProperty('right');
            mobileMenuButton.style.removeProperty('z-index');
          }
        };
      }
    }

    return undefined;
  }, [isMobile]);

  // 发送端到端加密消息 - 使用当前选中的频道/群组
  const sendEncryptedMessage = async (content: string, files?: File[]) => {
    if (!user || !selectedChannel) return;

    try {
      // 获取我的密钥
      const myKeyPair = CryptoService.getUserKeyPair();
      if (!myKeyPair) {
        message.error('未找到密钥对，无法发送加密消息');
        return false;
      }

      const mySecretKey = CryptoService.stringToKey(myKeyPair.secretKey);

      // 获取群组ID - 修复NaN错误
      let groupId = 1; // 默认群组ID
      if (selectedChannel.id && selectedChannel.id.startsWith('channel-')) {
        const idMatch = selectedChannel.id.match(/channel-(\d+)/);
        if (idMatch && idMatch[1]) {
          groupId = parseInt(idMatch[1], 10);
        }
      }

      // 确保groupId有效
      if (isNaN(groupId)) {
        console.error('无效的群组ID:', selectedChannel.id);
        message.error('无法确定群组ID，请重新选择频道');
        return false;
      }

      console.log('使用群组ID:', groupId);

      // 获取频道所有成员
      const members = await getGroupMembers(groupId);

      // 为每个成员加密消息（包括自己）
      const encryptedMessages = await Promise.all(
        members.map(async (member) => {
          try {
            // 获取成员公钥
            const publicKey = await getOrFetchPublicKey(member.username);
            const publicKeyBytes = CryptoService.stringToKey(publicKey);

            // 加密消息
            const encrypted = CryptoService.encryptMessage(
              content,
              publicKeyBytes,
              mySecretKey
            );

            return {
              recipient: member.username,
              content: encrypted
            };
          } catch (error) {
            console.error(`为用户 ${member.username} 加密消息失败:`, error);
            return null;
          }
        })
      );

      // 过滤掉失败的加密
      const validMessages = encryptedMessages.filter(msg => msg !== null);

      if (validMessages.length === 0) {
        message.error('所有加密操作失败，无法发送消息');
        return false;
      }

      // 发送加密消息，指定群组ID
      await sendEncryptedGroupMessages(validMessages, groupId);

      // 刷新消息列表
      await fetchEncryptedMessages();

      return true;
    } catch (error) {
      console.error('发送加密消息失败:', error);
      message.error('发送加密消息失败');
      return false;
    }
  };

  // 修改处理发送消息函数
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!selectedChannel) return;

    setLoading(true);
    try {
      // 使用加密消息API
      const success = await sendEncryptedMessage(content, files);

      if (success) {
        // 不再添加临时消息，只依赖从服务器获取的消息
        // 服务器返回的消息会通过fetchEncryptedMessages获取并显示
        await fetchEncryptedMessages();
      }
    } catch (error) {
      console.error(t('errors.chat.sendFailed'), error);
      message.error(t('errors.chat.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 将解密后的消息转换为UI消息格式，与消息合并
  const getMessagesForDisplay = () => {
    // 首先处理原始消息（系统欢迎消息等）
    const displayMessages = [...messages];

    // 用于检测重复消息的集合
    const messageContents = new Set(messages.map(msg => msg.content));

    // 然后添加解密后的加密消息
    encryptedMessages.forEach(msg => {
      const decryptedContent = decryptedMessages.get(msg.id.toString());
      if (decryptedContent) {
        // 只有当消息内容不在已有消息中时才添加，避免重复显示
        if (!messageContents.has(decryptedContent)) {
          displayMessages.push({
            id: `encrypted-${msg.id}`,
            content: decryptedContent,
            sender: {
              id: msg.sender_id.toString(),
              name: msg.sender_username,
              // 修复avatar类型问题
              avatar: msg.sender_username === user?.username ? (avatar || undefined) : undefined
            },
            timestamp: msg.created_at
          });
          messageContents.add(decryptedContent);
        }
      }
    });

    // 按时间排序
    return displayMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const handleServerSelect = (serverId: string) => {
    setCurrentServer(serverId);
    setSelectedChannel(null);
  };

  const handleChannelSelect = async (channel: Channel) => {
    setSelectedChannel(channel);

    // 先开始加载消息
    if (channel.type === 'text') {
      setLoading(true);
      try {
        // 清空消息，准备加载新消息
        setMessages([]);

        // 获取群组ID
        let groupId = 1;
        if (channel.id && channel.id.startsWith('channel-')) {
          const idMatch = channel.id.match(/channel-(\d+)/);
          if (idMatch && idMatch[1]) {
            groupId = parseInt(idMatch[1], 10);
          }
        }

        // 预加载消息数据
        await fetchEncryptedMessages();
      } catch (error) {
        console.error('加载频道消息失败:', error);
      } finally {
        setLoading(false);
      }
    }

    // 在移动端选择频道后显示内容区域
    if (isMobile) {
      // 添加短暂延迟确保DOM更新
      setTimeout(() => {
        setShowContent(true);

        // 强制重排确保移动端视图切换
        if (window.innerWidth >= 480 && window.innerWidth <= 580) {
          const contentElement = document.querySelector('.channel-content') as HTMLElement;
          if (contentElement) {
            // 触发重排
            contentElement.style.display = 'none';
            void contentElement.offsetHeight; // 强制重排
            contentElement.style.display = 'flex';
          }
        }
      }, 50);
    }
  };

  const handleAddServer = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // 获取头像URL
      let avatarUrl = undefined;
      if (fileList.length > 0) {
        avatarUrl = fileList[0].thumbUrl || fileList[0]?.response?.url;
      }

      // 创建服务器对象
      const serverData = {
        name: values.name,
        description: values.description,
        avatar: avatarUrl,
      };

      // 添加服务器（ServerContext中的addServer已更新为调用API）
      const newServerId = Date.now().toString(); // 仅用作临时ID，API会返回实际ID
      const newServer: Server = {
        id: newServerId,
        name: values.name,
        description: values.description,
        ownerId: user?.username || 'Anon', // 使用username作为所有者ID
        members: [user?.username || 'Anon'],
        channels: [], // 不再预设频道，由API创建
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatar: avatarUrl
      };

      addServer(newServer);
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      message.success(t('server.form.createSuccess'));
    } catch (error) {
      message.error(t('server.form.createError'));
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFileList([]);
  };

  // 修改添加频道（实际上是创建新群组）的函数
  const handleAddChannel = () => {
    setIsChannelModalVisible(true);
  };

  // 修改确认添加频道（创建新群组）的函数
  const handleChannelModalOk = async () => {
    if (isSubmitting) return; // 如果正在提交中，则不执行任何操作

    setIsSubmitting(true); // 设置提交状态为true

    try {
      const values = await channelForm.validateFields();

      // 创建新群组
      const newGroupName = values.name;
      const newGroupDescription = values.description || '';

      // 获取现有的所有群组ID
      const allGroups = await getAllGroups();
      const existingIds = allGroups.map(group => group.id);

      // 寻找最小的未被占用的ID（从2开始检查，确保ID为1的群组保留）
      let nextId = 2;
      while (existingIds.includes(nextId)) {
        nextId++;
      }

      console.log('将使用下一个可用的群组ID:', nextId);

      // 获取所有用户作为群组成员
      const token = localStorage.getItem('token');
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const usersData = await usersResponse.json();
      const members = usersData?.users?.map((user: any) => user.username) || [];

      // 如果没有获取到用户列表，使用默认用户
      if (!members.length) {
        members.push("anon", "tomori", "rana", "soyo", "taki");
      }

      // 调用API创建新群组，并为其设置当前服务器ID
      const newGroup = await createNewGroup(
        newGroupName,
        newGroupDescription,
        members,
        currentServer ? parseInt(currentServer.id, 10) : 1 // 使用当前服务器ID，如果没有则默认为1
      );

      // 创建新的Channel对象使其在UI中显示
      if (currentServer) {
        const newChannel: Channel = {
          id: 'channel-' + newGroup.id, // 使用群组ID作为频道ID
          name: newGroupName,
          type: values.type,
          serverId: currentServer.id,
          description: newGroupDescription,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 添加到当前服务器的频道列表
        currentServer.channels.push(newChannel);
        setCurrentServer(currentServer.id);

        // 自动选中新创建的频道
        setSelectedChannel(newChannel);

        // 重新获取群组列表
        const updatedGroups = await getAllGroups();
        setGroups(updatedGroups);

        setIsChannelModalVisible(false);
        channelForm.resetFields();
        message.success(t('channel.form.createSuccess'));
      }
    } catch (error) {
      console.error('创建频道失败:', error);
      message.error(t('channel.form.createError'));
    } finally {
      setIsSubmitting(false); // 无论成功还是失败，都重置提交状态
    }
  };

  const handleChannelModalCancel = () => {
    setIsChannelModalVisible(false);
    channelForm.resetFields();
  };

  const handleVoiceChannelClick = (channelId: string) => {
    if (!joinedVoiceChannel) {
      setJoinedVoiceChannel(channelId);
      message.success(t('channel.messages.joinedVoice'));
    }
  };

  const handleLeaveVoiceChannel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setJoinedVoiceChannel(null);
    setIsMuted(false);
    setMicPermissionError(null);
    message.success(t('channel.messages.leftVoice'));
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    message.success(isMuted ? t('channel.actions.unmute') : t('channel.actions.mute'));
  };

  const renderVoiceStatus = () => {
    if (micPermissionError) {
      return (
        <Tooltip title={micPermissionError} placement="right">
          <WarningOutlined style={{ color: 'rgb(237, 66, 69)' }} />
        </Tooltip>
      );
    }
    if (isStreaming) {
      return isMuted ? <AudioMutedOutlined /> : <AudioOutlined />;
    }
    return <AudioOutlined />;
  };

  // 搜索消息
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    if (value.trim()) {
      setIsSearching(true);
      // 搜索所有显示的消息，包括解密后的消息
      const allMessages = getMessagesForDisplay();
      const results = allMessages.filter(msg =>
        msg.content.toLowerCase().includes(value.toLowerCase()) ||
        msg.sender.name.toLowerCase().includes(value.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  // 添加返回按钮的处理函数
  const handleBackToChannels = () => {
    setShowContent(false);

    // 确保在480-580px宽度区间下的视图切换正确
    if (window.innerWidth >= 480 && window.innerWidth <= 580) {
      // 延迟一下确保状态先更新
      setTimeout(() => {
        const serverListContainer = document.querySelector('.server-list-container') as HTMLElement;
        if (serverListContainer) {
          serverListContainer.style.visibility = 'visible';
          serverListContainer.style.display = 'flex';
          serverListContainer.style.transform = 'translateX(0)';
        }
      }, 50);
    }
  };

  const renderChannelItem = (channel: Channel) => {
    const isVoice = channel.type === 'voice';
    const isJoined = joinedVoiceChannel === channel.id;

    if (isVoice) {
      return (
        <div
          key={channel.id}
          className={`channel-item voice-channel ${isJoined ? 'active' : ''}`}
          onClick={() => handleVoiceChannelClick(channel.id)}
        >
          <div className="voice-channel-header">
            <SoundOutlined className="channel-icon" />
            <span>{channel.name}</span>
            {isJoined && (
              <div className="voice-status-indicator">
                <div className="status-dot" />
                <span>{t('channel.status.connected')}</span>
              </div>
            )}
          </div>
          {isJoined && (
            <>
              <div className="voice-controls">
                <Tooltip title={isMuted ? t('channel.actions.unmute') : t('channel.actions.mute')}>
                  <Button
                    type="text"
                    icon={renderVoiceStatus()}
                    onClick={handleMuteToggle}
                    className="voice-control-btn"
                  />
                </Tooltip>
                <Tooltip title={t('channel.settings')}>
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    className="voice-control-btn"
                  />
                </Tooltip>
                <Tooltip title={t('channel.leave')} placement="right">
                  <Button
                    type="text"
                    icon={<LogoutOutlined />}
                    onClick={handleLeaveVoiceChannel}
                    className="voice-control-btn leave-btn"
                  />
                </Tooltip>
              </div>
              <div className="voice-users">
                <Avatar.Group maxCount={3} size="small">
                  <Avatar icon={<UserOutlined />} />
                  {/* 这里可以显示其他在线用户的头像 */}
                </Avatar.Group>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div
        key={channel.id}
        className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
        onClick={() => handleChannelSelect(channel)}
      >
        <NumberOutlined />
        <span>{channel.name}</span>
      </div>
    );
  };

  return (
    <Layout className={`channel-page ${isMobile ? 'mobile' : ''} ${showContent ? 'show-content' : ''}`}>
      <div className="server-list-container">
        <div className="server-list">
          {servers.map(server => (
            <Tooltip key={server.id} title={server.name} placement="right">
              <div
                className={`server-item ${server.id === currentServer?.id ? 'active' : ''}`}
                onClick={() => handleServerSelect(server.id)}
              >
                {server.avatar ? (
                  <img src={server.avatar} alt={server.name} className="server-avatar" />
                ) : (
                  <div className="server-avatar">
                    {server.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Tooltip>
          ))}
          <Tooltip title={t('server.actions.add')} placement="right">
            <div className="add-server-button" onClick={handleAddServer}>
              <PlusOutlined />
            </div>
          </Tooltip>
        </div>

        {currentServer && (
          <Sider className="channel-list" width={isMobile ? "calc(100% - 70px)" : 300}>
            <div className="server-header">
              <h3>{currentServer.name}</h3>
            </div>
            <div className="channels">
              {currentServer.channels.map(channel => renderChannelItem(channel))}
              <Tooltip title={t('channel.actions.add')} placement="right">
                <div className="add-channel-button" onClick={handleAddChannel}>
                  <PlusOutlined />
                </div>
              </Tooltip>
            </div>
          </Sider>
        )}
      </div>

      <Content className="channel-content">
        {selectedChannel ? (
          <>
            <div className="channel-header">
              <div className="channel-title-area">
                {isMobile && (
                  <Button
                    type="text"
                    className="back-to-channels-btn"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBackToChannels}
                  >
                    {t('')}
                  </Button>
                )}
                <h2>{selectedChannel.name}</h2>
              </div>
              <div className="channel-header-actions">
                <Tooltip title={t('channel.actions.notifications')}>
                  <Button type="text" icon={<BellOutlined />} />
                </Tooltip>
                <Tooltip title={t('channel.actions.pinned')}>
                  <Button type="text" icon={<PushpinOutlined />} />
                </Tooltip>
                <Tooltip title={t('channel.actions.members')}>
                  <Button type="text" icon={<UsergroupAddOutlined />} />
                </Tooltip>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder={t('chat.actions.search')}
                  className="channel-search"
                  onChange={(e) => handleSearch(e.target.value)}
                  allowClear
                />
              </div>
            </div>
            <div className="channel-main">
              {selectedChannel.type === 'text' ? (
                <ChatBox
                  messages={isSearching ? searchResults : getMessagesForDisplay()}
                  onSendMessage={handleSendMessage}
                  showAvatar={true}
                  showUsername={true}
                  loading={loading}
                />
              ) : (
                <div className="welcome-message">
                  <h3>{t('channel.messages.welcome', { channelName: selectedChannel.name })}</h3>
                  <p>{selectedChannel.description || t('channel.messages.defaultDescription', { channelName: selectedChannel.name })}</p>
                </div>
              )}
              {isSearching && searchResults.length === 0 && (
                <div className="search-no-results">
                  {t('chat.search.noResults', { keyword: searchKeyword })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-channel-selected">
            {t('server.messages.selectChannel')}
          </div>
        )}
      </Content>

      <Modal
        title={t('server.createNew')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('server.form.name')}
            rules={[{ required: true, message: t('server.form.nameRequired') }]}
          >
            <Input placeholder={t('server.form.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="description"
            label={t('server.form.description')}
          >
            <Input.TextArea placeholder={t('server.form.descriptionPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="avatar"
            label={t('server.form.icon')}
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
            >
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>{t('server.form.uploadIcon')}</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('channel.create')}
        open={isChannelModalVisible}
        onOk={handleChannelModalOk}
        onCancel={handleChannelModalCancel}
        okButtonProps={{ disabled: isSubmitting }}
        confirmLoading={isSubmitting}
      >
        <Form form={channelForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('channel.form.name')}
            rules={[{ required: true, message: t('channel.form.createError') }]}
          >
            <Input placeholder={t('channel.placeholders.channelName')} />
          </Form.Item>
          <Form.Item
            name="type"
            label={t('channel.form.type')}
            rules={[{ required: true, message: t('channel.form.createError') }]}
            initialValue="text"
          >
            <Radio.Group>
              <Radio.Button value="text">
                <NumberOutlined /> {t('channel.types.text')}
              </Radio.Button>
              <Radio.Button value="voice">
                <SoundOutlined /> {t('channel.types.voice')}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="description"
            label={t('channel.form.description')}
          >
            <Input.TextArea placeholder={t('channel.placeholders.description')} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ChannelPage; 