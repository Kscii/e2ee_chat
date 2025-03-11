import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Flex, Splitter } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageOutlined,
  UserOutlined,
  SettingOutlined,
  TeamOutlined,
  LogoutOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import './MainLayout.css';
import { useAI } from '../contexts/AIContext';

const { Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { aiEnabled } = useAI();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [siderWidth, setSiderWidth] = useState(240);
  const [lastNormalWidth, setLastNormalWidth] = useState(240);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 检测屏幕宽度并自动折叠
  useEffect(() => {
    const checkWidth = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setCollapsed(mobile);
      if (mobile) {
        setSiderWidth(0);
        setShowMobileMenu(false);
      } else {
        setSiderWidth(lastNormalWidth);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [lastNormalWidth]);

  // 处理折叠状态变化
  const handleCollapse = (newCollapsed: boolean) => {
    if (isMobile) {
      setShowMobileMenu(!showMobileMenu);
      setSiderWidth(showMobileMenu ? 0 : 80);
    } else {
      setCollapsed(newCollapsed);
      if (newCollapsed) {
        setLastNormalWidth(siderWidth);
        setSiderWidth(80);
      } else {
        setSiderWidth(lastNormalWidth);
      }
    }
  };

  // 当AI功能被关闭时，如果当前在AI页面，则重定向到聊天页面
  useEffect(() => {
    if (!aiEnabled && location.pathname === '/ai') {
      navigate('/chat');
    }
  }, [aiEnabled, location.pathname, navigate]);

  // 菜单项配置
  const items: MenuItem[] = [
    getItem(t('common.directMessages'), 'direct-messages', <MessageOutlined />, [
      getItem('Alice', 'user-1'),
      getItem('Bob', 'user-2'),
      getItem('Charlie', 'user-3'),
    ]),
    getItem(t('common.groups'), 'groups', <TeamOutlined />, [
      getItem('Development Team', 'group-1'),
      getItem('General Chat', 'group-2'),
    ]),
    ...(aiEnabled ? [getItem(t('settings.ai.title'), 'ai', <RobotOutlined />)] : []),
    getItem(t('common.settings'), 'settings', <SettingOutlined />),
  ];

  // 用户下拉菜单项
  const userMenuItems = [
    {
      key: 'settings',
      label: t('common.settings'),
      icon: <SettingOutlined />,
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      label: t('common.logout'),
      icon: <LogoutOutlined />,
      onClick: () => navigate('/login'),
    },
  ];

  // 处理菜单点击
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key.startsWith('user-') || e.key.startsWith('group-')) {
      navigate(`/chat/${e.key}`);
    } else if (e.key === 'settings') {
      navigate('/settings');
    } else if (e.key === 'ai') {
      navigate('/ai');
    }
  };

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname.split('/')[2];
    return [path || 'direct-messages'];
  };

  return (
    <Flex className="app-layout">
      <Button
        type="text"
        icon={showMobileMenu ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => handleCollapse(!collapsed)}
        className={`mobile-menu-button ${isMobile ? 'show' : ''}`}
      />
      <Splitter
        style={{
          width: '100%',
          height: '100vh',
        }}
        onResize={(sizes: number[]) => {
          if (!collapsed && !isMobile) {
            setSiderWidth(sizes[0]);
            setLastNormalWidth(sizes[0]);
          }
        }}
      >
        <Splitter.Panel
          min={collapsed ? 80 : 200}
          max="50%"
          defaultSize={siderWidth}
          size={siderWidth}
        >
          <Flex vertical className={`app-sider ${showMobileMenu ? 'show' : ''}`}>
            <div className="user-profile">
              <Dropdown menu={{ items: userMenuItems }} placement="topRight">
                <div className="user-info">
                  <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                  {!collapsed && <span className="username">{t('settings.profile.name')}</span>}
                </div>
              </Dropdown>
            </div>
            {!isMobile && (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => handleCollapse(!collapsed)}
                className="menu-collapse-button"
              />
            )}
            <Menu
              theme={isDarkMode ? 'dark' : 'light'}
              defaultSelectedKeys={['direct-messages']}
              selectedKeys={getSelectedKey()}
              mode="inline"
              items={items}
              onClick={(e) => {
                handleMenuClick(e);
                if (isMobile) {
                  setShowMobileMenu(false);
                  setSiderWidth(0);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                flex: 1,
              }}
              inlineCollapsed={collapsed}
            />
          </Flex>
        </Splitter.Panel>
        <Splitter.Panel>
          <Flex vertical className="main-layout">
            <Content className="main-content">
              <Outlet />
            </Content>
          </Flex>
        </Splitter.Panel>
      </Splitter>
    </Flex>
  );
};

export default MainLayout; 