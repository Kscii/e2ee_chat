import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../../api/auth';
import './index.css';

const { Title, Text } = Typography;

interface RegisterFormValues {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      await register(values.username, values.password, values.email, values.phone);
      message.success(t('register.success') || '注册成功');
      navigate('/login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('register.error') || '注册失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <Card variant="borderless" className="register-card">
        <div className="register-header">
          <Title level={2} style={{ margin: '0 0 8px 0' }}>{t('register.title')}</Title>
          <Text type="secondary">{t('register.subtitle')}</Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="username"
                rules={[{ required: true, message: t('register.validation.usernameRequired') }]}
              >
                <Input
                  prefix={<UserOutlined className="site-form-item-icon" />}
                  placeholder={t('register.username')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: t('register.validation.emailRequired') },
                  { type: 'email', message: t('register.validation.emailValid') }
                ]}
              >
                <Input
                  prefix={<MailOutlined className="site-form-item-icon" />}
                  placeholder={t('register.email')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                rules={[
                  { required: true, message: t('register.validation.phoneRequired') },
                  { pattern: /^1\d{10}$/, message: t('register.validation.phoneValid') }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined className="site-form-item-icon" />}
                  placeholder={t('register.phone')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: t('register.validation.passwordRequired') },
              { min: 6, message: t('register.validation.passwordLength') }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('register.password')}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: t('register.validation.confirmRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('register.validation.passwordsMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('register.confirmPassword')}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('register.submit')}
            </Button>
          </Form.Item>

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">{t('register.haveAccount')} <Link to="/login">{t('register.login')}</Link></Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage; 