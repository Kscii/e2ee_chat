import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import bcrypt from 'bcryptjs';
import { savePrivateKey, getPrivateKey, getUserPublicKey } from '../api/keys';
import { getUserEncryptionSalt } from '../api/salt';

// 密钥对接口
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

// 用于储存的字符串格式密钥对
export interface StringKeyPair {
  publicKey: string;
  secretKey: string;
}

// 加密工具类
export class CryptoService {
  // 缓存的盐值
  private static encryptionSalt: string | null = null;
  
  // 获取加密盐值
  private static async getEncryptionSalt(): Promise<string> {
    // 从localStorage获取用户名
    const username = localStorage.getItem('username');
    if (!username) {
      console.warn('[CryptoService] 警告: 没有找到用户名，使用默认盐值');
      return 'fallback_encryption_salt';
    }
    
    // 始终尝试从服务器获取盐值，确保使用最新的正确盐值
    try {
      console.log('[CryptoService] 从服务器获取加密盐值');
      this.encryptionSalt = await getUserEncryptionSalt(username);
      console.log('[CryptoService] 成功从服务器获取加密盐值');
      
      return this.encryptionSalt;
    } catch (error) {
      console.error('[CryptoService] 获取用户加密盐值失败:', error);
      
      // 只有在服务器获取失败时才使用备用盐值
      if (this.encryptionSalt) {
        console.warn('[CryptoService] 使用上一次缓存的盐值');
        return this.encryptionSalt;
      }
      
      // 如果完全无法获取盐值，使用基于用户名的备用盐值
      const fallbackSalt = 'user_' + username + '_salt';
      console.warn('[CryptoService] 使用基于用户名的备用加密盐值:', fallbackSalt);
      this.encryptionSalt = fallbackSalt;
      
      return fallbackSalt;
    }
  }
  
  // 由于我们不再使用auth_salt，这个方法可以保留但被弃用
  private static async getAuthSalt(): Promise<string> {
    console.warn('[CryptoService] getAuthSalt方法已被弃用');
    return 'fallback_auth_salt';
  }
  
  // 生成新的密钥对
  static generateKeyPair(): KeyPair {
    return nacl.box.keyPair();
  }

  // 将二进制密钥转换为Base64字符串
  static keyToString(key: Uint8Array): string {
    return naclUtil.encodeBase64(key);
  }

  // 将Base64字符串转换回二进制密钥
  static stringToKey(keyString: string): Uint8Array {
    return naclUtil.decodeBase64(keyString);
  }

  // 将密钥对转换为字符串格式以便存储
  static keyPairToString(keyPair: KeyPair): StringKeyPair {
    return {
      publicKey: this.keyToString(keyPair.publicKey),
      secretKey: this.keyToString(keyPair.secretKey)
    };
  }

  // 将字符串格式密钥对转换回原始格式
  static stringToKeyPair(stringKeyPair: StringKeyPair): KeyPair {
    return {
      publicKey: this.stringToKey(stringKeyPair.publicKey),
      secretKey: this.stringToKey(stringKeyPair.secretKey)
    };
  }

  // 加密消息
  static encryptMessage(message: string, recipientPublicKey: Uint8Array, senderSecretKey: Uint8Array): string {
    try {
      if (!message) {
        console.error('[CryptoService] 错误: 无法加密空消息!');
        throw new Error('无法加密空消息');
      }

      if (!recipientPublicKey || recipientPublicKey.length !== nacl.box.publicKeyLength) {
        console.error('[CryptoService] 错误: 接收者公钥无效!', 
          '长度:', recipientPublicKey ? recipientPublicKey.length : 0,
          '期望:', nacl.box.publicKeyLength);
        throw new Error('接收者公钥无效');
      }

      if (!senderSecretKey || senderSecretKey.length !== nacl.box.secretKeyLength) {
        console.error('[CryptoService] 错误: 发送者私钥无效!', 
          '长度:', senderSecretKey ? senderSecretKey.length : 0,
          '期望:', nacl.box.secretKeyLength);
        throw new Error('发送者私钥无效');
      }
      
      // 创建一次性随机数
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      
      // 将文本消息转换为二进制
      const messageUint8 = naclUtil.decodeUTF8(message);
      
      // 使用接收者的公钥和发送者的私钥加密消息
      const encryptedMessage = nacl.box(
        messageUint8,
        nonce,
        recipientPublicKey,
        senderSecretKey
      );
      
      if (!encryptedMessage) {
        console.error('[CryptoService] 错误: 消息加密失败! NaCl返回null');
        throw new Error('消息加密失败');
      }
      
      // 将nonce和加密后的消息合并
      const fullMessage = new Uint8Array(nonce.length + encryptedMessage.length);
      fullMessage.set(nonce);
      fullMessage.set(encryptedMessage, nonce.length);
      
      // 输出诊断信息
      console.log('[CryptoService] 消息加密成功 - 元数据:', 
        '原始消息长度:', message.length,
        'byte长度:', messageUint8.length,
        '加密后长度:', encryptedMessage.length,
        '完整消息长度:', fullMessage.length);
      
      // 转换为Base64字符串
      return naclUtil.encodeBase64(fullMessage);
    } catch (error) {
      console.error('[CryptoService] 加密消息时发生异常:', error);
      throw error;
    }
  }

