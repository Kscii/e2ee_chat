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
        
        conn.commit()
        conn.close()
        print("数据库初始化完成")

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