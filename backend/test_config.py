#!/usr/bin/env python
"""
配置测试脚本 - 验证配置是否正确加载
"""
import config

def safe_print(value):
    """安全地打印值，不显示完整内容"""
    if isinstance(value, str):
        if len(value) > 8:
            return value[:3] + "..." + value[-3:]
        return "***"
    return value

print("=== 配置测试 ===")
print(f"DEBUG: {config.DEBUG}")
print(f"HOST: {config.HOST}")
print(f"PORT: {config.PORT}")
print(f"SECRET_KEY: {safe_print(config.SECRET_KEY)}")
print(f"PEPPER: {safe_print(config.PEPPER)}")
print(f"PEPPER是否是默认值: {'是' if config.PEPPER == 'your-pepper-value-here' else '否'}")
print(f"TOKEN_EXPIRE_MINUTES: {config.TOKEN_EXPIRE_MINUTES}")
print(f"DATABASE_PATH: {config.DATABASE_PATH}")
print(f"CORS_ORIGINS: {config.CORS_ORIGINS}")

if __name__ == "__main__":
    if config.PEPPER == "your-pepper-value-here":
        print("\n警告: PEPPER仍然使用默认值！这会导致认证失败。")
        print("请修改config.py中的默认PEPPER值或者创建.env文件并设置SECRET_PEPPER变量。")
    else:
        print("\n配置正常，PEPPER值已更新。") 