import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Typography, Divider, Switch, Tooltip, Upload, message, Modal, Space } from 'antd';
import { 
  SendOutlined, 
  UserOutlined, 
  FileMarkdownOutlined, 
  SoundOutlined, 
  RobotOutlined,
  PaperClipOutlined,
  PictureOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../contexts/ThemeContext';
import { useMarkdown } from '../../contexts/MarkdownContext';
import { useParams, useLocation } from 'react-router-dom';
import { useAvatar } from '../../contexts/AvatarContext';
import { useTTS } from '../../contexts/TTSContext';
import { useAI } from '../../contexts/AIContext';
import { useTranslation } from 'react-i18next';
import './index.css';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text } = Typography;

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'other';
  timestamp: Date;
  type?: 'text' | 'image' | 'pdf' | 'word' | 'excel' | 'ppt' | 'txt' | 'file';
  fileInfo?: {
    name: string;
    url: string;
    type: string;
    previewUrl?: string;
  };
}

const ChatPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { markdownMode, toggleMarkdownMode } = useMarkdown();
  const { avatar } = useAvatar();
  const { ttsEnabled, autoRead, speak } = useTTS();
  const { aiEnabled, sendMessage } = useAI();
  const { t } = useTranslation();
  const { id: chatId } = useParams();
  const location = useLocation();
  const isAIChat = location.pathname === '/ai';

  // 模拟的聊天消息数据
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentContact, setCurrentContact] = useState({ name: '', isOnline: true });
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<Message['fileInfo']>();

  // 根据chatId加载对应的聊天记录和联系人信息
  useEffect(() => {
    if (isAIChat) {
      setCurrentContact({
        name: aiEnabled ? 'AI Assistant' : 'Chat Bot',
        isOnline: true
      });
      setMessages([
        {
          id: '1',
          content: t('chat.demoMessages.welcome'),
          sender: 'other',
          timestamp: new Date()
        }
      ]);
    } else {
      // 这里模拟从API获取数据
      // 实际应用中，这里应该调用后端API获取真实数据
      const mockMessages = [
        {
          id: '1',
          content: t('chat.demoMessages.question'),
          sender: 'other',
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: '2',
          content: t('chat.demoMessages.answer'),
          sender: 'user',
          timestamp: new Date(Date.now() - 3000000)
        },
        {
          id: '3',
          content: t('chat.demoMessages.followup'),
          sender: 'other',
          timestamp: new Date(Date.now() - 2400000)
        }
      ] as Message[];

      const mockContact = {
        name: chatId?.startsWith('user-') ? 'Contact' : 'Group Chat',
        isOnline: true
      };

      setMessages(mockMessages);
      setCurrentContact(mockContact);
    }
  }, [chatId, isAIChat, t, aiEnabled]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    try {
      if (isAIChat && !apiKey) {
        message.error(t('errors.api.configMissing'));
        return;
      }
      const userMessage: Message = {
        id: Date.now().toString(),
        content: inputValue.trim(),
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setLoading(true);

      // 自动朗读发送的消息
      if (autoRead) {
        speak(userMessage.content);
      }

      if (isAIChat) {
        // 只在AI聊天时调用sendMessage
        const aiResponse = await sendMessage(inputValue.trim());
        
        if (aiResponse) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'other',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // 自动朗读接收到的消息
          if (autoRead) {
            speak(aiMessage.content);
          }
        }
      } else {
        // 非AI聊天时，模拟一个简单的自动回复
        setTimeout(() => {
          const replyMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: t('chat.demoMessages.answer'),
            sender: 'other',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, replyMessage]);
          
          if (autoRead) {
            speak(replyMessage.content);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      message.error(t('errors.chat.sendFailed'));
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
      case 'pdf': return <FilePdfOutlined />;
      case 'word': return <FileWordOutlined />;
      case 'excel': return <FileExcelOutlined />;
      case 'ppt': return <FilePptOutlined />;
      case 'txt': return <FileTextOutlined />;
      default: return <PaperClipOutlined />;
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
    
    // 如果是文本文件，创建预览URL
    let previewUrl;
    if (type === 'txt') {
      const text = await file.text();
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
              <Tooltip title={t('common.preview')}>
                <Button type="text" icon={<EyeOutlined />} />
              </Tooltip>
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

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.type === 'image') {
      return (
        <img 
          src={message.fileInfo?.url} 
          alt="图片消息" 
          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => handlePreview(message.fileInfo!)}
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

  const handleClearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="chat-main">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar icon={isAIChat ? <RobotOutlined /> : <UserOutlined />} />
            <div className="chat-info">
              <Text strong>{currentContact.name}</Text>
              <Text type="secondary">{currentContact.isOnline ? '在线' : '离线'}</Text>
            </div>
          </div>
        </div>
        <Divider style={{ margin: '0 0 16px 0' }} />
        <div className="message-container">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'other-message'}`}
            >
              <div className="message-avatar">
                <Avatar 
                  size={40} 
                  src={msg.sender === 'user' ? avatar : undefined}
                  icon={msg.sender === 'user' ? <UserOutlined /> : (isAIChat ? <RobotOutlined /> : <UserOutlined />)}
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
                  {ttsEnabled && msg.type !== 'image' && msg.type !== 'file' && (
                    <Button
                      type="text"
                      size="small"
                      icon={<SoundOutlined />}
                      onClick={() => speak(msg.content)}
                      className="tts-button"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="message-input">
          <div className="input-container">
            <Input.TextArea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              placeholder={isAIChat ? "输入你的问题..." : "输入消息..."}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1 }}
            />
            <div className="input-actions">
              <Upload
                fileList={fileList}
                onChange={({ fileList, file }) => {
                  setFileList(fileList);
                  if (file.status === 'done') {
                    handleFileUpload(file.originFileObj as File);
                  }
                }}
                beforeUpload={(file) => {
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
                  icon={<PaperClipOutlined />}
                  title={t('chat.fileUpload.title')}
                />
              </Upload>
              <Upload
                accept="image/*"
                fileList={fileList}
                onChange={({ fileList, file }) => {
                  setFileList(fileList);
                  if (file.status === 'done') {
                    handleFileUpload(file.originFileObj as File);
                  }
                }}
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    message.error(t('errors.file.imageOnly'));
                    return false;
                  }
                  const isLt5M = file.size / 1024 / 1024 < 5;
                  if (!isLt5M) {
                    message.error(t('errors.file.sizeLimitExceeded', { size: 5 }));
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
                  icon={<PictureOutlined />}
                  title={t('chat.imageUpload.title')}
                />
              </Upload>
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                onClick={handleSend}
                loading={loading}
              />
            </div>
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
        {previewFile?.type.startsWith('image/') ? (
          <img src={previewFile.url} alt={previewFile.name} style={{ width: '100%' }} />
        ) : (
          <div className="preview-error">{t('chat.preview.unsupported')}</div>
        )}
      </Modal>
    </div>
  );
};

export default ChatPage; 