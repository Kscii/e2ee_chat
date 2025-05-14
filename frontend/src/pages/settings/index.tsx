import React, { useEffect, useState } from 'react';
import { Switch, Avatar, Typography, Divider, Upload, message, Input, Select, Slider, Spin } from 'antd';
import { UserOutlined, CameraOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useMarkdown } from '../../contexts/MarkdownContext';
import { useAvatar } from '../../contexts/AvatarContext';
import { useTTS } from '../../contexts/TTSContext';
import { useAI } from '../../contexts/AIContext';
import { useAPI } from '../../contexts/APIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLive2D } from '../../contexts/Live2DContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import './index.css';

const { Title } = Typography;
const { Option } = Select;

const SettingsPage: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { markdownMode, toggleMarkdownMode } = useMarkdown();
  const { avatar, setAvatar } = useAvatar();
  const { ttsEnabled, autoRead, ttsSpeed, toggleTTS, toggleAutoRead, setTTSSpeed } = useTTS();
  const { aiEnabled, toggleAI } = useAI();
  const { apiKey, setAPIKey } = useAPI();
  const { language, changeLanguage } = useLanguage();
  const { live2dEnabled, toggleLive2D } = useLive2D();
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  // 使用本地状态保存用户数据
  const [userData, setUserData] = useState({
    username: '',
    email: ''
  });

  // 监听用户数据变化
  useEffect(() => {
    if (user) {
      setUserData({
        username: user.username || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(t('errors.onlyImageAllowed'));
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error(t('errors.imageTooLarge'));
      return false;
    }
    return true;
  };

  const handleChange = async (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      return;
    }

    if (info.file.status === 'done') {
      try {
        // 如果有原始文件对象，使用文件URL
        if (info.file.originFileObj) {
          const imageUrl = URL.createObjectURL(info.file.originFileObj as Blob);
          setAvatar(imageUrl);
          message.success(t('settings.profile.avatarSuccess') || '头像设置成功');
        }
      } catch (error) {
        console.error('设置头像失败:', error);
        message.error(t('settings.profile.avatarError') || '头像设置失败');
      }
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-content">
        <div className="settings-section">
          <Title level={2}>{t('settings.profile.title')}</Title>
          <Divider />
          <div className="profile-section">
            <Upload
              name="file"
              listType="picture-circle"
              className="avatar-upload"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              action={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/upload-avatar`}
              headers={{
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`
              }}
            >
              {avatar ? (
                <div className="avatar-upload">
                  <Avatar size={64} src={avatar} />
                  <div className="avatar-overlay">
                    <CameraOutlined />
                  </div>
                </div>
              ) : (
                <div className="avatar-upload">
                  <Avatar size={64} icon={<UserOutlined />} />
                  <div className="avatar-overlay">
                    <CameraOutlined />
                  </div>
                </div>
              )}
            </Upload>
            <div className="profile-info">
              {isLoading ? (
                <Spin size="small" />
              ) : (
                <>
                  <span className="setting-label-title">{userData.username || t('settings.profile.name')}</span>
                  <span className="setting-label-description">{userData.email || t('settings.profile.email')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <Title level={2}>{t('settings.theme.title')}</Title>
          <Divider />
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.theme.dark')}</span>
              <span className="setting-label-description">{t('settings.theme.description')}</span>
            </div>
            <div className="setting-control">
              <Switch
                checked={isDarkMode}
                onChange={toggleTheme}
                checkedChildren={t('common.save')}
                unCheckedChildren={t('common.cancel')}
              />
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.theme.markdown')}</span>
              <span className="setting-label-description">{t('settings.theme.markdownDescription')}</span>
            </div>
            <div className="setting-control">
              <Switch
                checked={markdownMode}
                onChange={toggleMarkdownMode}
                checkedChildren={t('common.save')}
                unCheckedChildren={t('common.cancel')}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <Title level={2}>{t('settings.live2d.title')}</Title>
          <Divider />
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.live2d.enable')}</span>
              <span className="setting-label-description">{t('settings.live2d.description')}</span>
            </div>
            <div className="setting-control">
              <Switch
                checked={live2dEnabled}
                onChange={toggleLive2D}
                checkedChildren={t('common.save')}
                unCheckedChildren={t('common.cancel')}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <Title level={2}>{t('settings.language.title')}</Title>
          <Divider />
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.language.title')}</span>
              <span className="setting-label-description">{t('settings.language.description')}</span>
            </div>
            <div className="setting-control">
              <Select
                value={language}
                style={{ width: 180 }}
                onChange={changeLanguage}
                popupMatchSelectWidth={false}
              >
                <Option value="zh">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.zh')}
                  </div>
                </Option>
                <Option value="en">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.en')}
                  </div>
                </Option>
                <Option value="es">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.es')}
                  </div>
                </Option>
                <Option value="fr">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.fr')}
                  </div>
                </Option>
                <Option value="de">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.de')}
                  </div>
                </Option>
                <Option value="ja">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.ja')}
                  </div>
                </Option>
                <Option value="ko">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.ko')}
                  </div>
                </Option>
                <Option value="ru">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.ru')}
                  </div>
                </Option>
                <Option value="pt">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.pt')}
                  </div>
                </Option>
                <Option value="it">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.it')}
                  </div>
                </Option>
                <Option value="hi">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.hi')}
                  </div>
                </Option>
                <Option value="ar">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.ar')}
                  </div>
                </Option>
                <Option value="tr">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.tr')}
                  </div>
                </Option>
                <Option value="th">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.th')}
                  </div>
                </Option>
                <Option value="id">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.id')}
                  </div>
                </Option>
                <Option value="vi">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {t('settings.language.vi')}
                  </div>
                </Option>
              </Select>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <Title level={2}>{t('settings.ai.title')}</Title>
          <Divider />
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.ai.enable')}</span>
              <span className="setting-label-description">{t('settings.ai.description')}</span>
            </div>
            <div className="setting-control">
              <Switch
                checked={aiEnabled}
                onChange={toggleAI}
                checkedChildren={t('common.save')}
                unCheckedChildren={t('common.cancel')}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <Divider />
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.ai.apiKey')}</span>
              <span className="setting-label-description">{t('settings.ai.apiKeyDescription')}</span>
            </div>
            <div className="setting-control">
              <Input.Password
                value={apiKey === 'OPENAI_API_KEY_PLACEHOLDER' ? '' : apiKey}
                onChange={(e) => setAPIKey(e.target.value || 'OPENAI_API_KEY_PLACEHOLDER')}
                placeholder={language === 'zh' ? '留空将使用默认配置' : 'Leave blank for default'}
                style={{ width: '300px' }}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <Title level={2}>{t('settings.tts.title')}</Title>
          <Divider />
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.tts.enable')}</span>
              <span className="setting-label-description">{t('settings.tts.enable')}</span>
            </div>
            <div className="setting-control">
              <Switch
                checked={ttsEnabled}
                onChange={toggleTTS}
                checkedChildren={t('common.save')}
                unCheckedChildren={t('common.cancel')}
              />
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.tts.auto')}</span>
              <span className="setting-label-description">{t('settings.tts.auto')}</span>
            </div>
            <div className="setting-control">
              <Switch
                checked={autoRead}
                onChange={toggleAutoRead}
                disabled={!ttsEnabled}
                checkedChildren={t('common.save')}
                unCheckedChildren={t('common.cancel')}
              />
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.tts.speed')}</span>
              <span className="setting-label-description">{t('settings.tts.speed')}</span>
            </div>
            <div className="setting-control">
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={ttsSpeed}
                onChange={setTTSSpeed}
                disabled={!ttsEnabled}
                style={{ width: 200 }}
                marks={{
                  0.5: '0.5x',
                  1: t('settings.tts.normal'),
                  2: '2x'
                }}
                tooltip={{
                  formatter: (value) => `${value}x`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 