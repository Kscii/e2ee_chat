from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta

from models import DatabaseManager, UserModel
import config

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化数据库
db_manager = DatabaseManager()
db_manager.init_db()

# 初始化用户模型
user_model = UserModel()

# 生成JWT Token
def generate_token(username):
    expiration = datetime.utcnow() + timedelta(minutes=config.TOKEN_EXPIRE_MINUTES)
    payload = {
        'username': username,
        'exp': expiration
    }
    token = jwt.encode(payload, config.SECRET_KEY, algorithm='HS256')
    return token

# 验证Token
def verify_token(token):
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# 注册接口
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # 获取必要字段
    username = data.get('username')
    email = data.get('email', '')
    phone = data.get('phone', '')
    password = data.get('password')
    
    # 验证必要字段
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    
    # 创建用户
    result, status_code = user_model.create_user(username, password, email, phone)
    
    return jsonify(result), status_code

# 登录接口
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # 验证输入
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    
    # 验证用户凭据
    user, error_message = user_model.authenticate_user(username, password)
    
    if user:
        # 生成JWT Token
        token = generate_token(username)
        
        return jsonify({
            "message": "登录成功",
            "username": username,
            "token": token
        }), 200
    else:
        return jsonify({"error": error_message}), 401

# 获取用户信息接口(需要验证Token)
@app.route('/api/user', methods=['GET'])
def get_user_info():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    username = payload.get('username')
    user = user_model.get_user_by_username(username)
    
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    
    return jsonify(user), 200

# 更新用户信息接口(需要验证Token)
@app.route('/api/user', methods=['PUT'])
def update_user_info():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    username = payload.get('username')
    data = request.get_json()
    
    result, status_code = user_model.update_user(username, data)
    return jsonify(result), status_code

# 修改密码接口(需要验证Token)
@app.route('/api/change-password', methods=['POST'])
def change_password():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    username = payload.get('username')
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"error": "当前密码和新密码不能为空"}), 400
    
    result, status_code = user_model.change_password(username, current_password, new_password)
    return jsonify(result), status_code

# 运行应用
if __name__ == '__main__':
    app.run(
        debug=config.DEBUG,
        host=config.HOST,
        port=config.PORT
    ) 