import React from 'react';
import { List, Avatar, Typography, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import './ChannelList.css';

export interface Channel {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
}

interface ChannelListProps {
  channels: Channel[];
  activeChannel?: string;
  onChannelSelect: (channelId: string) => void;
  onAddChannel?: () => void;
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannel,
  onChannelSelect,
  onAddChannel,
}) => {
  return (
    <div className="channel-list">
      <List
        itemLayout="horizontal"
        dataSource={channels}
        renderItem={(channel) => (
          <Tooltip title={channel.name} placement="right">
            <div
              className={`channel-item ${channel.id === activeChannel ? 'active' : ''}`}
              onClick={() => onChannelSelect(channel.id)}
            >
              <Avatar
                src={channel.avatar}
                className="channel-avatar"
              >
                {!channel.avatar && channel.name.charAt(0).toUpperCase()}
              </Avatar>
            </div>
          </Tooltip>
        )}
      />
      {onAddChannel && (
        <Tooltip title="添加新服务器" placement="right">
          <div className="add-channel-button" onClick={onAddChannel}>
            <PlusOutlined />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default ChannelList; 