#!/usr/bin/env python
"""
重置数据库的脚本
"""
import os
import sqlite3
from models import DatabaseManager

def reset_database():
    """删除并重建数据库"""
    db_path = 'users.db'
    
    # 删除现有数据库文件
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"已删除现有数据库文件: {db_path}")
        except Exception as e:
            print(f"无法删除数据库文件: {e}")
            return False
    
    # 初始化新的数据库
    try:
        print("正在创建新的数据库...")
        db_manager = DatabaseManager()
        db_manager.init_db()
        print("数据库初始化完成！")
        return True
    except Exception as e:
        print(f"数据库初始化失败: {e}")
        return False

if __name__ == "__main__":
    print("=== 数据库重置工具 ===")
    confirm = input("此操作将删除所有用户数据并重置数据库。确定要继续吗? (y/n): ")
    
    if confirm.lower() == 'y':
        if reset_database():
            print("数据库已成功重置。现在您可以重新注册用户了。")
        else:
            print("数据库重置失败。")
    else:
        print("操作已取消。") 