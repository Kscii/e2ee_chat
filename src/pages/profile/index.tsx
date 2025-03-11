import React, { useState } from 'react';
import { 
  Card, 
  Avatar, 
  Typography, 
  Divider, 
  Button, 
  Upload, 
  Form, 
  Input, 
  Space, 
  Row, 
  Col,
  Tabs
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  LockOutlined,
  UploadOutlined,
  SaveOutlined,
  SettingOutlined,
  BellOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import './index.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar?: string;
}

const ProfilePage: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '138****1234',
    bio: '前端工程师，喜欢学习新技术，React和TypeScript爱好者。'
  });
  
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  
  const handleEdit = () => {
    setEditMode(true);
  };
  
  const handleSave = (values: UserProfile) => {
    setUserProfile({...userProfile, ...values});
    setEditMode(false);
  };
  
  const handleCancel = () => {
    setEditMode(false);
  };

  return (
    <div className="profile-container">
      <Tabs defaultActiveKey="1" className="profile-tabs">
        <TabPane 
          tab={<span><UserOutlined />个人资料</span>} 
          key="1"
        >
          <Card bordered={false} className="profile-card">
            <Row gutter={24}>
              <Col xs={24} sm={8}>
                <div className="avatar-section">
                  <Avatar
                    size={120}
                    icon={<UserOutlined />}
                    src={userProfile.avatar}
                  />
                  {editMode && (
                    <Upload
                      fileList={fileList}
                      onChange={({ fileList }) => setFileList(fileList)}
                      showUploadList={false}
                    >
                      <Button 
                        icon={<UploadOutlined />} 
                        className="upload-button"
                      >
                        更换头像
                      </Button>
                    </Upload>
                  )}
                </div>
              </Col>
              <Col xs={24} sm={16}>
                {!editMode ? (
                  <div className="profile-info">
                    <div className="profile-header">
                      <Title level={3}>{userProfile.name}</Title>
                      <Button 
                        type="primary" 
                        icon={<EditOutlined />} 
                        onClick={handleEdit}
                      >
                        编辑资料
                      </Button>
                    </div>
                    
                    <Divider />
                    
                    <div className="info-item">
                      <MailOutlined className="info-icon" />
                      <Text>{userProfile.email}</Text>
                    </div>
                    
                    <div className="info-item">
                      <PhoneOutlined className="info-icon" />
                      <Text>{userProfile.phone}</Text>
                    </div>
                    
                    <Divider />
                    
                    <div>
                      <Title level={5}>个人简介</Title>
                      <Paragraph>{userProfile.bio}</Paragraph>
                    </div>
                  </div>
                ) : (
                  <Form
                    layout="vertical"
                    initialValues={userProfile}
                    onFinish={handleSave}
                  >
                    <Form.Item
                      name="name"
                      label="姓名"
                      rules={[{ required: true, message: '请输入姓名!' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="姓名" />
                    </Form.Item>
                    
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱!' },
                        { type: 'email', message: '请输入有效的邮箱地址!' }
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>
                    
                    <Form.Item
                      name="phone"
                      label="手机号"
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="手机号" />
                    </Form.Item>
                    
                    <Form.Item
                      name="bio"
                      label="个人简介"
                    >
                      <Input.TextArea rows={4} placeholder="写一些关于你自己的介绍..." />
                    </Form.Item>
                    
                    <Form.Item>
                      <Space>
                        <Button 
                          type="primary" 
                          htmlType="submit" 
                          icon={<SaveOutlined />}
                        >
                          保存
                        </Button>
                        <Button onClick={handleCancel}>取消</Button>
                      </Space>
                    </Form.Item>
                  </Form>
                )}
              </Col>
            </Row>
          </Card>
        </TabPane>
        <TabPane 
          tab={<span><SettingOutlined />账户设置</span>} 
          key="2"
        >
          <Card bordered={false} className="profile-card">
            <Title level={4}>密码修改</Title>
            <Divider />
            <Form layout="vertical">
              <Form.Item
                name="currentPassword"
                label="当前密码"
                rules={[{ required: true, message: '请输入当前密码!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="当前密码" />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[{ required: true, message: '请输入新密码!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                rules={[
                  { required: true, message: '请确认新密码!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不匹配!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary">修改密码</Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        <TabPane 
          tab={<span><BellOutlined />通知设置</span>} 
          key="3"
        >
          <Card bordered={false} className="profile-card">
            <Title level={4}>通知设置</Title>
            <Divider />
            <p>通知设置内容...</p>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProfilePage; 