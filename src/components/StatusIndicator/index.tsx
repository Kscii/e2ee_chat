import React from 'react';
import { Tooltip } from 'antd';
import { UserStatus } from '../../types/user';
import { useTranslation } from 'react-i18next';
import './style.css';

interface StatusIndicatorProps {
  status: UserStatus;
  showTooltip?: boolean;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  showTooltip = true,
  size = 'default',
  className = ''
}) => {
  const { t } = useTranslation();
  
  const statusClasses = {
    online: 'status-online',
    idle: 'status-idle',
    dnd: 'status-dnd',
    offline: 'status-offline'
  };

  const statusText = {
    online: t('user.status.online'),
    idle: t('user.status.idle'),
    dnd: t('user.status.dnd'),
    offline: t('user.status.offline')
  };

  const sizeClasses = {
    small: 'status-small',
    default: 'status-default',
    large: 'status-large'
  };
  
  const indicator = (
    <div className={`status-indicator ${statusClasses[status]} ${sizeClasses[size]} ${className}`}>
      {status === 'dnd' && <div className="dnd-line"></div>}
      {status === 'idle' && <div className="idle-icon"></div>}
    </div>
  );
  
  if (showTooltip) {
    return (
      <Tooltip title={statusText[status]}>
        {indicator}
      </Tooltip>
    );
  }
  
  return indicator;
};

export default StatusIndicator; 