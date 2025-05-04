from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta

from models import DatabaseManager, UserModel, MessageModel
import config

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化数据库
db_manager = DatabaseManager()
db_manager.init_db()

# 初始化用户模型和消息模型
user_model = UserModel()
message_model = MessageModel()

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

# 新增: 获取所有用户列表接口
@app.route('/api/users', methods=['GET'])
def get_all_users():
    auth_header = request.headers.get('Authorization')
    
    # 验证Token
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取所有用户列表
    users = user_model.get_all_users()
    
    return jsonify({"users": users}), 200

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

# 发送消息接口
@app.route('/api/messages', methods=['POST'])
def send_message():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取发送者用户名
    sender_username = payload.get('username')
    
    # 获取请求数据
    data = request.get_json()
    receiver_username = data.get('receiver')
    content = data.get('content')
    
    # 验证数据
    if not receiver_username or not content:
        return jsonify({"error": "接收者和消息内容不能为空"}), 400
    
    # 发送消息
    result, status_code = message_model.send_message(sender_username, receiver_username, content)
    
    return jsonify(result), status_code

# 获取两个用户之间的消息
@app.route('/api/messages/<string:other_username>', methods=['GET'])
def get_messages(other_username):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取当前用户名
    username = payload.get('username')
    
    # 获取分页参数
    limit = request.args.get('limit', default=50, type=int)
    offset = request.args.get('offset', default=0, type=int)
    
    # 获取消息
    result, status_code = message_model.get_messages(username, other_username, limit, offset)
    
    return jsonify(result), status_code

# 获取用户的所有会话接口
@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取当前用户名
    username = payload.get('username')
    
    # 获取会话列表
    result, status_code = message_model.get_conversations(username)
    
    return jsonify(result), status_code

# 发送群组消息接口
@app.route('/api/group/messages', methods=['POST'])
def send_group_message():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取发送者用户名
    sender_username = payload.get('username')
    
    # 获取请求数据
    data = request.get_json()
    content = data.get('content')
    
    # 验证数据
    if not content:
        return jsonify({"error": "消息内容不能为空"}), 400
    
    # 发送群组消息
    result, status_code = message_model.send_group_message(sender_username, content)
    
    return jsonify(result), status_code

# 获取群组消息接口
@app.route('/api/group/messages', methods=['GET'])
def get_group_messages():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取分页参数
    limit = request.args.get('limit', default=50, type=int)
    offset = request.args.get('offset', default=0, type=int)
    
    # 获取群组消息
    result, status_code = message_model.get_group_messages(limit, offset)
    
    return jsonify({"messages": result}), status_code

# 运行应用
if __name__ == '__main__':
    app.run(
        debug=config.DEBUG,
        host=config.HOST,
        port=config.PORT
    ) 