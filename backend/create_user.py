#!/usr/bin/env python
"""
创建测试用户脚本
"""
from models import UserModel
import getpass
import sys

def create_test_user():
    user_model = UserModel()
    
    print("=== 创建测试用户 ===")
    username = input("请输入用户名: ")
    
    if not username:
        print("用户名不能为空")
        return
    
    password = getpass.getpass("请输入密码: ")
    
    if not password:
        print("密码不能为空")
        return
    
    email = input("请输入邮箱 (可选): ")
    phone = input("请输入电话 (可选): ")
    
    # 直接使用旧方式创建用户 (is_hashed=False)
    result, status_code = user_model.create_user(
        username, 
        password, 
        email if email else None, 
        phone if phone else None, 
        is_hashed=False
    )
    
    if status_code == 201:
        print(f"用户创建成功: {result}")
        # 测试登录
        test_login(username, password)
    else:
        print(f"用户创建失败: {result}")

def test_login(username, password):
    """测试登录"""
    user_model = UserModel()
    
    print("\n=== 测试登录 ===")
    print(f"尝试验证用户: {username}")
    
    # 使用旧方式登录 (is_hashed=False)
    user, error = user_model.authenticate_user(username, password, is_hashed=False)
    
    if user:
        print(f"登录成功! 用户ID: {user['id']}")
    else:
        print(f"登录失败: {error}")

if __name__ == "__main__":
    create_test_user() 