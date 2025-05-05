import sqlite3
from sqlite3 import Error
import bcrypt
from datetime import datetime
from config import DATABASE_PATH, PEPPER

class DatabaseManager:
    def __init__(self, db_path=DATABASE_PATH):
        self.db_path = db_path
    
    def get_connection(self):
        """创建数据库连接并返回连接和游标"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """初始化数据库表"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 创建用户表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
        ''')
        
        # 创建服务器表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            owner_id INTEGER NOT NULL,
            avatar TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users (id)
        )
        ''')
        
        # 创建服务器成员表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS server_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(server_id, user_id)
        )
        ''')
        
        # 创建消息表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            is_encrypted BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users (id),
            FOREIGN KEY (receiver_id) REFERENCES users (id)
        )
        ''')
        
        # 创建会话表（用于跟踪用户之间的会话）
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            last_message_id INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users (id),
            FOREIGN KEY (user2_id) REFERENCES users (id),
            FOREIGN KEY (last_message_id) REFERENCES messages (id),
            UNIQUE(user1_id, user2_id)
        )
        ''')
        
        # 创建用户公钥表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            public_key TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')
        
        # 创建群组表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            server_id INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers (id)
        )
        ''')
        
        # 创建群组成员表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(group_id, user_id)
        )
        ''')
        
        # 创建群组消息表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (sender_id) REFERENCES users (id)
        )
        ''')
        
        # 创建加密群组消息表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS encrypted_group_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            original_message_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (sender_id) REFERENCES users (id),
            FOREIGN KEY (receiver_id) REFERENCES users (id),
            FOREIGN KEY (original_message_id) REFERENCES group_messages (id)
        )
        ''')
        
        conn.commit()
        conn.close()
        print("数据库初始化完成")
        
        # 初始化测试数据
        self.init_test_data()
        print("测试数据初始化完成")

    def init_test_data(self):
        """初始化测试用户和群组数据"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 初始密码(统一使用info2222)
            password = "info2222"
            password_with_pepper = password + PEPPER
            password_hash = bcrypt.hashpw(password_with_pepper.encode(), bcrypt.gensalt()).decode()
            
            # 创建三个用户
            users = [
                ("kscii", "kscii@example.com", "123456", password_hash),
                ("user1", "user1@example.com", "123456", password_hash),
                ("user2", "user2@example.com", "123456", password_hash)
            ]
            
            # 插入用户数据
            user_ids = []
            for username, email, phone, pw_hash in users:
                # 检查用户是否已存在
                cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
                user = cursor.fetchone()
                if not user:
                    cursor.execute(
                        "INSERT INTO users (username, email, phone, password_hash) VALUES (?, ?, ?, ?)",
                        (username, email, phone, pw_hash)
                    )
                    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
                    user = cursor.fetchone()
                    print(f"创建用户: {username}")
                
                user_ids.append(user['id'])
            
            # 创建默认服务器
            cursor.execute("SELECT id FROM servers WHERE id = 1")
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO servers (id, name, description, owner_id) VALUES (?, ?, ?, ?)",
                    (1, "main server", "默认服务器", user_ids[0])  # kscii作为所有者
                )
                print("创建服务器: 主服务器")
            
            # 将用户添加到服务器
            for user_id in user_ids:
                # 检查用户是否已在服务器中
                cursor.execute(
                    "SELECT id FROM server_members WHERE server_id = 1 AND user_id = ?",
                    (user_id,)
                )
                
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO server_members (server_id, user_id) VALUES (?, ?)",
                        (1, user_id)
                    )
                    print(f"将用户ID {user_id} 加入服务器1")
            
            # 创建默认群组1 (公共聊天室)
            cursor.execute("SELECT id FROM groups WHERE id = 1")
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO groups (id, name, description, server_id) VALUES (?, ?, ?, ?)",
                    (1, "公共聊天室", "所有用户共享的聊天室", 1)  # 设置server_id为1
                )
                print("创建群组: 公共聊天室(服务器1)")
            
            # 创建默认群组2 (general) - 用于频道页面
            cursor.execute("SELECT id FROM groups WHERE id = 2")
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO groups (id, name, description, server_id) VALUES (?, ?, ?, ?)",
                    (2, "general", "频道系统默认群组", 1)  # 设置server_id为1
                )
                print("创建群组: general (服务器1)")
            
            # 将用户加入群组1
            for user_id in user_ids:
                # 检查用户是否已在群组中
                cursor.execute(
                    "SELECT id FROM group_members WHERE group_id = 1 AND user_id = ?",
                    (user_id,)
                )
                
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                        (1, user_id)
                    )
                    print(f"将用户ID {user_id} 加入群组1")
            
            # 将用户加入群组2 (general)
            for user_id in user_ids:
                # 检查用户是否已在群组中
                cursor.execute(
                    "SELECT id FROM group_members WHERE group_id = 2 AND user_id = ?",
                    (user_id,)
                )
                
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                        (2, user_id)
                    )
                    print(f"将用户ID {user_id} 加入群组2 (general)")
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"初始化测试数据失败: {str(e)}")
        finally:
            conn.close()

class UserModel:
    def __init__(self):
        self.db_manager = DatabaseManager()
    
    def create_user(self, username, password, email=None, phone=None):
        """创建新用户"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 检查用户名是否已存在
            cursor.execute("SELECT username FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                conn.close()
                return {"error": "用户名已存在"}, 409
            
            # 检查邮箱是否已存在(如果有提供)
            if email:
                cursor.execute("SELECT email FROM users WHERE email = ?", (email,))
                if cursor.fetchone():
                    conn.close()
                    return {"error": "邮箱已被注册"}, 409
            
            # 密码加密（加入pepper）
            password_with_pepper = password + PEPPER
            password_hash = bcrypt.hashpw(password_with_pepper.encode(), bcrypt.gensalt())
            
            # 存储用户信息
            cursor.execute(
                "INSERT INTO users (username, email, phone, password_hash) VALUES (?, ?, ?, ?)",
                (username, email, phone, password_hash.decode())
            )
            conn.commit()
            
            return {"message": "用户创建成功"}, 201
        
        except Error as e:
            conn.rollback()
            return {"error": f"创建用户失败: {str(e)}"}, 500
        
        finally:
            conn.close()
    
    def authenticate_user(self, username, password):
        """验证用户凭据"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 查询用户
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return None, "用户不存在"
            
            # 验证密码
            password_with_pepper = password + PEPPER
            if bcrypt.checkpw(password_with_pepper.encode(), user['password_hash'].encode()):
                # 更新最后登录时间
                cursor.execute(
                    "UPDATE users SET last_login = ? WHERE username = ?",
                    (datetime.now().isoformat(), username)
                )
                conn.commit()
                
                # 转换用户记录为字典
                user_dict = dict(user)
                # 移除敏感信息
                user_dict.pop('password_hash', None)
                
                return user_dict, None
            else:
                return None, "密码不正确"
        
        except Error as e:
            return None, f"认证失败: {str(e)}"
        
        finally:
            conn.close()
    
    def get_user_by_username(self, username):
        """通过用户名获取用户信息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT id, username, email, phone, created_at, last_login FROM users WHERE username = ?",
                (username,)
            )
            user = cursor.fetchone()
            
            if not user:
                return None
            
            return dict(user)
        
        except Error as e:
            print(f"获取用户信息失败: {str(e)}")
            return None
        
        finally:
            conn.close()
    
    def get_all_users(self):
        """获取所有用户的列表"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT id, username, email, created_at, last_login FROM users"
            )
            users = cursor.fetchall()
            
            # 转换为列表字典
            user_list = [dict(user) for user in users]
            return user_list
        
        except Error as e:
            print(f"获取用户列表失败: {str(e)}")
            return []
        
        finally:
            conn.close()
    
    def update_user(self, username, data):
        """更新用户信息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 构建更新语句
            update_fields = []
            params = []
            
            for key, value in data.items():
                if key in ['email', 'phone']:
                    update_fields.append(f"{key} = ?")
                    params.append(value)
            
            if not update_fields:
                return {"error": "没有提供可更新的字段"}, 400
            
            # 添加用户名到参数列表
            params.append(username)
            
            # 执行更新
            cursor.execute(
                f"UPDATE users SET {', '.join(update_fields)} WHERE username = ?",
                tuple(params)
            )
            conn.commit()
            
            if cursor.rowcount > 0:
                return {"message": "用户信息更新成功"}, 200
            else:
                return {"error": "用户不存在或信息未更改"}, 404
        
        except Error as e:
            conn.rollback()
            return {"error": f"更新用户信息失败: {str(e)}"}, 500
        
        finally:
            conn.close()
    
    def change_password(self, username, current_password, new_password):
        """修改用户密码"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 验证用户名和当前密码
            cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return {"error": "用户不存在"}, 404
            
            # 验证当前密码
            current_password_with_pepper = current_password + PEPPER
            if not bcrypt.checkpw(current_password_with_pepper.encode(), user['password_hash'].encode()):
                return {"error": "当前密码不正确"}, 401
            
            # 更新密码
            new_password_with_pepper = new_password + PEPPER
            new_password_hash = bcrypt.hashpw(new_password_with_pepper.encode(), bcrypt.gensalt())
            
            cursor.execute(
                "UPDATE users SET password_hash = ? WHERE username = ?",
                (new_password_hash.decode(), username)
            )
            conn.commit()
            
            return {"message": "密码修改成功"}, 200
        
        except Error as e:
            conn.rollback()
            return {"error": f"密码修改失败: {str(e)}"}, 500
        
        finally:
            conn.close()


class MessageModel:
    def __init__(self):
        self.db_manager = DatabaseManager()
    
    def send_message(self, sender_username, receiver_username, content, is_encrypted=False):
        """发送消息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取发送者和接收者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (sender_username,))
            sender = cursor.fetchone()
            
            if not sender:
                return {"error": "发送者不存在"}, 404
            
            cursor.execute("SELECT id FROM users WHERE username = ?", (receiver_username,))
            receiver = cursor.fetchone()
            
            if not receiver:
                return {"error": "接收者不存在"}, 404
            
            sender_id = sender['id']
            receiver_id = receiver['id']
            
            # 存储消息
            cursor.execute(
                "INSERT INTO messages (sender_id, receiver_id, content, is_encrypted) VALUES (?, ?, ?, ?)",
                (sender_id, receiver_id, content, 1 if is_encrypted else 0)
            )
            
            # 获取消息ID
            message_id = cursor.lastrowid
            
            # 更新或创建会话
            cursor.execute(
                """
                INSERT INTO conversations (user1_id, user2_id, last_message_id, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user1_id, user2_id) 
                DO UPDATE SET last_message_id = ?, updated_at = ?
                """,
                (
                    min(sender_id, receiver_id), 
                    max(sender_id, receiver_id), 
                    message_id,
                    datetime.now().isoformat(),
                    message_id,
                    datetime.now().isoformat()
                )
            )
            
            conn.commit()
            
            return {
                "message_id": message_id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "content": content,
                "is_encrypted": bool(is_encrypted),
                "created_at": datetime.now().isoformat()
            }, 201
            
        except Error as e:
            conn.rollback()
            return {"error": f"发送消息失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def get_messages(self, user1_username, user2_username, limit=50, offset=0):
        """获取两个用户之间的消息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取用户ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (user1_username,))
            user1 = cursor.fetchone()
            
            if not user1:
                return {"error": "用户1不存在"}, 404
                
            cursor.execute("SELECT id FROM users WHERE username = ?", (user2_username,))
            user2 = cursor.fetchone()
            
            if not user2:
                return {"error": "用户2不存在"}, 404
                
            user1_id = user1['id']
            user2_id = user2['id']
            
            # 获取消息 - 修改为按时间正序排序（ASC而非DESC）
            cursor.execute(
                """
                SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.is_encrypted, m.created_at,
                       s.username as sender_username, r.username as receiver_username
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                JOIN users r ON m.receiver_id = r.id
                WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
                ORDER BY m.created_at ASC
                LIMIT ? OFFSET ?
                """,
                (user1_id, user2_id, user2_id, user1_id, limit, offset)
            )
            
            messages = cursor.fetchall()
            message_list = [dict(msg) for msg in messages]
            
            # 更新消息的已读状态（将发给user1但未读的消息标记为已读）
            cursor.execute(
                """
                UPDATE messages
                SET is_read = 1
                WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
                """,
                (user1_id, user2_id)
            )
            
            conn.commit()
            
            return {"messages": message_list}, 200
            
        except Error as e:
            conn.rollback()
            return {"error": f"获取消息失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def get_conversations(self, username):
        """获取用户的所有会话"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取用户ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return {"error": "用户不存在"}, 404
                
            user_id = user['id']
            
            # 获取会话列表
            cursor.execute(
                """
                SELECT c.id, c.user1_id, c.user2_id, c.last_message_id, c.updated_at,
                       u1.username as user1_username, u2.username as user2_username,
                       m.content as last_message, m.created_at as last_message_time,
                       (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) AND is_read = 0) as unread_count
                FROM conversations c
                JOIN users u1 ON c.user1_id = u1.id
                JOIN users u2 ON c.user2_id = u2.id
                LEFT JOIN messages m ON c.last_message_id = m.id
                WHERE c.user1_id = ? OR c.user2_id = ?
                ORDER BY c.updated_at DESC
                """,
                (user_id, user_id, user_id, user_id)
            )
            
            conversations = cursor.fetchall()
            
            # 处理会话列表，确保当前用户不是user1
            conversation_list = []
            for conv in conversations:
                conv_dict = dict(conv)
                # 如果当前用户是user1，则将另一个用户作为对话对象
                if conv_dict['user1_id'] == user_id:
                    conv_dict['other_user_id'] = conv_dict['user2_id']
                    conv_dict['other_username'] = conv_dict['user2_username']
                else:
                    conv_dict['other_user_id'] = conv_dict['user1_id']
                    conv_dict['other_username'] = conv_dict['user1_username']
                
                conversation_list.append(conv_dict)
            
            return {"conversations": conversation_list}, 200
            
        except Error as e:
            return {"error": f"获取会话列表失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def send_group_message(self, sender_username, content):
        """发送群组消息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取发送者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (sender_username,))
            sender = cursor.fetchone()
            
            if not sender:
                return {"error": "发送者不存在"}, 404
            
            sender_id = sender['id']
            
            # 获取或创建默认群组ID为1
            cursor.execute("SELECT id FROM groups WHERE id = 1")
            group = cursor.fetchone()
            
            if not group:
                # 创建默认群组
                cursor.execute(
                    "INSERT INTO groups (id, name, description) VALUES (1, '公共聊天室', '所有用户共享的聊天室')"
                )
                group_id = 1
            else:
                group_id = group['id']
            
            # 确保用户是群组成员
            cursor.execute(
                "SELECT id FROM group_members WHERE group_id = ? AND user_id = ?",
                (group_id, sender_id)
            )
            member = cursor.fetchone()
            
            if not member:
                # 添加用户为群组成员
                cursor.execute(
                    "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                    (group_id, sender_id)
                )
            
            # 存储消息
            cursor.execute(
                "INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)",
                (group_id, sender_id, content)
            )
            
            # 获取消息ID
            message_id = cursor.lastrowid
            
            conn.commit()
            
            return {
                "id": message_id,
                "group_id": group_id,
                "sender_id": sender_id,
                "sender_username": sender_username,
                "content": content,
                "created_at": datetime.now().isoformat()
            }, 201
            
        except Error as e:
            conn.rollback()
            return {"error": f"发送群组消息失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def get_group_messages(self, limit=50, offset=0):
        """获取群组消息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取默认群组(ID=1)的消息，按时间正序排序
            cursor.execute(
                """
                SELECT g.id, g.group_id, g.sender_id, g.content, g.created_at,
                       u.username as sender_username
                FROM group_messages g
                JOIN users u ON g.sender_id = u.id
                WHERE g.group_id = 1
                ORDER BY g.created_at ASC
                LIMIT ? OFFSET ?
                """,
                (limit, offset)
            )
            
            messages = cursor.fetchall()
            message_list = [dict(msg) for msg in messages]
            
            return message_list, 200
            
        except Error as e:
            return {"error": f"获取群组消息失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def send_encrypted_group_messages(self, sender_username, encrypted_messages, group_id=1):
        """发送加密群组消息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取发送者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (sender_username,))
            sender = cursor.fetchone()
            
            if not sender:
                return {"error": "发送者不存在"}, 404
            
            sender_id = sender['id']
            
            # 检查群组是否存在
            cursor.execute("SELECT id FROM groups WHERE id = ?", (group_id,))
            group = cursor.fetchone()
            
            if not group:
                return {"error": "群组不存在"}, 404
            
            # 创建一条原始群组消息（可见给所有人，但显示为"加密消息"）
            cursor.execute(
                "INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)",
                (group_id, sender_id, "[加密消息]")
            )
            
            # 获取原始消息ID
            original_message_id = cursor.lastrowid
            
            results = []
            
            # 处理每个接收者的加密消息
            for message in encrypted_messages:
                if not message:
                    continue
                    
                receiver_username = message.get("recipient")
                encrypted_content = message.get("content")
                
                if not receiver_username or not encrypted_content:
                    continue
                
                # 获取接收者ID
                cursor.execute("SELECT id FROM users WHERE username = ?", (receiver_username,))
                receiver = cursor.fetchone()
                
                if not receiver:
                    continue
                    
                receiver_id = receiver['id']
                
                # 存储加密消息
                cursor.execute(
                    """
                    INSERT INTO encrypted_group_messages 
                    (group_id, sender_id, receiver_id, content, original_message_id) 
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (group_id, sender_id, receiver_id, encrypted_content, original_message_id)
                )
                
                message_id = cursor.lastrowid
                
                results.append({
                    "id": message_id,
                    "recipient": receiver_username
                })
            
            conn.commit()
            
            return {
                "message": "加密群组消息发送成功",
                "original_message_id": original_message_id,
                "results": results
            }, 201
            
        except Error as e:
            conn.rollback()
            return {"error": f"发送加密群组消息失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def get_encrypted_group_messages(self, username, group_id=1):
        """获取针对特定用户的加密群组消息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取用户ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return {"error": "用户不存在"}, 404
                
            user_id = user['id']
            
            # 获取指定群组发送给该用户的加密消息
            cursor.execute(
                """
                SELECT e.id, e.group_id, e.sender_id, e.receiver_id, e.content, 
                       e.original_message_id, e.created_at, s.username as sender_username
                FROM encrypted_group_messages e
                JOIN users s ON e.sender_id = s.id
                WHERE e.receiver_id = ? AND e.group_id = ?
                ORDER BY e.created_at ASC
                """,
                (user_id, group_id)
            )
            
            messages = cursor.fetchall()
            message_list = [dict(msg) for msg in messages]
            
            return {"messages": message_list}, 200
            
        except Error as e:
            return {"error": f"获取加密群组消息失败: {str(e)}"}, 500
            
        finally:
            conn.close()

    def get_all_groups(self):
        """获取所有群组"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT id, name, description, server_id, created_at, updated_at
                FROM groups
                ORDER BY id ASC
                """
            )
            
            groups = cursor.fetchall()
            group_list = [dict(group) for group in groups]
            
            return {"groups": group_list}, 200
            
        except Error as e:
            return {"error": f"获取群组列表失败: {str(e)}"}, 500
            
        finally:
            conn.close()

    def create_group(self, creator_username, name, description, members=None, server_id=1):
        """创建新群组"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取创建者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (creator_username,))
            creator = cursor.fetchone()
            
            if not creator:
                return {"error": "创建者不存在"}, 404
            
            creator_id = creator['id']
            
            # 创建新群组
            cursor.execute(
                """
                INSERT INTO groups (name, description, server_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, description, server_id, datetime.now().isoformat(), datetime.now().isoformat())
            )
            
            group_id = cursor.lastrowid
            
            # 添加创建者为群组成员
            cursor.execute(
                "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                (group_id, creator_id)
            )
            
            # 如果指定了其他成员，也添加他们
            if members:
                for member_username in members:
                    # 跳过创建者，因为已经添加
                    if member_username == creator_username:
                        continue
                    
                    # 获取成员ID
                    cursor.execute("SELECT id FROM users WHERE username = ?", (member_username,))
                    member = cursor.fetchone()
                    
                    if not member:
                        continue
                    
                    member_id = member['id']
                    
                    # 添加成员
                    cursor.execute(
                        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                        (group_id, member_id)
                    )
            
            conn.commit()
            
            return {
                "id": group_id,
                "name": name,
                "description": description,
                "server_id": server_id,
                "created_at": datetime.now().isoformat()
            }, 201
            
        except Error as e:
            conn.rollback()
            return {"error": f"创建群组失败: {str(e)}"}, 500
            
        finally:
            conn.close()

class ServerModel:
    def __init__(self):
        self.db_manager = DatabaseManager()
    
    def get_all_servers(self, username):
        """获取用户所属的所有服务器"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取用户ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return {"error": "用户不存在"}, 404
            
            user_id = user['id']
            
            # 获取用户加入的所有服务器
            cursor.execute(
                """
                SELECT s.id, s.name, s.description, s.owner_id, s.avatar, s.created_at, s.updated_at,
                       u.username as owner_username,
                       (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
                FROM servers s
                JOIN server_members sm ON s.id = sm.server_id
                JOIN users u ON s.owner_id = u.id
                WHERE sm.user_id = ?
                ORDER BY s.created_at DESC
                """,
                (user_id,)
            )
            
            servers = cursor.fetchall()
            server_list = [dict(server) for server in servers]
            
            return {"servers": server_list}, 200
            
        except Error as e:
            return {"error": f"获取服务器列表失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def get_server(self, server_id, username):
        """获取单个服务器的详细信息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取用户ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                return {"error": "用户不存在"}, 404
            
            user_id = user['id']
            
            # 检查用户是否为该服务器的成员
            cursor.execute(
                "SELECT id FROM server_members WHERE server_id = ? AND user_id = ?",
                (server_id, user_id)
            )
            
            if not cursor.fetchone():
                return {"error": "您不是该服务器的成员"}, 403
            
            # 获取服务器信息
            cursor.execute(
                """
                SELECT s.id, s.name, s.description, s.owner_id, s.avatar, s.created_at, s.updated_at,
                       u.username as owner_username
                FROM servers s
                JOIN users u ON s.owner_id = u.id
                WHERE s.id = ?
                """,
                (server_id,)
            )
            
            server = cursor.fetchone()
            
            if not server:
                return {"error": "服务器不存在"}, 404
            
            server_dict = dict(server)
            
            # 获取服务器成员
            cursor.execute(
                """
                SELECT u.id, u.username, u.email, sm.joined_at
                FROM server_members sm
                JOIN users u ON sm.user_id = u.id
                WHERE sm.server_id = ?
                ORDER BY sm.joined_at ASC
                """,
                (server_id,)
            )
            
            members = cursor.fetchall()
            member_list = [dict(member) for member in members]
            
            server_dict['members'] = member_list
            
            return server_dict, 200
            
        except Error as e:
            return {"error": f"获取服务器详情失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def create_server(self, creator_username, name, description=None, avatar=None):
        """创建新服务器"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取创建者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (creator_username,))
            creator = cursor.fetchone()
            
            if not creator:
                return {"error": "创建者不存在"}, 404
            
            creator_id = creator['id']
            
            # 创建服务器
            cursor.execute(
                """
                INSERT INTO servers (name, description, owner_id, avatar, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    name, 
                    description, 
                    creator_id, 
                    avatar,
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                )
            )
            
            server_id = cursor.lastrowid
            
            # 添加创建者为成员
            cursor.execute(
                "INSERT INTO server_members (server_id, user_id) VALUES (?, ?)",
                (server_id, creator_id)
            )
            
            conn.commit()
            
            return {
                "id": server_id,
                "name": name,
                "description": description,
                "owner_id": creator_id,
                "owner_username": creator_username,
                "avatar": avatar,
                "created_at": datetime.now().isoformat()
            }, 201
            
        except Error as e:
            conn.rollback()
            return {"error": f"创建服务器失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def add_server_member(self, server_id, owner_username, member_username):
        """添加成员到服务器"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取服务器信息
            cursor.execute("SELECT owner_id FROM servers WHERE id = ?", (server_id,))
            server = cursor.fetchone()
            
            if not server:
                return {"error": "服务器不存在"}, 404
            
            # 获取操作者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (owner_username,))
            owner = cursor.fetchone()
            
            if not owner:
                return {"error": "操作者不存在"}, 404
            
            # 验证操作者是否为服务器拥有者
            if server['owner_id'] != owner['id']:
                return {"error": "只有服务器拥有者才能添加成员"}, 403
            
            # 获取要添加的用户ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (member_username,))
            member = cursor.fetchone()
            
            if not member:
                return {"error": "要添加的用户不存在"}, 404
            
            member_id = member['id']
            
            # 检查用户是否已是成员
            cursor.execute(
                "SELECT id FROM server_members WHERE server_id = ? AND user_id = ?",
                (server_id, member_id)
            )
            
            if cursor.fetchone():
                return {"message": "用户已是该服务器的成员"}, 200
            
            # 添加成员
            cursor.execute(
                "INSERT INTO server_members (server_id, user_id) VALUES (?, ?)",
                (server_id, member_id)
            )
            
            conn.commit()
            
            return {"message": "成员添加成功"}, 201
            
        except Error as e:
            conn.rollback()
            return {"error": f"添加成员失败: {str(e)}"}, 500
            
        finally:
            conn.close()
    
    def update_server(self, server_id, owner_username, data):
        """更新服务器信息"""
        conn = self.db_manager.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取服务器信息
            cursor.execute("SELECT owner_id FROM servers WHERE id = ?", (server_id,))
            server = cursor.fetchone()
            
            if not server:
                return {"error": "服务器不存在"}, 404
            
            # 获取操作者ID
            cursor.execute("SELECT id FROM users WHERE username = ?", (owner_username,))
            owner = cursor.fetchone()
            
            if not owner:
                return {"error": "操作者不存在"}, 404
            
            # 验证操作者是否为服务器拥有者
            if server['owner_id'] != owner['id']:
                return {"error": "只有服务器拥有者才能更新服务器信息"}, 403
            
            # 构建更新语句
            update_fields = []
            params = []
            
            for key, value in data.items():
                if key in ['name', 'description', 'avatar']:
                    update_fields.append(f"{key} = ?")
                    params.append(value)
            
            if not update_fields:
                return {"error": "没有提供可更新的字段"}, 400
            
            # 添加更新时间
            update_fields.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            
            # 添加服务器ID到参数列表
            params.append(server_id)
            
            # 执行更新
            cursor.execute(
                f"UPDATE servers SET {', '.join(update_fields)} WHERE id = ?",
                tuple(params)
            )
            
            conn.commit()
            
            if cursor.rowcount > 0:
                return {"message": "服务器信息更新成功"}, 200
            else:
                return {"error": "服务器信息未更改"}, 400
            
        except Error as e:
            conn.rollback()
            return {"error": f"更新服务器信息失败: {str(e)}"}, 500
            
        finally:
            conn.close() 