from flask import Flask, request, jsonify, make_response, g, send_from_directory
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
from functools import wraps
import os
import uuid
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import sqlite3
from sqlite3 import Error
import secrets

from models import DatabaseManager, UserModel, MessageModel, ServerModel
import config

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 创建头像存储目录
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 限制上传文件大小为5MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# 初始化数据库
db_manager = DatabaseManager()
db_manager.init_db()

# 初始化用户模型和消息模型
user_model = UserModel()
message_model = MessageModel()
server_model = ServerModel()  # 初始化服务器模型

# 验证文件扩展名
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 定义权限验证装饰器
def protected_endpoint(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "无效的访问令牌"}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({"error": "令牌已过期或无效"}), 401
            
        # 将用户信息存储在g对象中，方便后续使用
        g.user = payload
        
        return f(*args, **kwargs)
    return decorated

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
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    phone = data.get('phone')
    is_hashed = data.get('is_hashed', False)  # 新增：检查密码是否已哈希
    
    # 验证输入
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    
    # 创建用户
    result, status_code = user_model.create_user(username, password, email, phone, is_hashed)
    
    # 如果注册成功，生成并返回token
    if status_code == 201:
        # 生成JWT Token
        token = generate_token(username)
        
        # 在响应中添加token
        result["token"] = token
    
    return jsonify(result), status_code

# 登录接口
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    is_hashed = data.get('is_hashed', False)  # 新增：检查密码是否已哈希
    
    print(f"收到登录请求 - 用户名: {username}, 密码长度: {len(password)}, is_hashed: {is_hashed}")
    
    # 验证输入
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    
    # 验证用户凭据 - 如果密码已哈希，传递is_hashed标志
    user, error_message = user_model.authenticate_user(username, password, is_hashed)
    
    if user:
        # 生成JWT Token
        token = generate_token(username)
        
        return jsonify({
            "message": "登录成功",
            "username": username,
            "token": token
        }), 200
    else:
        print(f"登录验证失败 - 用户名: {username}, 错误消息: {error_message}")
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

# 获取用户密码哈希接口(仅用于客户端bcrypt验证)
@app.route('/api/user/passwordhash/<username>', methods=['GET'])
def get_user_password_hash(username):
    # 获取用户密码哈希
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "用户不存在"}), 404
            
        return jsonify({"password_hash": user['password_hash']}), 200
    except Error as e:
        return jsonify({"error": f"获取密码哈希失败: {str(e)}"}), 500
    finally:
        conn.close()

# 获取用户私钥加密盐接口
@app.route('/api/user/encryption-salt/<username>', methods=['GET'])
def get_user_encryption_salt(username):
    """获取用户的私钥加密盐值，如果用户存在但没有盐值则自动创建新盐值"""
    try:
        # 从用户模型中获取盐值
        salt = user_model.get_user_encryption_salt(username)
        
        # 检查用户是否存在
        user = user_model.get_user_by_username(username)
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        # 如果用户存在但没有盐值，则创建新的盐值
        if not salt:
            print(f"用户 {username} 存在但没有盐值，自动创建新盐值")
            
            # 生成新盐值
            new_salt = secrets.token_hex(16)  # 生成32字符的随机盐
            
            # 连接数据库更新用户盐值
            conn = DatabaseManager().get_connection()
            cursor = conn.cursor()
            
            try:
                cursor.execute(
                    "UPDATE users SET encryption_salt = ? WHERE username = ?",
                    (new_salt, username)
                )
                conn.commit()
                salt = new_salt
                print(f"为用户 {username} 创建并保存了新盐值")
            except Exception as e:
                conn.rollback()
                print(f"为用户 {username} 创建盐值失败: {str(e)}")
                return jsonify({"error": f"创建盐值失败: {str(e)}"}), 500
            finally:
                conn.close()
            
        # 返回盐值
        return jsonify({"encryption_salt": salt}), 200
        
    except Exception as e:
        return jsonify({"error": f"获取用户加密盐失败: {str(e)}"}), 500

