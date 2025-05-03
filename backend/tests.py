import unittest
import json
import os
import tempfile
import time
from app import app

class AuthTestCase(unittest.TestCase):
    """用户认证API测试用例"""
    
    def setUp(self):
        """测试前的准备工作"""
        self.app = app.test_client()
        self.app.testing = True
        # 测试数据
        self.user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "phone": "13800000000",
            "password": "Test@123"
        }
        
        # 确保测试用户不存在
        self.cleanup_test_user()
    
    def tearDown(self):
        """测试后的清理工作"""
        self.cleanup_test_user()
    
    def cleanup_test_user(self):
        """清理测试用户"""
        import sqlite3
        from config import DATABASE_PATH
        
        try:
            conn = sqlite3.connect(DATABASE_PATH)
            conn.execute("DELETE FROM users WHERE username = ?", (self.user_data["username"],))
            conn.commit()
            conn.close()
        except:
            pass
    
    def register_user(self):
        """注册测试用户"""
        return self.app.post(
            '/api/register',
            data=json.dumps(self.user_data),
            content_type='application/json'
        )
    
    def login_user(self):
        """登录测试用户"""
        login_data = {
            "username": self.user_data["username"],
            "password": self.user_data["password"]
        }
        return self.app.post(
            '/api/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
    
    def test_registration(self):
        """测试用户注册功能"""
        # 注册新用户
        response = self.register_user()
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data.decode())
        self.assertIn('message', data)
        self.assertEqual(data['message'], '用户创建成功')
        
        # 测试重复注册
        response = self.register_user()
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.data.decode())
        self.assertIn('error', data)
        self.assertEqual(data['error'], '用户名已存在')
    
    def test_login(self):
        """测试用户登录功能"""
        # 先注册用户
        self.register_user()
        
        # 测试登录
        response = self.login_user()
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode())
        self.assertIn('message', data)
        self.assertEqual(data['message'], '登录成功')
        self.assertIn('token', data)
        self.assertIn('username', data)
        self.assertEqual(data['username'], self.user_data['username'])
        
        # 测试错误密码
        login_data = {
            "username": self.user_data["username"],
            "password": "wrongpassword"
        }
        response = self.app.post(
            '/api/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data.decode())
        self.assertIn('error', data)
        self.assertEqual(data['error'], '密码不正确')
        
        # 测试不存在的用户
        login_data = {
            "username": "nonexistentuser",
            "password": "password123"
        }
        response = self.app.post(
            '/api/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data.decode())
        self.assertIn('error', data)
        self.assertEqual(data['error'], '用户不存在')
    
    def test_user_info(self):
        """测试获取用户信息功能"""
        # 先注册并登录
        self.register_user()
        login_response = self.login_user()
        data = json.loads(login_response.data.decode())
        token = data['token']
        
        # 获取用户信息
        response = self.app.get(
            '/api/user',
            headers={'Authorization': f'Bearer {token}'}
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode())
        self.assertIn('username', data)
        self.assertEqual(data['username'], self.user_data['username'])
        self.assertIn('email', data)
        self.assertEqual(data['email'], self.user_data['email'])
        
        # 测试无效的令牌
        response = self.app.get(
            '/api/user',
            headers={'Authorization': 'Bearer invalid_token'}
        )
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data.decode())
        self.assertIn('error', data)
        self.assertEqual(data['error'], '令牌已过期或无效')
    
    def test_change_password(self):
        """测试修改密码功能"""
        # 先注册并登录
        self.register_user()
        login_response = self.login_user()
        data = json.loads(login_response.data.decode())
        token = data['token']
        
        # 修改密码
        password_data = {
            "current_password": self.user_data["password"],
            "new_password": "NewTest@456"
        }
        response = self.app.post(
            '/api/change-password',
            data=json.dumps(password_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {token}'}
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode())
        self.assertIn('message', data)
        self.assertEqual(data['message'], '密码修改成功')
        
        # 使用新密码登录
        login_data = {
            "username": self.user_data["username"],
            "password": "NewTest@456"
        }
        response = self.app.post(
            '/api/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # 使用旧密码登录应该失败
        login_data = {
            "username": self.user_data["username"],
            "password": self.user_data["password"]
        }
        response = self.app.post(
            '/api/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main() 