#!/usr/bin/env python3
"""
清空用户聊天数据脚本
用途：清空数据库中的所有消息和会话记录，同时保留用户账户数据
"""

import sqlite3
import os
import sys
from datetime import datetime
from config import DATABASE_PATH

def clear_chat_data(database_path=DATABASE_PATH):
    """清空聊天数据并重置自增ID"""
    try:
        # 检查数据库文件是否存在
        if not os.path.exists(database_path):
            print(f"错误: 数据库文件不存在: {database_path}")
            return False
        
        # 创建备份
        backup_path = f"{database_path}.{datetime.now().strftime('%Y%m%d%H%M%S')}.backup"
        with open(database_path, 'rb') as src, open(backup_path, 'wb') as dst:
            dst.write(src.read())
        print(f"已创建数据库备份: {backup_path}")
        
        # 连接到数据库
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()
        
        # 开始事务
        conn.execute("BEGIN TRANSACTION")
        
        try:
            # 获取清空前的记录数量
            cursor.execute("SELECT COUNT(*) FROM conversations")
            conversations_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM messages")
            messages_count = cursor.fetchone()[0]
            
            # 获取群组消息数量
            cursor.execute("SELECT COUNT(*) FROM group_messages")
            group_messages_count = cursor.fetchone()[0]
            
            # 首先清空会话表（因为有外键约束）
            cursor.execute("DELETE FROM conversations")
            
            # 然后清空消息表
            cursor.execute("DELETE FROM messages")
            
            # 清空群组消息表
            cursor.execute("DELETE FROM group_messages")
            
            # 重置自增ID
            cursor.execute("DELETE FROM sqlite_sequence WHERE name='messages' OR name='conversations' OR name='group_messages'")
            
            # 提交事务
            conn.commit()
            
            print(f"操作成功！")
            print(f"已清空 {conversations_count} 条会话记录")
            print(f"已清空 {messages_count} 条消息记录")
            print(f"已清空 {group_messages_count} 条群组消息记录")
            print("用户账户数据和群组结构未受影响")
            
            # 压缩数据库（可选）
            print("正在优化数据库...")
            conn.execute("VACUUM")
            print("数据库优化完成")
            
            return True
            
        except Exception as e:
            # 如果出错，回滚事务
            conn.rollback()
            print(f"错误: 清空数据失败: {str(e)}")
            return False
            
        finally:
            # 关闭连接
            conn.close()
            
    except Exception as e:
        print(f"错误: {str(e)}")
        return False

def main():
    """脚本入口函数"""
    print("===== 聊天数据清空工具 =====")
    print("警告: 此操作将永久删除所有聊天记录、会话数据和群组消息")
    print("      用户账户数据和群组本身将保留")
    
    # 确认操作
    confirm = input("确认要清空所有聊天数据吗? [y/N]: ")
    if confirm.lower() != 'y':
        print("操作已取消")
        return
    
    # 执行清空操作
    success = clear_chat_data()
    
    if success:
        print("===== 操作完成 =====")
    else:
        print("===== 操作失败 =====")

if __name__ == "__main__":
    main() 