# 设置用户私钥加密盐接口
@app.route('/api/user/encryption-salt/<username>', methods=['POST'])
def set_user_encryption_salt(username):
    """设置用户的私钥加密盐值"""
    try:
        # 验证权限 - 需要用户登录且只能设置自己的盐值
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "无效的访问令牌"}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({"error": "令牌已过期或无效"}), 401
        
        # 检查权限 - 只能设置自己的盐值
        token_username = payload.get('username')
        if token_username != username:
            return jsonify({"error": "无权设置其他用户的盐值"}), 403
        
        # 获取请求中的盐值数据
        data = request.get_json()
        new_salt = data.get('salt')
        
        if not new_salt:
            return jsonify({"error": "盐值不能为空"}), 400
        
        # 连接数据库更新用户盐值
        conn = DatabaseManager().get_connection()
        cursor = conn.cursor()
        
        try:
            # 检查用户是否存在
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({"error": "用户不存在"}), 404
            
            # 更新用户盐值
            cursor.execute(
                "UPDATE users SET encryption_salt = ? WHERE username = ?",
                (new_salt, username)
            )
            conn.commit()
            print(f"用户 {username} 的盐值已更新")
            
            return jsonify({"message": "盐值设置成功", "encryption_salt": new_salt}), 200
            
        except Exception as e:
            conn.rollback()
            print(f"设置盐值失败: {str(e)}")
            return jsonify({"error": f"设置盐值失败: {str(e)}"}), 500
            
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({"error": f"设置用户加密盐失败: {str(e)}"}), 500

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
    is_encrypted = data.get('is_encrypted', False)
    
    # 验证数据
    if not receiver_username or not content:
        return jsonify({"error": "接收者和消息内容不能为空"}), 400
    
    # 发送消息
    result, status_code = message_model.send_message(sender_username, receiver_username, content, is_encrypted)
    
    return jsonify(result), status_code

# 获取与指定用户的消息接口
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

# 获取会话列表接口
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

# 发送加密群组消息接口
@app.route('/api/group/encrypted-messages', methods=['POST'])
def send_encrypted_group_messages():
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
    messages = data.get('messages', [])
    group_id = data.get('group_id', 1)  # 默认使用群组ID 1，但支持指定其他群组
    
    if not messages:
        return jsonify({"error": "消息列表不能为空"}), 400
    
    # 发送加密群组消息
    result, status_code = message_model.send_encrypted_group_messages(sender_username, messages, group_id)
    
    return jsonify(result), status_code

# 获取加密群组消息接口
@app.route('/api/group/encrypted-messages', methods=['GET'])
def get_encrypted_group_messages():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取当前用户名
    username = payload.get('username')
    
    # 获取群组ID参数
    group_id = request.args.get('group_id', 1, type=int)
    
    # 获取加密群组消息
    result, status_code = message_model.get_encrypted_group_messages(username, group_id)
    
    return jsonify(result), status_code

# 获取群组成员接口
@app.route('/api/groups/<int:group_id>/members', methods=['GET'])
def get_group_members(group_id):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        # 获取群组成员
        cursor.execute(
            """
            SELECT u.id, u.username 
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            """, 
            (group_id,)
        )
        
        members = cursor.fetchall()
        member_list = [dict(member) for member in members]
        
        # 如果没有成员，返回所有用户作为默认成员
        if not member_list:
            cursor.execute("SELECT id, username FROM users")
            all_users = cursor.fetchall()
            member_list = [dict(user) for user in all_users]
            
        return jsonify({"members": member_list}), 200
        
    except Exception as e:
        return jsonify({"error": f"获取群组成员失败: {str(e)}"}), 500
        
    finally:
        conn.close()

# 保存用户公钥
@app.route('/api/keys', methods=['POST'])
def save_user_public_key():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取用户名
    username = payload.get('username')
    
    # 获取请求数据
    data = request.get_json()
    public_key = data.get('publicKey')
    
    if not public_key:
        return jsonify({"error": "公钥不能为空"}), 400
    
    # 保存公钥
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        # 检查用户是否存在
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        user_id = user['id']
        
        # 保存公钥，如果已存在则更新
        cursor.execute(
            """
            INSERT INTO user_keys (user_id, public_key, updated_at) 
            VALUES (?, ?, ?) 
            ON CONFLICT(user_id) 
            DO UPDATE SET public_key = ?, updated_at = ?
            """, 
            (user_id, public_key, datetime.now().isoformat(), public_key, datetime.now().isoformat())
        )
        
        conn.commit()
        return jsonify({"message": "公钥保存成功"}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"保存公钥失败: {str(e)}"}), 500
        
    finally:
        conn.close()

