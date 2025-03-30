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
  AppstoreOutlined,
  BulbOutlined,
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
  const { isDarkMode, toggleTheme } = useTheme();
  const { aiEnabled } = useAI();
  const { t } = useTranslation();
  const isChannelsPage = location.pathname === '/channels';

  const [collapsed, setCollapsed] = useState(isChannelsPage || false);
  const [siderWidth, setSiderWidth] = useState(isChannelsPage ? 80 : 240);
  const [lastNormalWidth, setLastNormalWidth] = useState(240);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // 从 localStorage 初始化 openKeys
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const savedOpenKeys = localStorage.getItem('menuOpenKeys');
    return savedOpenKeys ? JSON.parse(savedOpenKeys) : [];
  });

  // 保存 openKeys 到 localStorage
  useEffect(() => {
    localStorage.setItem('menuOpenKeys', JSON.stringify(openKeys));
  }, [openKeys]);

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

  // 监听路径变化，强制channels页面折叠
  useEffect(() => {
    if (isChannelsPage) {
      setCollapsed(true);
      setSiderWidth(80); // 折叠宽度
    }
  }, [location.pathname, isChannelsPage]);

  // 修改handleCollapse函数
  const handleCollapse = (value: boolean) => {
    // 如果是channels页面，且尝试展开，则阻止操作
    if (isChannelsPage && !value) {
      return;
    }
    
    setCollapsed(value);
    if (value) {
      setLastNormalWidth(siderWidth);
      setSiderWidth(80);
    } else {
      setSiderWidth(lastNormalWidth);
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
    getItem(t('navigation.channels'), 'channels', <AppstoreOutlined />),
    getItem(t('navigation.directMessages'), 'direct-messages', <MessageOutlined />, [
      getItem('Alice', 'user-1'),
      getItem('Bob', 'user-2'),
      getItem('Charlie', 'user-3'),
    ]),
    getItem(t('navigation.groups'), 'groups', <TeamOutlined />, [
      getItem('Development Team', 'group-1'),
      getItem('General Chat', 'group-2'),
    ]),
    ...(aiEnabled ? [getItem(t('navigation.ai'), 'ai', <RobotOutlined />)] : []),
    getItem(t('navigation.settings'), 'settings', <SettingOutlined />),
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
    if (e.key === 'channels') {
      navigate('/channels');
      handleCollapse(true);
    } else if (e.key.startsWith('user-') || e.key.startsWith('group-')) {
      navigate(`/chat/${e.key}`);
    } else if (e.key === 'settings') {
      navigate('/settings');
    } else if (e.key === 'ai') {
      navigate('/ai');
    }

    // 在移动设备上点击菜单项后收起菜单
    if (isMobile) {
      setShowMobileMenu(false);
      setSiderWidth(0);
    }
  };

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname.split('/')[2];
    return [path || 'direct-messages'];
  };

  // 处理子菜单展开/收起
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
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
          if (!collapsed && !isMobile && !isChannelsPage) {
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
              onClick={handleMenuClick}
              openKeys={openKeys}
              onOpenChange={handleOpenChange}
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