  // 解密消息
  static decryptMessage(encryptedMessageBase64: string, senderPublicKey: Uint8Array, recipientSecretKey: Uint8Array): string | null {
    try {
      if (!encryptedMessageBase64) {
        console.error('[CryptoService] 错误: 无法解密空消息!');
        return null;
      }

      if (!senderPublicKey || senderPublicKey.length !== nacl.box.publicKeyLength) {
        console.error('[CryptoService] 错误: 发送者公钥无效!', 
          '长度:', senderPublicKey ? senderPublicKey.length : 0,
          '期望:', nacl.box.publicKeyLength);
        return null;
      }

      if (!recipientSecretKey || recipientSecretKey.length !== nacl.box.secretKeyLength) {
        console.error('[CryptoService] 错误: 接收者私钥无效!', 
          '长度:', recipientSecretKey ? recipientSecretKey.length : 0, 
          '期望:', nacl.box.secretKeyLength);
        return null;
      }
      
      // 将Base64字符串转换回二进制
      let encryptedMessageWithNonce;
      try {
        encryptedMessageWithNonce = naclUtil.decodeBase64(encryptedMessageBase64);
      } catch (error) {
        console.error('[CryptoService] 错误: 无法解码Base64消息:', error);
        return null;
      }
      
      // 检查消息长度
      if (encryptedMessageWithNonce.length <= nacl.box.nonceLength) {
        console.error('[CryptoService] 错误: 加密消息太短! 长度:', encryptedMessageWithNonce.length);
        return null;
      }
      
      // 提取nonce
      const nonce = encryptedMessageWithNonce.slice(0, nacl.box.nonceLength);
      
      // 提取加密消息
      const encryptedMessage = encryptedMessageWithNonce.slice(nacl.box.nonceLength);
      
      console.log('[CryptoService] 尝试解密消息 - 元数据:', 
        '发送者公钥 ID:', naclUtil.encodeBase64(senderPublicKey).substring(0, 8) + '...',
        '接收者私钥 ID:', naclUtil.encodeBase64(recipientSecretKey).substring(0, 8) + '...',
        'nonce长度:', nonce.length,
        '加密消息长度:', encryptedMessage.length);
      
      // 使用发送者的公钥和接收者的私钥解密消息
      const decryptedMessage = nacl.box.open(
        encryptedMessage,
        nonce,
        senderPublicKey,
        recipientSecretKey
      );
      
      // 如果解密失败，返回null
      if (!decryptedMessage) {
        console.error('[CryptoService] 错误: 消息解密失败! 密钥可能不匹配');
        // 输出额外的诊断信息
        console.error('[CryptoService] 解密失败的消息详情:', 
          '消息Base64:', encryptedMessageBase64.substring(0, 20) + '...',
          '发送者公钥:', naclUtil.encodeBase64(senderPublicKey),
          '接收者私钥前8位:', naclUtil.encodeBase64(recipientSecretKey).substring(0, 8) + '...');
        return null;
      }
      
      // 将二进制转换回文本
      try {
        const result = naclUtil.encodeUTF8(decryptedMessage);
        console.log('[CryptoService] 消息解密成功 - 长度:', result.length);
        return result;
      } catch (error) {
        console.error('[CryptoService] 错误: 解密成功但UTF8解码失败:', error);
        return null;
      }
    } catch (error) {
      console.error('[CryptoService] 解密消息时发生严重异常:', error);
      return null;
    }
  }
  
