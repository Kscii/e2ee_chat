import os
from dotenv import load_dotenv

# 加载.env环境变量文件
load_dotenv()

# 应用设置
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', 8000))

# 安全设置
SECRET_KEY = os.environ.get('SECRET_KEY', 'info2222-security-key-example')
PEPPER = os.environ.get('SECRET_PEPPER', 'random-pepper-value-for-password-hashing')
TOKEN_EXPIRE_MINUTES = int(os.environ.get('TOKEN_EXPIRE_MINUTES', 60))

# 数据库设置
DATABASE_PATH = os.environ.get('DATABASE_PATH', 'users.db')

# CORS设置
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*') 