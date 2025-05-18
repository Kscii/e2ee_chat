import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Card, Typography, App, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import './index.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      await login(values.username, values.password);
      // 登录成功后自行处理导航
      messageApi.success(t('login.success') || '登录成功');
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('login.error') || '登录失败';
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {contextHolder}
      <Card variant="borderless" className="login-card">
        <div className="login-header">
          <Title level={2} style={{ margin: '0 0 8px 0' }}>{t('login.title')}</Title>
          <Text type="secondary">{t('login.subtitle')}</Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('login.username') + ' ' + t('common.required') }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder={t('login.username')}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.password') + ' ' + t('common.required') }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('login.password')}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>{t('login.remember')}</Checkbox>
              </Form.Item>
              <a href="#reset-password">{t('login.forgotPassword')}</a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('login.submit')}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">{t('login.noAccount')} <Link to="/register">{t('login.register')}</Link></Text>
          </div>

        </Form>
      </Card>
    </div>
  );
};

export default LoginPage; 