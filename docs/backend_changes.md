# 后端需要进行的修改

## 私钥Blob格式处理

前端现在上传的私钥格式已更改为JSON Blob结构。后端的`savePrivateKey`接口需要进行相应修改。

### 前端现在发送的新格式

```json
{
  "version": 1,
  "salt": "32位十六进制字符的盐值",
  "ciphertext": "Base64编码的加密私钥"
}
```

### 后端需要的修改

1. 解析收到的JSON字符串
2. 验证Blob对象是否包含必要的字段：`version`, `salt`, `ciphertext`
3. 分别存储这些字段（尤其是要单独存储`salt`和`ciphertext`）
4. 返回时，后端需要以同样的JSON格式返回完整的Blob

### 代码示例（伪代码）

```python
# 保存私钥
def save_private_key(username, private_key_json):
    try:
        # 解析JSON
        key_blob = json.loads(private_key_json)
        
        # 验证格式
        if 'version' not in key_blob or 'salt' not in key_blob or 'ciphertext' not in key_blob:
            return {'error': '无效的密钥格式'}, 400
            
        # 分别存储字段
        user = get_user(username)
        user.private_key_version = key_blob['version']
        user.encryption_salt = key_blob['salt']  # 重要：单独存储盐值
        user.encrypted_private_key = key_blob['ciphertext']  # 存储实际密文
        user.save()
        
        return {'message': '私钥已保存'}, 200
        
    except json.JSONDecodeError:
        # 处理旧格式（直接是加密文本）
        user = get_user(username)
        user.encrypted_private_key = private_key_json
        user.save()
        
        return {'message': '私钥已保存（旧格式）'}, 200
```

## 盐值格式统一

前端已经修改为生成32位十六进制字符的盐值，与后端保持一致。现有的盐值应该保持兼容。

## 获取私钥

获取私钥时，需要以Blob格式返回：

```python
# 获取私钥
def get_private_key(username):
    user = get_user(username)
    
    # 检查是否有所有必要的字段
    if hasattr(user, 'encrypted_private_key') and hasattr(user, 'encryption_salt') and hasattr(user, 'private_key_version'):
        # 返回Blob格式
        blob = {
            'version': user.private_key_version,
            'salt': user.encryption_salt,
            'ciphertext': user.encrypted_private_key
        }
        return json.dumps(blob), 200
    elif hasattr(user, 'encrypted_private_key'):
        # 仅有旧格式密钥，直接返回
        return user.encrypted_private_key, 200
    else:
        return {'error': '找不到私钥'}, 404
```

请根据实际的后端实现进行适当的修改。这些变更关键是要确保能正确处理新的Blob格式，并保持向后兼容性。 