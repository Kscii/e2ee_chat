import React from 'react';
import { Form, Input, Button, Checkbox, Card, Typography, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, WechatOutlined, QqOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import './index.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = (values: LoginFormValues) => {
    console.log('登录表单提交:', values);
    // 模拟登录成功
    navigate('/chat');
  };

  return (
    <div className="login-container">
      <Card bordered={false} className="login-card">
        <div className="login-header">
          <Title level={2} style={{ margin: '0 0 8px 0' }}>欢迎回来</Title>
          <Text type="secondary">登录您的聊天账号</Text>
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
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <a href="#reset-password">忘记密码?</a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">还没有账号? <Link to="/register">立即注册</Link></Text>
          </div>

          <Divider plain>其他登录方式</Divider>
          
          <div className="social-login">
            <Space size="large">
              <Button 
                icon={<WechatOutlined />} 
                shape="circle" 
                size="large"
                className="wechat-btn"
              />
              <Button 
                icon={<QqOutlined />} 
                shape="circle" 
                size="large"
                className="qq-btn"
              />
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage; 