  // 第一次哈希 - 生成用于加密私钥的密钥（存储在本地，永不发送到服务器）
  static async generateEncryptionKey(password: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // 获取服务器提供的盐值
    const salt = await this.getEncryptionSalt();
    
    // 添加动态盐值增加安全性
    const saltedPassword = new Uint8Array([
      ...passwordData, 
      ...encoder.encode(salt)
    ]);
    
    // 使用SHA-512哈希并取前32字节作为密钥
    const hashKey = nacl.hash(saltedPassword);
    return hashKey.slice(0, 32); // 用于加密私钥的密钥
  }
  
  // 使用bcrypt生成更安全的哈希（发送到服务器进行验证）
  static async generateBcryptHash(password: string): Promise<string> {
    // 默认使用强度为10的bcrypt盐值（2^10次迭代）
    return await bcrypt.hash(password, 10);
  }
  
  // 使用bcrypt验证密码是否匹配存储的哈希
  static async compareBcryptHash(password: string, storedHash: string): Promise<boolean> {
    return await bcrypt.compare(password, storedHash);
  }
  
  // 第二次哈希 - 生成用于服务器验证的哈希（发送到服务器）
  // 现在使用第一次哈希结果作为输入，而不是原始密码
  static async generateAuthHash(password: string): Promise<string> {
    // 先生成第一次哈希结果 (加密密钥)
    const encryptionKey = await this.generateEncryptionKey(password);
    
    // 获取服务器提供的认证盐值
    const authSalt = await this.getAuthSalt();
    
    // 将加密密钥与认证盐值组合
    const saltedKey = new Uint8Array([
      ...encryptionKey, 
      ...new TextEncoder().encode(authSalt)
    ]);
    
    // 使用SHA-512哈希函数
    const hashKey = nacl.hash(saltedKey);
    
    // 转换为Base64格式以便于传输和存储
    return naclUtil.encodeBase64(hashKey);
  }

  // 使用加密密钥加密私钥 - 使用哈希值a而非原始密码
  static async encryptPrivateKey(secretKey: string, password: string): Promise<string> {
    // 生成加密密钥（使用第一次哈希）
    const encryptionKey = await this.generateEncryptionKey(password);
    
    // 创建一次性随机数
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    
    // 将私钥转换为二进制
    const secretKeyUint8 = naclUtil.decodeBase64(secretKey);
    
    // 使用加密密钥加密私钥
    const encryptedSecretKey = nacl.secretbox(
      secretKeyUint8,
      nonce,
      encryptionKey
    );
    
    // 将nonce和加密后的私钥合并
    const fullEncrypted = new Uint8Array(nonce.length + encryptedSecretKey.length);
    fullEncrypted.set(nonce);
    fullEncrypted.set(encryptedSecretKey, nonce.length);
    
    // 输出调试信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('加密私钥 - 原始私钥:', secretKey);
      console.log('加密私钥 - 加密密钥(前32位哈希):', naclUtil.encodeBase64(encryptionKey));
      console.log('加密私钥 - 加密后:', naclUtil.encodeBase64(fullEncrypted));
    }
    
