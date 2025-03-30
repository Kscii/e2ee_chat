import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { UserStatus } from '../../types/user';
import StatusIndicator from '../StatusIndicator';
import './style.css';

interface UserAvatarProps {
  avatar?: string;
  username?: string;
  status?: UserStatus;
  size?: number | 'large' | 'small' | 'default';
  shape?: 'circle' | 'square';
  className?: string;
  showStatus?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  username,
  status = 'offline',
  size = 'default',
  shape = 'circle',
  className = '',
  showStatus = true,
}) => {
  const getFirstLetter = (name?: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '';
  };

  const getStatusIndicatorSize = () => {
    if (typeof size === 'number') {
      return size > 40 ? 'large' : size > 24 ? 'default' : 'small';
    }
    
    switch (size) {
      case 'large':
        return 'default';
      case 'small':
        return 'small';
      default:
        return 'small';
    }
  };

  return (
    <div className={`user-avatar-container ${className}`}>
      <Avatar
        size={size}
        shape={shape}
        src={avatar}
        icon={!avatar && !username && <UserOutlined />}
        className="user-avatar"
      >
        {!avatar && username && getFirstLetter(username)}
      </Avatar>
      
      {showStatus && (
        <div className="status-badge">
          <StatusIndicator 
            status={status} 
            size={getStatusIndicatorSize()}
          />
        </div>
      )}
    </div>
  );
};

export default UserAvatar; 