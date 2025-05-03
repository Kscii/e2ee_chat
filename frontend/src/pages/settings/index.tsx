import React from 'react';
import { Switch, Avatar, Typography, Divider, Upload, message, Input, Select, Form, Slider } from 'antd';
import { UserOutlined, CameraOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useMarkdown } from '../../contexts/MarkdownContext';
import { useAvatar } from '../../contexts/AvatarContext';
import { useTTS, TTSService } from '../../contexts/TTSContext';
import { useAI } from '../../contexts/AIContext';
import { useAPI } from '../../contexts/APIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import './index.css';
import apiConfig from '../../config/apiConfig';

const { Title } = Typography;
const { Option } = Select;

const SettingsPage: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { markdownMode, toggleMarkdownMode } = useMarkdown();
  const { avatar, setAvatar } = useAvatar();
  const { ttsEnabled, autoRead, ttsSpeed, toggleTTS, toggleAutoRead, setTTSSpeed, selectedVoice, setSelectedVoice, availableVoices, ttsConfig, updateTTSConfig } = useTTS();
  const { aiEnabled, toggleAI } = useAI();
  const { apiKey, setAPIKey } = useAPI();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

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

  const handleChange = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.status === 'done') {
      const imageUrl = URL.createObjectURL(info.file.originFileObj as Blob);
      setAvatar(imageUrl);
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
              name="avatar"
              listType="picture-circle"
              className="avatar-upload"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleChange}
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
              <span className="setting-label-title">{t('settings.profile.name')}</span>
              <span className="setting-label-description">{t('settings.profile.email')}</span>
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
                dropdownMatchSelectWidth={false}
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
          <div className="setting-item">
            <div className="setting-label">
              <span className="setting-label-title">{t('settings.tts.service')}</span>
              <span className="setting-label-description">{t('settings.tts.service')}</span>
            </div>
            <div className="setting-control">
              <Select
                value={ttsConfig.service}
                onChange={(value: TTSService) => updateTTSConfig({ ...ttsConfig, service: value })}
                style={{ width: 200 }}
                disabled={!ttsEnabled}
              >
                <Select.Option value="browser">{t('settings.tts.browser')}</Select.Option>
                <Select.Option value="azure">{t('settings.tts.azure')}</Select.Option>
                <Select.Option value="google">{t('settings.tts.google')}</Select.Option>
                <Select.Option value="gpt-sovits">{t('settings.tts.gptSovits')}</Select.Option>
              </Select>
            </div>
          </div>

          {ttsConfig.service === 'browser' && (
            <div className="setting-item">
              <div className="setting-label">
                <span className="setting-label-title">{t('settings.tts.voice')}</span>
                <span className="setting-label-description">{t('settings.tts.voice')}</span>
              </div>
              <div className="setting-control">
                <Select
                  value={selectedVoice?.name}
                  onChange={(value) => setSelectedVoice(availableVoices.find(v => v.name === value) || null)}
                  style={{ width: 200 }}
                  disabled={!ttsEnabled}
                >
                  {availableVoices.map((voice) => (
                    <Select.Option key={voice.name} value={voice.name}>
                      {`${voice.name} (${voice.lang})`}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {ttsConfig.service === 'azure' && (
            <>
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-title">{t('settings.tts.azureKey')}</span>
                  <span className="setting-label-description">{t('settings.tts.azureKey')}</span>
                </div>
                <div className="setting-control">
                  <Input.Password
                    value={ttsConfig.azureKey === apiConfig.azure.apiKey ? '' : ttsConfig.azureKey}
                    onChange={(e) => updateTTSConfig({ ...ttsConfig, azureKey: e.target.value })}
                    style={{ width: 300 }}
                    disabled={!ttsEnabled}
                    placeholder={language === 'zh' ? '留空将使用默认配置' : 'Leave blank for default'}
                  />
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-title">{t('settings.tts.azureRegion')}</span>
                  <span className="setting-label-description">{t('settings.tts.azureRegion')}</span>
                </div>
                <div className="setting-control">
                  <Input
                    value={ttsConfig.azureRegion === apiConfig.azure.region ? '' : ttsConfig.azureRegion}
                    onChange={(e) => updateTTSConfig({ ...ttsConfig, azureRegion: e.target.value })}
                    style={{ width: 200 }}
                    disabled={!ttsEnabled}
                    placeholder={language === 'zh' ? '留空将使用默认配置' : 'Leave blank for default'}
                  />
                </div>
              </div>
            </>
          )}

          {ttsConfig.service === 'google' && (
            <div className="setting-item">
              <div className="setting-label">
                <span className="setting-label-title">{t('settings.tts.googleKey')}</span>
                <span className="setting-label-description">{t('settings.tts.googleKey')}</span>
              </div>
              <div className="setting-control">
                <Input.Password
                  value={ttsConfig.googleKey === apiConfig.google.apiKey ? '' : ttsConfig.googleKey}
                  onChange={(e) => updateTTSConfig({ ...ttsConfig, googleKey: e.target.value })}
                  style={{ width: 300 }}
                  disabled={!ttsEnabled}
                  placeholder={language === 'zh' ? '留空将使用默认配置' : 'Leave blank for default'}
                />
              </div>
            </div>
          )}

          {ttsConfig.service === 'gpt-sovits' && (
            <>
              <Form.Item label={language === 'zh' ? 'GPT-SoVITS 服务地址' : 'GPT-SoVITS Service URL'}>
                <Input
                  placeholder={language === 'zh' ? '留空将使用默认配置' : 'Leave blank for default'}
                  value={ttsConfig.gptSovitsUrl === apiConfig.gptSovits.url ? '' : ttsConfig.gptSovitsUrl}
                  onChange={(e) => updateTTSConfig({ gptSovitsUrl: e.target.value })}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {language === 'zh' ? `默认值: ${apiConfig.gptSovits.url}` : `Default: ${apiConfig.gptSovits.url}`}
                </div>
              </Form.Item>
              <Form.Item label={language === 'zh' ? '角色' : 'Character'}>
                <Input
                  placeholder={language === 'zh' ? '角色名称' : 'Character name'}
                  value={ttsConfig.gptSovitsConfig?.character || ''}
                  onChange={(e) => updateTTSConfig({
                    gptSovitsConfig: {
                      ...(ttsConfig.gptSovitsConfig || {
                        emotion: 0,
                        speed: 1.5,
                        textLanguage: 'auto'
                      }),
                      character: e.target.value || 'Anon'
                    }
                  })}
                />
              </Form.Item>
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-title">{t('settings.tts.emotion')}</span>
                  <span className="setting-label-description">{t('settings.tts.emotion')}</span>
                </div>
                <div className="setting-control">
                  <Select
                    value={ttsConfig.gptSovitsConfig?.emotion ?? 0}
                    onChange={(value) => updateTTSConfig({
                      ...ttsConfig,
                      gptSovitsConfig: {
                        ...ttsConfig.gptSovitsConfig || {
                          character: 'Anon',
                          emotion: 0,
                          speed: 1.5,
                          textLanguage: 'auto'
                        },
                        emotion: value
                      }
                    })}
                    style={{ width: 200 }}
                    disabled={!ttsEnabled}
                  >
                    {Array.from({ length: 23 }, (_, i) => (
                      <Select.Option key={i} value={i}>
                        {i}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-title">{t('settings.tts.speed')}</span>
                  <span className="setting-label-description">{t('settings.tts.speed')}</span>
                </div>
                <div className="setting-control">
                  <Input
                    type="number"
                    value={ttsConfig.gptSovitsConfig?.speed ?? 1.5}
                    onChange={(e) => updateTTSConfig({
                      ...ttsConfig,
                      gptSovitsConfig: {
                        ...ttsConfig.gptSovitsConfig || {
                          character: 'Anon',
                          emotion: 0,
                          speed: 1.5,
                          textLanguage: 'auto'
                        },
                        speed: parseFloat(e.target.value)
                      }
                    })}
                    style={{ width: 200 }}
                    disabled={!ttsEnabled}
                    step={0.1}
                    min={0.5}
                    max={2.0}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 