    // 转换为Base64字符串
    return naclUtil.encodeBase64(fullEncrypted);
  }

  // 解密私钥 - 使用哈希值a而非原始密码
  static async decryptPrivateKey(encryptedSecretKeyBase64: string, password: string): Promise<string | null> {
    try {
      // 生成加密密钥（使用第一次哈希）
      const encryptionKey = await this.generateEncryptionKey(password);
      
      // 将Base64字符串转换回二进制
      const encryptedWithNonce = naclUtil.decodeBase64(encryptedSecretKeyBase64);
      
      // 提取nonce
      const nonce = encryptedWithNonce.slice(0, nacl.secretbox.nonceLength);
      
      // 提取加密私钥
      const encryptedSecretKey = encryptedWithNonce.slice(nacl.secretbox.nonceLength);
      
      // 使用加密密钥解密私钥
      const decryptedSecretKey = nacl.secretbox.open(
        encryptedSecretKey,
        nonce,
        encryptionKey
      );
      
      // 如果解密失败，返回null
      if (!decryptedSecretKey) return null;
      
      // 输出调试信息（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('解密私钥 - 加密的私钥:', encryptedSecretKeyBase64);
        console.log('解密私钥 - 解密密钥(前32位哈希):', naclUtil.encodeBase64(encryptionKey));
        console.log('解密私钥 - 解密后:', naclUtil.encodeBase64(decryptedSecretKey));
      }
      
      // 将二进制转换回Base64字符串
      return naclUtil.encodeBase64(decryptedSecretKey);
    } catch (error) {
      console.error('解密私钥失败:', error);
      return null;
    }
  }

  // 从密码创建密钥（用于加密私钥）- 已弃用，保留兼容性
  private static async createPasswordKey(password: string): Promise<Uint8Array> {
    return this.generateEncryptionKey(password);
  }

  // 尝试使用多种密钥解密私钥
  private static async tryDecryptWithMultipleKeys(encryptedSecretKey: string, password: string): Promise<string | null> {
    console.log('[CryptoService] 尝试使用多种密钥解密私钥...');
    
    // 获取用户名
    const username = localStorage.getItem('username');
    if (!username) {
      console.error('[CryptoService] 无法获取用户名，无法进行解密尝试');
      return null;
    }
    
    // 尝试方式1：使用服务器盐值派生的密钥
    try {
      // 获取服务器上的真实盐值
      let serverSalt;
      try {
        serverSalt = await getUserEncryptionSalt(username);
        console.log('[CryptoService] 成功从服务器获取用户加密盐值');
      } catch (error) {
        console.error('[CryptoService] 从服务器获取加密盐值失败:', error);
        serverSalt = null;
      }
      
      if (serverSalt) {
        // 临时设置盐值为服务器盐值
        const originalSalt = this.encryptionSalt;
        this.encryptionSalt = serverSalt;
        
        console.log('[CryptoService] 尝试方法1: 使用服务器盐值派生密钥解密');
        const encryptionKey = await this.generateEncryptionKey(password);
        const decryptedKey = await this.decryptPrivateKeyWithKey(encryptedSecretKey, encryptionKey);
        
        // 恢复原始盐值
        this.encryptionSalt = originalSalt;
        
        if (decryptedKey) {
          console.log('[CryptoService] 成功: 使用服务器盐值派生密钥解密成功');
          return decryptedKey;
        }
      }
    } catch (error) {
      console.warn('[CryptoService] 方法1解密失败:', error);
    }
    
    // 尝试方式2：使用基于用户名的盐值派生的密钥
    try {
      console.log('[CryptoService] 尝试方法2: 使用基于用户名的盐值派生密钥解密');
      
      // 临时设置盐值
      const originalSalt = this.encryptionSalt;
      this.encryptionSalt = 'user_' + username + '_salt';
      
      const usernameSaltKey = await this.generateEncryptionKey(password);
      const decryptedKey = await this.decryptPrivateKeyWithKey(encryptedSecretKey, usernameSaltKey);
      
      // 恢复原始盐值
      this.encryptionSalt = originalSalt;
      
      if (decryptedKey) {
        console.log('[CryptoService] 成功: 使用基于用户名的盐值派生密钥解密成功');
        return decryptedKey;
      }
    } catch (error) {
      console.warn('[CryptoService] 方法2解密失败:', error);
    }
    
    // 尝试方式3：使用默认盐值派生的密钥
    try {
      console.log('[CryptoService] 尝试方法3: 使用默认盐值派生密钥解密');
      
      // 临时设置盐值
      const originalSalt = this.encryptionSalt;
      this.encryptionSalt = 'fallback_encryption_salt';
      
      const fallbackKey = await this.generateEncryptionKey(password);
      const decryptedKey = await this.decryptPrivateKeyWithKey(encryptedSecretKey, fallbackKey);
      
      // 恢复原始盐值
      this.encryptionSalt = originalSalt;
      
      if (decryptedKey) {
        console.log('[CryptoService] 成功: 使用默认盐值派生密钥解密成功');
        return decryptedKey;
      }
    } catch (error) {
      console.warn('[CryptoService] 方法3解密失败:', error);
    }
    
    console.error('[CryptoService] 所有解密方法均失败');
    return null;
  }

  // 创建密钥对并保存到localStorage
  static async initializeKeyPair(password: string): Promise<StringKeyPair> {
    try {
      console.log('[CryptoService] 初始化密钥对开始');
      console.log('[CryptoService] 诊断: 检查现有密钥状态...');
      
      // 首先检查localStorage中是否已有密钥对
      const storedKeyPair = localStorage.getItem('userKeyPair');
      
      // 检查本地私钥
      if (storedKeyPair) {
        console.log('[CryptoService] 从localStorage加载已有密钥对');
        try {
          const parsedKeyPair = JSON.parse(storedKeyPair);
          if (!parsedKeyPair.publicKey || !parsedKeyPair.secretKey) {
            console.error('[CryptoService] 警告: 本地密钥对格式不正确!', 
              'publicKey存在:', !!parsedKeyPair.publicKey, 
              'secretKey存在:', !!parsedKeyPair.secretKey);
          }
          return parsedKeyPair;
        } catch (error) {
          console.error('[CryptoService] 错误: 本地密钥对解析失败!', error);
          localStorage.removeItem('userKeyPair'); // 移除无效的密钥对
        }
      } else {
        console.warn('[CryptoService] 警告: 本地私钥丢失! 没有找到localStorage中的userKeyPair');
      }
      
      // 获取或生成用于加密/解密的密钥
      let encryptionKey: Uint8Array;
      const storedEncryptionKeyString = localStorage.getItem('encryptionKey');
      const username = localStorage.getItem('username');
      
      if (storedEncryptionKeyString) {
        // 如果已经有存储的加密密钥，直接使用
        console.log('[CryptoService] 使用已存储的加密密钥');
        try {
          encryptionKey = this.stringToKey(storedEncryptionKeyString);
          console.log('[CryptoService] 加密密钥长度:', encryptionKey.length, '字节');
        } catch (error) {
          console.error('[CryptoService] 错误: 派生密钥损坏! 无法解析encryptionKey', error);
          localStorage.removeItem('encryptionKey'); // 移除无效的加密密钥
          
          // 如果有密码，重新派生
          if (password) {
            console.log('[CryptoService] 尝试从密码重新派生加密密钥');
            encryptionKey = await this.generateEncryptionKey(password);
            localStorage.setItem('encryptionKey', this.keyToString(encryptionKey));
          } else {
            throw new Error('派生密钥丢失且无法重新派生 - 没有密码');
          }
        }
      } else if (password) {
        // 如果没有存储的密钥但有密码，从密码派生密钥
        console.warn('[CryptoService] 警告: 派生密钥丢失! 没有找到localStorage中的encryptionKey');
        console.log('[CryptoService] 从密码派生新的加密密钥');
        encryptionKey = await this.generateEncryptionKey(password);
        // 保存派生的密钥，这样下次可以直接使用
        localStorage.setItem('encryptionKey', this.keyToString(encryptionKey));
      } else {
        // 既没有密钥也没有密码，无法继续
        console.error('[CryptoService] 严重错误: 派生密钥丢失且无法重新派生 - 没有密码!');
        throw new Error('无法初始化密钥对：没有加密密钥也没有密码');
      }
      
      // 尝试从服务器获取加密的私钥
      let needCreateNewKeyPair = true;
      try {
        console.log('[CryptoService] 尝试从服务器获取加密的私钥...');
        const encryptedSecretKey = await getPrivateKey();
        
        if (encryptedSecretKey) {
          needCreateNewKeyPair = false;
          console.log('[CryptoService] 已从服务器检索到加密私钥，正在解密...');
          
          // 首先尝试使用当前的加密密钥解密
          let decryptedSecretKey = await this.decryptPrivateKeyWithKey(encryptedSecretKey, encryptionKey);
          
          // 如果解密失败，尝试使用多种方法解密
          if (!decryptedSecretKey && password) {
            console.log('[CryptoService] 使用当前密钥解密失败，尝试其他方法...');
            decryptedSecretKey = await this.tryDecryptWithMultipleKeys(encryptedSecretKey, password);
            
            // 如果成功解密，更新本地存储的加密密钥
            if (decryptedSecretKey) {
              // 重新使用成功的盐值派生密钥并保存
              encryptionKey = await this.generateEncryptionKey(password);
              localStorage.setItem('encryptionKey', this.keyToString(encryptionKey));
              console.log('[CryptoService] 已更新本地加密密钥');
            }
          }
          
          if (decryptedSecretKey) {
            console.log('[CryptoService] 私钥解密成功，正在获取公钥...');
            // 从服务器获取用户的公钥
            const publicKey = await this.getUserPublicKeyFromServer();
            
            if (publicKey) {
              console.log('[CryptoService] 已获取公钥，正在恢复密钥对...');
              const keyPair = {
                publicKey: publicKey,
                secretKey: decryptedSecretKey
              };
              
              // 保存到localStorage
              localStorage.setItem('userKeyPair', JSON.stringify(keyPair));
              console.log('[CryptoService] 密钥对已恢复并保存到localStorage');
              
              return keyPair;
            } else {
              console.error('[CryptoService] 错误: 服务器公钥丢失! 无法获取用户的公钥');
              needCreateNewKeyPair = true;
            }
          } else {
            console.error('[CryptoService] 错误: 私钥解密失败! 尝试了所有可能的派生密钥方法');
            needCreateNewKeyPair = true;
          }
        } else {
          console.error('[CryptoService] 错误: 加密私钥丢失! 服务器上没有找到加密的私钥');
          needCreateNewKeyPair = true;
        }
      } catch (error) {
        console.error('[CryptoService] 错误: 从服务器获取私钥时出现异常:', error);
        needCreateNewKeyPair = true;
      }
      
      // 如果需要创建新密钥对（服务器没有私钥或恢复失败）
      if (needCreateNewKeyPair) {
        // 检查是否是首次注册/登录场景
        const hasGeneratedKeysFlag = localStorage.getItem('_hasGeneratedKeys_' + username);
        
        if (!hasGeneratedKeysFlag) {
          // 只在第一次才生成新的密钥对
          console.log('[CryptoService] 检测到首次使用，创建新密钥对');
          
          // 生成新的密钥对
          console.log('[CryptoService] 正在生成新的密钥对...');
          const keyPair = this.generateKeyPair();
          const stringKeyPair = this.keyPairToString(keyPair);
          
          // 输出调试信息（仅在开发环境）
          if (process.env.NODE_ENV === 'development') {
            console.log('[CryptoService] 新创建的密钥对:', stringKeyPair);
          }
          
          // 加密私钥
          console.log('[CryptoService] 正在使用加密密钥加密私钥...');
          const encryptedPrivateKey = await this.encryptPrivateKeyWithKey(stringKeyPair.secretKey, encryptionKey);
          
          // 保存加密的私钥到服务器
          try {
            console.log('[CryptoService] 正在保存加密的私钥到服务器...');
            await savePrivateKey(encryptedPrivateKey);
            console.log('[CryptoService] 加密私钥已成功保存到服务器');
            
            // 标记为已生成密钥，避免下次重新生成
            if (username) {
              localStorage.setItem('_hasGeneratedKeys_' + username, 'true');
            }
          } catch (error) {
            console.error('[CryptoService] 保存加密私钥到服务器失败:', error);
            // 不要因为保存失败而终止整个流程，但要记录错误
          }
          
          // 保存到localStorage
          localStorage.setItem('userKeyPair', JSON.stringify(stringKeyPair));
          console.log('[CryptoService] 密钥对已保存到localStorage');
          
          return stringKeyPair;
        } else {
          // 非首次使用但需要创建新密钥对，这是错误情况
          console.error('[CryptoService] 严重错误: 需要创建新密钥对，但不是首次使用!');
          console.error('[CryptoService] 这可能导致无法解密之前的消息!');
          
          // 这里可以添加一些恢复策略，但默认应该提示用户
          throw new Error('无法恢复原始密钥对，需要重置密钥才能继续。这将导致无法解密之前的消息。');
        }
      }
      
      // 这种情况不应该发生，但为了类型安全
      throw new Error('无法初始化密钥对，流程异常');
    } catch (error) {
      console.error('[CryptoService] 初始化密钥对失败:', error);
      throw error;
    }
  }

  // 使用加密密钥加密私钥(不依赖原始密码)
  static async encryptPrivateKeyWithKey(secretKey: string, encryptionKey: Uint8Array): Promise<string> {
    try {
      // 创建一次性随机数
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      
      // 将私钥转换为二进制
      const secretKeyUint8 = naclUtil.decodeBase64(secretKey);
      
      // 使用加密密钥加密私钥
      const encryptedSecretKey = nacl.secretbox(
        secretKeyUint8,
        nonce,
        encryptionKey
      );
      
      // 将nonce和加密后的私钥合并
      const fullEncrypted = new Uint8Array(nonce.length + encryptedSecretKey.length);
      fullEncrypted.set(nonce);
      fullEncrypted.set(encryptedSecretKey, nonce.length);
      
      // 输出调试信息（仅在开发环境）
      console.log('[CryptoService] 加密私钥 - 元数据:',
        '原始私钥长度:', secretKey.length,
        '加密密钥长度:', encryptionKey.length,
        '加密后长度:', fullEncrypted.length);
      
      // 转换为Base64字符串
      return naclUtil.encodeBase64(fullEncrypted);
    } catch (error) {
      console.error('[CryptoService] 错误: 加密私钥失败!', error);
      throw error;
    }
  }

  // 使用加密密钥解密私钥(不依赖原始密码)
  static async decryptPrivateKeyWithKey(encryptedSecretKeyBase64: string, encryptionKey: Uint8Array): Promise<string | null> {
    try {
      // 将Base64字符串转换回二进制
      const encryptedWithNonce = naclUtil.decodeBase64(encryptedSecretKeyBase64);
      
      // 提取nonce
      const nonce = encryptedWithNonce.slice(0, nacl.secretbox.nonceLength);
      
      // 提取加密私钥
      const encryptedSecretKey = encryptedWithNonce.slice(nacl.secretbox.nonceLength);
      
      // 使用加密密钥解密私钥
      const decryptedSecretKey = nacl.secretbox.open(
        encryptedSecretKey,
        nonce,
        encryptionKey
      );
      
      // 如果解密失败，返回null
      if (!decryptedSecretKey) {
        console.error('[CryptoService] 错误: 私钥解密失败! 无法使用提供的加密密钥解密');
        return null;
      }
      
      // 输出调试信息
      console.log('[CryptoService] 解密私钥 - 元数据:', 
        '加密的私钥长度:', encryptedSecretKeyBase64.length,
        '解密后长度:', decryptedSecretKey.length);
      
      // 将二进制转换回Base64字符串
      return naclUtil.encodeBase64(decryptedSecretKey);
    } catch (error) {
      console.error('[CryptoService] 错误: 解密私钥时发生异常:', error);
      return null;
    }
  }

  // 获取当前用户的密钥对
  static getUserKeyPair(): StringKeyPair | null {
    const storedKeyPair = localStorage.getItem('userKeyPair');
    return storedKeyPair ? JSON.parse(storedKeyPair) : null;
  }
  
  // 清除localStorage中的密钥对
  static clearKeyPair(): void {
    localStorage.removeItem('userKeyPair');
    console.log('[CryptoService] 密钥对已从localStorage清除');
  }
  
  // 从服务器获取当前用户的公钥
  private static async getUserPublicKeyFromServer(): Promise<string | null> {
    try {
      // 从localStorage获取用户名
      const username = localStorage.getItem('username');
      if (!username) {
        console.error('无法获取用户名，无法获取公钥');
        return null;
      }
      
      console.log(`正在获取用户 ${username} 的公钥...`);
      
      // 使用API获取公钥（从我们的keys.ts文件中导入）
      const publicKey = await getUserPublicKey(username);
      console.log(`成功获取用户 ${username} 的公钥`);
      
      return publicKey;
    } catch (error) {
      console.error('获取用户公钥失败:', error);
      return null;
    }
  }

  // 使用已存储的加密密钥尝试初始化密钥对（不需要密码）
  static async initializeKeyPairWithStoredKey(): Promise<StringKeyPair | null> {
    try {
      console.log('[CryptoService] 尝试使用已存储的加密密钥初始化密钥对');
      
      // 检查是否有存储的加密密钥
      const storedEncryptionKeyString = localStorage.getItem('encryptionKey');
      if (!storedEncryptionKeyString) {
        console.error('[CryptoService] 没有找到存储的加密密钥');
        return null;
      }
      
      // 将字符串转换回二进制密钥
      let encryptionKey: Uint8Array;
      try {
        encryptionKey = this.stringToKey(storedEncryptionKeyString);
        console.log('[CryptoService] 成功解析存储的加密密钥');
      } catch (error) {
        console.error('[CryptoService] 无法解析存储的加密密钥:', error);
        return null;
      }
      
      // 尝试从服务器获取加密的私钥
      try {
        console.log('[CryptoService] 尝试从服务器获取加密的私钥...');
        const encryptedSecretKey = await getPrivateKey();
        
        if (!encryptedSecretKey) {
          console.error('[CryptoService] 服务器上没有找到加密的私钥');
          return null;
        }
        
        console.log('[CryptoService] 已获取加密私钥，尝试使用存储的加密密钥解密...');
        
        // 使用存储的加密密钥解密私钥
        const decryptedSecretKey = await this.decryptPrivateKeyWithKey(encryptedSecretKey, encryptionKey);
        if (!decryptedSecretKey) {
          console.error('[CryptoService] 使用存储的加密密钥无法解密私钥');
          return null;
        }
        
        console.log('[CryptoService] 私钥解密成功，正在获取公钥...');
        
        // 获取用户的公钥
        const publicKey = await this.getUserPublicKeyFromServer();
        if (!publicKey) {
          console.error('[CryptoService] 无法获取用户的公钥');
          return null;
        }
        
        // 创建密钥对
        const keyPair = {
          publicKey: publicKey,
          secretKey: decryptedSecretKey
        };
        
        // 保存到localStorage
        localStorage.setItem('userKeyPair', JSON.stringify(keyPair));
        console.log('[CryptoService] 密钥对已通过存储的加密密钥成功恢复');
        
        return keyPair;
      } catch (error) {
        console.error('[CryptoService] 使用存储的加密密钥恢复密钥对失败:', error);
        return null;
      }
    } catch (error) {
      console.error('[CryptoService] initializeKeyPairWithStoredKey失败:', error);
      return null;
    }
  }

  // 使用已派生的加密密钥初始化密钥对
  static async initializeKeyPairWithEncryptionKey(encryptionKey: Uint8Array): Promise<StringKeyPair | null> {
    try {
      console.log('[CryptoService] 使用已派生的加密密钥初始化密钥对');
      
      // 首先检查localStorage中是否已有密钥对
      const storedKeyPair = localStorage.getItem('userKeyPair');
      if (storedKeyPair) {
        console.log('[CryptoService] 从localStorage加载已有密钥对');
        try {
          const parsedKeyPair = JSON.parse(storedKeyPair);
          if (!parsedKeyPair.publicKey || !parsedKeyPair.secretKey) {
            console.error('[CryptoService] 警告: 本地密钥对格式不正确');
          } else {
            return parsedKeyPair;
          }
        } catch (error) {
          console.error('[CryptoService] 错误: 本地密钥对解析失败:', error);
          localStorage.removeItem('userKeyPair');
        }
      }
      
      // 尝试从服务器获取加密的私钥
      try {
        console.log('[CryptoService] 尝试从服务器获取加密的私钥...');
        const encryptedSecretKey = await getPrivateKey();
        
        if (!encryptedSecretKey) {
          console.error('[CryptoService] 服务器上没有找到加密的私钥');
          return null;
        }
        
        console.log('[CryptoService] 已获取加密私钥，尝试解密...');
        
        // 使用已派生的加密密钥解密私钥
        const decryptedSecretKey = await this.decryptPrivateKeyWithKey(encryptedSecretKey, encryptionKey);
        if (!decryptedSecretKey) {
          console.error('[CryptoService] 无法解密私钥，密钥可能不匹配');
          return null;
        }
        
        console.log('[CryptoService] 私钥解密成功，正在获取公钥...');
        
        // 从服务器获取用户的公钥
        const publicKey = await this.getUserPublicKeyFromServer();
        if (!publicKey) {
          console.error('[CryptoService] 无法获取用户的公钥');
          return null;
        }
        
        // 创建密钥对
        const keyPair = {
          publicKey: publicKey,
          secretKey: decryptedSecretKey
        };
        
        // 保存到localStorage
        localStorage.setItem('userKeyPair', JSON.stringify(keyPair));
        console.log('[CryptoService] 密钥对已成功初始化并保存');
        
        return keyPair;
      } catch (error) {
        console.error('[CryptoService] 从服务器获取或解密私钥失败:', error);
        throw error;
      }
    } catch (error) {
      console.error('[CryptoService] initializeKeyPairWithEncryptionKey失败:', error);
      throw error;
    }
  }
} 