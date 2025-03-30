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

const ChannelPage: React.FC = () => {
  const { t } = useTranslation();
  const { servers, currentServer, setCurrentServer, addServer } = useServer();
  const { avatar } = useAvatar();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChannelModalVisible, setIsChannelModalVisible] = useState(false);
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

  // 模拟的消息数据
  useEffect(() => {
    if (selectedChannel) {
      const mockMessages: Message[] = [
        {
          id: '1',
          content: t('channel.messages.welcome', { channelName: selectedChannel.name }),
          sender: {
            id: 'system',
            name: t('common.system'),
            avatar: undefined
          },
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(mockMessages);
    }
  }, [selectedChannel, t]);

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

  const handleServerSelect = (serverId: string) => {
    setCurrentServer(serverId);
    setSelectedChannel(null);
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    
    // 在移动端选择频道后显示内容区域
    if (isMobile) {
      setShowContent(true);
    }
  };

  const handleAddServer = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const newServer: Server = {
        id: Date.now().toString(),
        name: values.name,
        description: values.description,
        ownerId: 'user1',
        members: ['user1'],
        channels: [
          {
            id: 'channel-' + Date.now(),
            name: t('channel.default'),
            type: 'text',
            serverId: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatar: values.avatar?.[0]?.response?.url
      };

      if (fileList.length > 0 && fileList[0].thumbUrl) {
        newServer.avatar = fileList[0].thumbUrl;
      }

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

  const handleAddChannel = () => {
    setIsChannelModalVisible(true);
  };

  const handleChannelModalOk = async () => {
    try {
      const values = await channelForm.validateFields();
      if (currentServer) {
        const newChannel: Channel = {
          id: 'channel-' + Date.now(),
          name: values.name,
          type: values.type,
          serverId: currentServer.id,
          description: values.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        currentServer.channels.push(newChannel);
        setCurrentServer(currentServer.id);
        
        setIsChannelModalVisible(false);
        channelForm.resetFields();
        message.success(t('channel.form.createSuccess'));
      }
    } catch (error) {
      message.error(t('channel.form.createError'));
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

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!selectedChannel) return;

    setLoading(true);
    try {
      // 这里应该调用后端API发送消息
      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: {
          id: 'current-user-id',
          name: t('chat.currentUser'),
          avatar: avatar || undefined
        },
        timestamp: new Date().toISOString(),
        files: files?.map(file => ({
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type
        }))
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error(t('errors.chat.sendFailed'), error);
      message.error(t('errors.chat.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 搜索消息
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    if (value.trim()) {
      setIsSearching(true);
      const results = messages.filter(msg => 
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
            {/* 在移动端和内容区域添加返回按钮 */}
            {isMobile && (
              <Button 
                type="text" 
                className="back-to-channels-btn"
                icon={<ArrowLeftOutlined />} 
                onClick={handleBackToChannels}
              >
                {t('common.back')}
              </Button>
            )}
            <div className="channel-header">
              <h2>{selectedChannel.name}</h2>
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
                  messages={isSearching ? searchResults : messages}
                  onSendMessage={handleSendMessage}
                  placeholder={t('channel.placeholders.message', { channelName: selectedChannel.name })}
                  showAvatar={true}
                  showUsername={true}
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