# 获取用户公钥
@app.route('/api/keys/<username>', methods=['GET'])
def get_user_public_key(username):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取公钥
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            SELECT k.public_key 
            FROM user_keys k
            JOIN users u ON k.user_id = u.id
            WHERE u.username = ?
            """, 
            (username,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"error": "未找到该用户的公钥"}), 404
            
        return jsonify({"username": username, "publicKey": result['public_key']}), 200
        
    except Exception as e:
        return jsonify({"error": f"获取公钥失败: {str(e)}"}), 500
        
    finally:
        conn.close()

# 获取所有用户公钥
@app.route('/api/keys', methods=['GET'])
def get_all_public_keys():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取所有公钥
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            SELECT u.username, k.public_key 
            FROM user_keys k
            JOIN users u ON k.user_id = u.id
            """
        )
        
        results = cursor.fetchall()
        
        keys = []
        for row in results:
            keys.append({
                "username": row['username'],
                "publicKey": row['public_key']
            })
            
        return jsonify({"keys": keys}), 200
        
    except Exception as e:
        return jsonify({"error": f"获取公钥列表失败: {str(e)}"}), 500
        
    finally:
        conn.close()

# 获取所有群组
@app.route('/api/groups', methods=['GET'])
def get_groups():
    """获取群组列表"""
    # 获取群组列表，并添加server_id字段到响应中
    response, status_code = message_model.get_all_groups()
    
    return jsonify(response), status_code

# 创建新群组
@app.route('/api/groups', methods=['POST'])
@protected_endpoint
def create_group():
    """创建新群组"""
    # 从请求体获取数据
    data = request.get_json()
    name = data.get('name', '')
    description = data.get('description', '')
    members = data.get('members', [])
    server_id = data.get('server_id', 1)  # 默认为1（主服务器）
    
    # 验证必填字段
    if not name:
        return jsonify({'error': '群组名称是必填的'}), 400
    
    # 获取当前用户
    username = g.user.get('username')
    
    # 创建群组，并传递server_id
    response, status_code = message_model.create_group(username, name, description, members, server_id)
    
    return jsonify(response), status_code

# 获取所有服务器的接口
@app.route('/api/servers', methods=['GET'])
def get_all_servers():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取用户名
    username = payload.get('username')
    
    # 获取服务器列表
    result, status_code = server_model.get_all_servers(username)
    
    return jsonify(result), status_code

# 获取服务器详情接口
@app.route('/api/servers/<int:server_id>', methods=['GET'])
def get_server(server_id):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取用户名
    username = payload.get('username')
    
    # 获取服务器详情
    result, status_code = server_model.get_server(server_id, username)
    
    return jsonify(result), status_code

# 创建服务器接口
@app.route('/api/servers', methods=['POST'])
def create_server():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取创建者用户名
    creator_username = payload.get('username')
    
    # 获取请求数据
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    avatar = data.get('avatar')
    
    if not name:
        return jsonify({"error": "服务器名称不能为空"}), 400
    
    # 创建服务器
    result, status_code = server_model.create_server(
        creator_username, 
        name, 
        description,
        avatar
    )
    
    return jsonify(result), status_code

# 添加成员到服务器接口
@app.route('/api/servers/<int:server_id>/members', methods=['POST'])
def add_server_member(server_id):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取操作者用户名
    owner_username = payload.get('username')
    
    # 获取请求数据
    data = request.get_json()
    member_username = data.get('username')
    
    if not member_username:
        return jsonify({"error": "成员用户名不能为空"}), 400
    
    # 添加成员
    result, status_code = server_model.add_server_member(
        server_id,
        owner_username,
        member_username
    )
    
    return jsonify(result), status_code

# 更新服务器信息接口
@app.route('/api/servers/<int:server_id>', methods=['PUT'])
def update_server(server_id):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取操作者用户名
    owner_username = payload.get('username')
    
    # 获取请求数据
    data = request.get_json()
    
    # 更新服务器信息
    result, status_code = server_model.update_server(
        server_id,
        owner_username,
        data
    )
    
    return jsonify(result), status_code

# 上传头像接口
@app.route('/api/upload-avatar', methods=['POST'])
def upload_avatar():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取用户名
    username = payload.get('username')
    
    # 检查是否上传了文件
    if 'file' not in request.files:
        return jsonify({"error": "没有上传文件"}), 400
    
    file = request.files['file']
    
    if not file.filename:
        return jsonify({"error": "没有选择文件"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "不支持的文件格式"}), 400
    
    try:
        # 确保上传目录存在
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # 生成唯一文件名
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # 保存文件
        file.save(file_path)
        
        # 更新用户头像路径
        result, status_code = user_model.save_avatar(username, unique_filename)
        
        return jsonify(result), status_code
    except Exception as e:
        print(f"上传头像错误: {str(e)}")
        return jsonify({"error": f"上传头像失败: {str(e)}"}), 500

