import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Flex, Splitter } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import './MainLayout.css';
import { useAI } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';
import { useAvatar } from '../contexts/AvatarContext';
import { getAllUsers } from '../api/auth';

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
  const { user } = useAuth(); // 获取当前登录的用户信息
  const { avatar } = useAvatar(); // 获取用户头像
  const isChannelsPage = location.pathname === '/channels';
  const [users, setUsers] = useState<{ id: number, username: string }[]>([]);

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

    // 在非移动设备上才设置折叠状态
    if (!isMobile) {
      setCollapsed(value);
    }
  };

  // 当AI功能被关闭时，如果当前在AI页面，则重定向到聊天页面
  useEffect(() => {
    if (!aiEnabled && location.pathname === '/ai') {
      navigate('/chat');
    }
  }, [aiEnabled, location.pathname, navigate]);

  // 获取所有用户
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await getAllUsers();
        // 过滤掉当前登录用户
        if (user && user.username) {
          const filteredUsers = userList.filter(u => u.username !== user.username);
          setUsers(filteredUsers);
        } else {
          setUsers(userList);
        }
      } catch (error) {
        console.error('获取用户列表失败:', error);
      }
    };

    fetchUsers();
  }, [user]); // 添加user作为依赖，确保用户登录状态变化时重新获取

  // 生成用户菜单项
  const generateUserItems = (): MenuItem[] => {
    if (!users || users.length === 0) {
      return [];
    }

    return users
      .filter(u => user?.username !== u.username) // 确保再次过滤掉当前用户
      .map(u => getItem(u.username, `user-${u.id}`));
  };

  // 菜单项配置
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      getItem(t('navigation.channels'), 'channels', <AppstoreOutlined />),
      getItem(t('navigation.directMessages'), 'direct-messages', <MessageOutlined />, generateUserItems()),
      getItem(t('navigation.groups'), 'groups', <TeamOutlined />),
      ...(aiEnabled ? [getItem(t('navigation.ai'), 'ai', <RobotOutlined />)] : []),
      getItem(t('navigation.settings'), 'settings', <SettingOutlined />),
    ];

    return items;
  };

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
    console.log('点击菜单项:', e.key);
    if (e.key === 'channels') {
      navigate('/channels');
      handleCollapse(true);
    } else if (e.key.startsWith('user-') || e.key.startsWith('group-')) {
      navigate(`/chat/${e.key}`);
    } else if (e.key === 'settings') {
      navigate('/settings');
    } else if (e.key === 'ai') {
      navigate('/ai');
    } else if (e.key === 'groups') {
      console.log('导航到群组聊天');
      navigate('/chat/groups');
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
        onClick={() => {
          // 在移动设备上，更新showMobileMenu状态
          if (isMobile) {
            const newState = !showMobileMenu;
            setShowMobileMenu(newState);
            setSiderWidth(newState ? 80 : 0);
          } else {
            // 非移动设备使用原有逻辑
            handleCollapse(!collapsed);
          }
        }}
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
          <Flex vertical className={`app-sider ${(showMobileMenu && isMobile) ? 'show' : ''}`}>
            <div className="user-profile">
              <Dropdown menu={{ items: userMenuItems }} placement="topRight">
                <div className="user-info">
                  {avatar ? (
                    <Avatar src={avatar} />
                  ) : (
                    <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                  )}
                  {!collapsed && <span className="username">{user?.username || t('settings.profile.name')}</span>}
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
              items={getMenuItems()}
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