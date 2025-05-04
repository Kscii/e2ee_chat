# 安全密码存储演示

## 1. 强哈希算法的特性与选择理由

安全密码存储是应用安全的基础。当选择密码哈希算法时，以下特性至关重要：

### 强哈希算法的关键特性

1. **计算强度高（计算密集型）**
   - 算法应该设计为故意缓慢，需要大量计算资源
   - 可配置的工作因子(work factor)，随硬件发展可以调整难度

2. **抗碰撞性**
   - 几乎不可能找到两个不同输入产生相同哈希输出
   - 即使改变输入的一个微小部分，哈希输出也应显著不同

3. **抗预计算攻击**
   - 抵抗彩虹表和查询表攻击
   - 通过加盐使预计算攻击变得不可行

4. **雪崩效应**
   - 输入的微小变化会导致输出的显著变化
   - 无法从哈希值推断原始密码的任何部分

5. **历史安全记录**
   - 经过密码学专家审查
   - 经受住时间检验，没有发现致命缺陷

### 为什么选择bcrypt?

在我们的应用中，我们选择了**bcrypt**算法，出于以下原因：

1. **专为密码设计**：bcrypt专门为密码哈希设计，而不是通用哈希函数（如SHA-256）

2. **内置盐处理**：bcrypt自动生成随机盐并将其作为哈希输出的一部分存储

3. **可调整的工作因子**：可以设置计算强度，允许随着硬件发展增加难度

4. **经过时间考验**：自1999年发布以来一直是行业标准，被广泛应用

5. **实现简单**：广泛的库支持，难以错误实现

6. **抵抗硬件加速攻击**：设计抵抗GPU和ASIC攻击，通过占用大量内存

## 2. 安全密码哈希实现

我们的应用使用bcrypt算法结合salt和pepper方法实现了安全的密码存储。下面展示实现细节和代码示例。

### 实现架构

我们的密码存储策略具有多层保护：

1. 客户端验证 - 基本密码强度检查
2. 服务端哈希 - 使用bcrypt+salt+pepper处理
3. 安全存储 - 永远只存储哈希值，从不存储明文密码

### 代码实现

#### 用户注册流程（密码哈希）

```python
# 从配置文件加载pepper，不存储在数据库中
PEPPER = os.environ.get('SECRET_PEPPER', 'your-pepper-value-here')

def register_user(username, password, email, phone):
    # 检查用户名是否已存在
    cursor.execute("SELECT username FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        return {"error": "用户名已存在"}, 409
        
    # 添加pepper到密码
    password_with_pepper = password + PEPPER
    
    # 使用bcrypt生成哈希，cost factor=12（默认）
    # bcrypt会自动生成随机盐并将其包含在哈希中
    password_hash = bcrypt.hashpw(password_with_pepper.encode(), bcrypt.gensalt())
    
    # 存储用户信息，只存储哈希值，不存储明文密码或单独的盐值
    cursor.execute(
        "INSERT INTO users (username, email, phone, password_hash) VALUES (?, ?, ?, ?)",
        (username, email, phone, password_hash.decode())
    )
    conn.commit()
    
    return {"message": "注册成功"}, 201
```

#### 用户登录流程（密码验证）

```python
def login_user(username, password):
    # 查询用户
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    result = cursor.fetchone()
    
    if not result:
        return {"error": "用户不存在"}, 401
    
    # 获取存储的哈希值
    stored_hash = result['password_hash']
    
    # 添加pepper到输入的密码
    password_with_pepper = password + PEPPER
    
    # 验证密码是否匹配
    # bcrypt.checkpw会处理哈希中包含的盐值
    if bcrypt.checkpw(password_with_pepper.encode(), stored_hash.encode()):
        # 密码正确，生成JWT令牌
        token = generate_token(username)
        return {"message": "登录成功", "token": token}, 200
    else:
        # 密码错误
        return {"error": "密码不正确"}, 401
```

### 关键安全特性解析

1. **盐(Salt)处理**：
   - bcrypt自动生成随机盐值（128位）
   - 盐值直接存储在哈希字符串中，格式：`$2b$12$[salt][hash]`
   - 每个用户有唯一的盐值，即使相同密码也会产生不同哈希

2. **胡椒(Pepper)处理**：
   - 额外的应用级密钥，不存储在数据库中
   - 通过环境变量或配置文件加载
   - 提供额外的安全层，即使数据库被完全泄露也能保护密码

3. **工作因子(cost factor)**：
   - 设置为12，表示2^12次迭代
   - 在现代硬件上单次哈希约需0.3秒
   - 可以根据服务器性能和安全需求调整

### 在实践中验证密码安全

以下是验证我们密码存储安全性的方法：

#### 验证盐值随机性

1. 创建两个账户使用相同密码
2. 检查数据库中的哈希值是否不同

```sql
SELECT username, password_hash FROM users WHERE username IN ('test1', 'test2');
```

结果示例：
```
username  | password_hash
----------+--------------------------------------------------------------
test1     | $2b$12$FrYHhXOp9lnJi5NB3nKfA.KnuQZVF51yKdVkS5mLbs1.qhJFdxpau
test2     | $2b$12$TpWGcroXtCPeZ2orXRgSgexGsEwFj1vw1szrOQ5/IpvrlHmCnN3Tm
```

尽管使用相同密码，哈希值完全不同，证明每个用户有唯一盐值。

#### 验证哈希时间

可以测量哈希时间来确认工作因子设置合理：

```python
import time
import bcrypt

def measure_hash_time():
    password = "test_password" + PEPPER
    start_time = time.time()
    bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
    end_time = time.time()
    return f"哈希时间: {end_time - start_time:.3f} 秒"

print(measure_hash_time())
```

理想的结果应该是在0.2-0.4秒之间，足够慢以阻止暴力攻击，但不会影响正常用户体验。

## 总结

我们的项目使用bcrypt结合salt和pepper实现了高度安全的密码存储机制。这种方法不仅符合当前的行业最佳实践，还为未来的安全需求提供了可扩展性。通过合理配置的工作因子、自动生成的随机盐以及应用级pepper，我们的实现能够有效抵抗各种针对密码的攻击，包括暴力破解、彩虹表和预计算攻击。 