# 获取头像接口
@app.route('/api/avatar/<username>', methods=['GET'])
def get_avatar(username):
    try:
        # 特殊处理AI助手"sakiko"头像
        if username == "sakiko":
            avatars_dir = app.config['UPLOAD_FOLDER']
            sakiko_avatar = "sakiko.png"
            full_path = os.path.join(avatars_dir, sakiko_avatar)
            
            if os.path.exists(full_path):
                return send_from_directory(avatars_dir, sakiko_avatar)
            else:
                return jsonify({"error": "AI助手头像不存在"}), 404
        
        # 正常处理其他用户头像
        avatar_path = user_model.get_avatar_path(username)
        
        if not avatar_path:
            return jsonify({"error": "未找到头像"}), 404
        
        # 获取avatars目录的绝对路径
        avatars_dir = app.config['UPLOAD_FOLDER']
        
        # 检查文件是否存在
        full_path = os.path.join(avatars_dir, os.path.basename(avatar_path))
        if not os.path.exists(full_path):
            return jsonify({"error": "头像文件不存在"}), 404
            
        # 返回头像文件
        return send_from_directory(avatars_dir, os.path.basename(avatar_path))
    except Exception as e:
        print(f"获取头像错误: {str(e)}")
        return jsonify({"error": f"获取头像失败: {str(e)}"}), 500

# 保存加密私钥
@app.route('/api/keys/private', methods=['POST'])
def save_user_private_key():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取用户名
    username = payload.get('username')
    print(f"正在为用户 {username} 保存加密私钥...")
    
    # 获取请求数据
    data = request.get_json()
    encrypted_private_key = data.get('encryptedPrivateKey')
    
    if not encrypted_private_key:
        return jsonify({"error": "加密私钥不能为空"}), 400
    
    # 保存加密私钥
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        # 检查用户是否存在
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            print(f"用户 {username} 不存在")
            return jsonify({"error": "用户不存在"}), 404
        
        user_id = user['id']
        
        # 检查用户是否已有记录
        cursor.execute("SELECT id, public_key FROM user_keys WHERE user_id = ?", (user_id,))
        key_record = cursor.fetchone()
        
        if key_record:
            # 已有记录，只更新encrypted_private_key
            print(f"用户 {username} 已有记录，更新加密私钥")
            cursor.execute(
                """
                UPDATE user_keys 
                SET encrypted_private_key = ?, updated_at = ? 
                WHERE user_id = ?
                """, 
                (encrypted_private_key, datetime.now().isoformat(), user_id)
            )
        else:
            # 没有记录，需要同时插入user_id、空的public_key和encrypted_private_key
            print(f"用户 {username} 没有记录，创建新记录")
            cursor.execute(
                """
                INSERT INTO user_keys (user_id, public_key, encrypted_private_key, updated_at) 
                VALUES (?, ?, ?, ?)
                """, 
                (user_id, "", encrypted_private_key, datetime.now().isoformat())
            )
        
        conn.commit()
        print(f"用户 {username} 加密私钥保存成功")
        return jsonify({"message": "加密私钥保存成功"}), 200
        
    except Exception as e:
        conn.rollback()
        print(f"保存加密私钥失败: {str(e)}")
        return jsonify({"error": f"保存加密私钥失败: {str(e)}"}), 500
        
    finally:
        conn.close()

# 获取用户加密私钥
@app.route('/api/keys/private', methods=['GET'])
def get_user_private_key():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "无效的访问令牌"}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({"error": "令牌已过期或无效"}), 401
    
    # 获取用户名
    username = payload.get('username')
    
    # 获取加密私钥
    conn = DatabaseManager().get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            SELECT k.encrypted_private_key 
            FROM user_keys k
            JOIN users u ON k.user_id = u.id
            WHERE u.username = ?
            """, 
            (username,)
        )
        
        result = cursor.fetchone()
        
        if not result or not result['encrypted_private_key']:
            return jsonify({"error": "未找到该用户的加密私钥"}), 404
            
        return jsonify({"encryptedPrivateKey": result['encrypted_private_key']}), 200
        
    except Exception as e:
        return jsonify({"error": f"获取加密私钥失败: {str(e)}"}), 500
        
    finally:
        conn.close()

# 运行应用
if __name__ == '__main__':
    app.run(
        debug=config.DEBUG,
        host=config.HOST,
        port=config.PORT
    ) 