import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Tooltip, Upload, Modal } from 'antd';
import { 
  FileOutlined, 
  PictureOutlined, 
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useTranslation } from 'react-i18next';
import './style.css';

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

interface ChatBoxProps {
  messages: Message[];
  onSendMessage: (content: string, files?: File[]) => void;
  placeholder?: string;
  showAvatar?: boolean;
  showUsername?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  placeholder,
  showAvatar = true,
  showUsername = true,
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() || fileList.length > 0) {
      const files = fileList
        .filter(file => file.originFileObj)
        .map(file => file.originFileObj as File);
      onSendMessage(inputValue.trim(), files);
      setInputValue('');
      setFileList([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-box">
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className="message">
            {showAvatar && (
              <Avatar
                src={message.sender.avatar}
                icon={!message.sender.avatar && <UserOutlined />}
                className="avatar"
              />
            )}
            <div className="message-content">
              {showUsername && (
                <div className="sender-name">{message.sender.name}</div>
              )}
              <div className="text">{message.content}</div>
              {message.files && message.files.length > 0 && (
                <div className="message-files">
                  {message.files.map((file, fileIndex) => (
                    <div key={fileIndex} className="file-item">
                      {file.type.startsWith('image/') ? (
                        <img src={file.url} alt={file.name} onClick={() => {
                          setPreviewImage(file.url);
                          setPreviewTitle(file.name);
                          setPreviewOpen(true);
                        }} />
                      ) : (
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <FileOutlined /> {file.name}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="timestamp">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <div className="input-container">
          <Input.TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || t('upload.message')}
            autoSize={{ minRows: 1, maxRows: 6 }}
            className="chat-input"
          />
          <div className="input-actions">
            <Upload
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              onPreview={handlePreview}
              multiple
              beforeUpload={() => false}
            >
              <Tooltip title={t('upload.file')}>
                <Button type="text" icon={<FileOutlined />} />
              </Tooltip>
            </Upload>
            <Upload
              accept="image/*"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              onPreview={handlePreview}
              multiple
              beforeUpload={() => false}
            >
              <Tooltip title={t('upload.image')}>
                <Button type="text" icon={<PictureOutlined />} />
              </Tooltip>
            </Upload>
            <Button
              type="text"
              icon={<SendOutlined />}
              onClick={handleSend}
              className={`send-button ${inputValue.trim() || fileList.length > 0 ? 'active' : ''}`}
            />
          </div>
        </div>
      </div>
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default ChatBox; 