import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import bcrypt from 'bcryptjs';
import { savePrivateKey, getPrivateKey, getUserPublicKey } from '../api/keys';
import { getUserEncryptionSalt, setUserEncryptionSalt } from '../api/salt';

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

// 加密私钥Blob结构
export interface EncryptedPrivateKeyBlob {
  version: number;
  salt: string;  // 加密时使用的盐值
  ciphertext: string;  // 加密的私钥
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
    
    try {
      console.log('[CryptoService] 从服务器获取加密盐值');
      const serverSalt = await getUserEncryptionSalt(username);
      console.log('[CryptoService] 成功从服务器获取加密盐值，盐值前10位:', serverSalt.substring(0, 10) + '...');
      
      // 保存服务器返回的盐值
      this.encryptionSalt = serverSalt;
      localStorage.setItem('encryption_salt_' + username, serverSalt);
      return serverSalt;
    } catch (error: any) {
      console.error('[CryptoService] 获取用户加密盐值失败:', error);
      
      // 服务器没有盐值，需要创建并上传
      if (error?.response?.status === 404) {
        console.log('[CryptoService] 服务器返回404，尝试创建新盐值');
        return await this.createAndSetServerSalt(username);
      }
      
      // 如果完全无法获取盐值，使用基于用户名的备用盐值
      const fallbackSalt = 'user_' + username + '_salt';
      console.warn('[CryptoService] 使用基于用户名的备用加密盐值:', fallbackSalt);
      this.encryptionSalt = fallbackSalt;
      localStorage.setItem('encryption_salt_' + username, fallbackSalt);
      
      return fallbackSalt;
    }
  }
  
  /**
   * 创建并设置服务器盐值
   * @param username 用户名
   * @returns 创建的盐值
   */
  private static async createAndSetServerSalt(username: string): Promise<string> {
    console.log('[CryptoService] 服务器没有盐值，创建新盐值');
    
    try {
      // 生成一个随机盐值
      const randomSalt = naclUtil.encodeBase64(nacl.randomBytes(16));
      console.log('[CryptoService] 生成的随机盐值前10位:', randomSalt.substring(0, 10) + '...');
      
      // 尝试设置服务器盐值
      await setUserEncryptionSalt(username, randomSalt);
      console.log('[CryptoService] 成功将新盐值保存到服务器');
      
      // 保存为已知盐值
      this.encryptionSalt = randomSalt;
      localStorage.setItem('encryption_salt_' + username, randomSalt);
      return randomSalt;
    } catch (error) {
      console.error('[CryptoService] 保存新盐值到服务器失败:', error);
      
      // 失败时使用基于用户名的盐值，以保持一致性
      const fallbackSalt = 'user_' + username + '_salt';
      console.warn('[CryptoService] 使用基于用户名的备用盐值:', fallbackSalt);
      this.encryptionSalt = fallbackSalt;
      localStorage.setItem('encryption_salt_' + username, fallbackSalt);
      return fallbackSalt;
    }
  }
  
  // 由于我们不再使用auth_salt，这个方法可以保留但被弃用
  private static async getAuthSalt(): Promise<string> {
    console.warn('[CryptoService] getAuthSalt方法已被弃用');
    return 'fallback_auth_salt';
  }
  
  /**
   * 使用特定盐值生成加密密钥
   * @param password 用户密码
   * @param salt 特定盐值
   * @returns 派生的加密密钥
   */
  static async generateEncryptionKeyWithSalt(password: string, salt: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // 使用指定的盐值
    const saltedPassword = new Uint8Array([
      ...passwordData, 
      ...encoder.encode(salt)
    ]);
    
    // 记录盐值和密码哈希信息，便于跨浏览器调试
    console.info('[CryptoService-DEBUG] 使用特定盐值生成加密密钥:', {
      盐值: salt,
      盐值哈希: this.hashString(salt),
      密码长度: password.length,
      密码哈希: this.hashString(password),
      盐值后密码字节长度: saltedPassword.length
    });
    
    // 使用SHA-512哈希并取前32字节作为密钥
    const hashKey = nacl.hash(saltedPassword);
    const encryptionKey = hashKey.slice(0, 32);
    
    // 记录生成的加密密钥信息
    const encryptionKeyBase64 = naclUtil.encodeBase64(encryptionKey);
    console.info('[CryptoService-DEBUG] 特定盐值生成的加密密钥:', {
      encryptionKey前12位: encryptionKeyBase64.substring(0, 12) + '...',
      encryptionKey哈希: this.hashString(encryptionKeyBase64)
    });
    
    return encryptionKey;
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
      
      // 始终输出关键诊断信息，无论是否为生产环境
      console.info('[CryptoService] 消息加密 - 元数据:', 
        '原始消息长度:', message.length,
        'byte长度:', messageUint8.length,
        '加密后长度:', encryptedMessage.length,
        '完整消息长度:', fullMessage.length,
        '浏览器:', navigator.userAgent);
      
      // 转换为Base64字符串
      const base64Result = naclUtil.encodeBase64(fullMessage);
      
      // 验证Base64编码结果的合法性
      try {
        const testDecode = naclUtil.decodeBase64(base64Result);
        console.info('[CryptoService] Base64验证成功 - 长度匹配:', testDecode.length === fullMessage.length);
      } catch (error) {
        console.error('[CryptoService] 警告: 生成的Base64消息无法正确解码:', error);
      }
      
      return base64Result;
    } catch (error) {
      console.error('[CryptoService] 加密消息时发生异常:', error);
      console.error('[CryptoService] 浏览器环境:', navigator.userAgent);
      throw error;
    }
  }

  // 解密消息
  static decryptMessage(encryptedMessageBase64: string, senderPublicKey: Uint8Array, recipientSecretKey: Uint8Array): string | null {
    try {
      // 记录详细的浏览器信息
      const browserInfo = {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isEdge: /Edg/.test(navigator.userAgent),
        isOpera: /OPR/.test(navigator.userAgent) || /Opera/.test(navigator.userAgent)
      };
      
      console.info('[CryptoService-DEBUG] 解密消息时的浏览器环境:', browserInfo);
      
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
      
      // 检测浏览器类型
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      
      // 记录密钥哈希值，便于跨浏览器对比
      const senderPublicKeyBase64 = naclUtil.encodeBase64(senderPublicKey);
      const recipientSecretKeyBase64 = naclUtil.encodeBase64(recipientSecretKey);
      
      console.info('[CryptoService-DEBUG] 解密消息使用的密钥详情:', {
        senderPublicKey前12位: senderPublicKeyBase64.substring(0, 12) + '...',
        senderPublicKey长度: senderPublicKeyBase64.length,
        senderPublicKey完整哈希: this.hashString(senderPublicKeyBase64),
        recipientSecretKey前12位: recipientSecretKeyBase64.substring(0, 12) + '...',
        recipientSecretKey长度: recipientSecretKeyBase64.length,
        recipientSecretKey完整哈希: this.hashString(recipientSecretKeyBase64),
        encryptedMessage前16位: encryptedMessageBase64.substring(0, 16) + '...',
        encryptedMessage长度: encryptedMessageBase64.length,
        encryptedMessage完整哈希: this.hashString(encryptedMessageBase64)
      });
      
      // 将Base64字符串转换回二进制
      let encryptedMessageWithNonce;
      try {
        // 标准解码方式
        encryptedMessageWithNonce = naclUtil.decodeBase64(encryptedMessageBase64);
        console.info('[CryptoService] Base64解码成功 - 长度:', encryptedMessageWithNonce.length);
      } catch (error) {
        console.error('[CryptoService] 错误: 标准方式无法解码Base64消息:', error);
        console.error('[CryptoService] 错误的Base64消息:', encryptedMessageBase64.substring(0, 20) + '...');
        console.error('[CryptoService] 用户代理:', navigator.userAgent);
        
        // 如果标准解码失败，尝试浏览器特定的解码处理
        try {
          console.info('[CryptoService] 尝试替代Base64解码方式...');
          
          // 尝试手动处理一些常见的Base64编码差异
          let correctedBase64 = encryptedMessageBase64;
          
          // 某些浏览器可能有Base64编码差异，尝试修复
          // Safari可能会有不同的Base64填充处理
          if (isSafari) {
            // 确保填充正确
            while (correctedBase64.length % 4 !== 0) {
              correctedBase64 += '=';
            }
          }
          
          // 尝试解码修正后的Base64
          try {
            const buffer = Buffer.from(correctedBase64, 'base64');
            encryptedMessageWithNonce = new Uint8Array(buffer);
            console.info('[CryptoService] 替代Base64解码成功 - 长度:', encryptedMessageWithNonce.length);
          } catch (bufferError) {
            // 如果Buffer.from不可用或失败，尝试使用原生方法
            try {
              const binaryString = atob(correctedBase64);
              encryptedMessageWithNonce = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                encryptedMessageWithNonce[i] = binaryString.charCodeAt(i);
              }
              console.info('[CryptoService] 原生atob解码成功 - 长度:', encryptedMessageWithNonce.length);
            } catch (atobError) {
              console.error('[CryptoService] 所有Base64解码方法均失败:', atobError);
              throw error; // 仍然抛出原始错误
            }
          }
        } catch (alternativeError) {
          console.error('[CryptoService] 替代解码方法也失败:', alternativeError);
          return null;
        }
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
      
      // 始终输出关键调试信息，无论是否为生产环境
      console.info('[CryptoService] 解密消息 - 元数据:', 
        '发送者公钥前8位:', naclUtil.encodeBase64(senderPublicKey).substring(0, 8) + '...',
        '接收者私钥前8位:', naclUtil.encodeBase64(recipientSecretKey).substring(0, 8) + '...',
        'nonce长度:', nonce.length,
        '加密消息长度:', encryptedMessage.length,
        '浏览器:', navigator.userAgent,
        '浏览器类型:', isSafari ? 'Safari' : (isFirefox ? 'Firefox' : (isChrome ? 'Chrome' : '其他')));
      
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
          '消息Base64前20位:', encryptedMessageBase64.substring(0, 20) + '...',
          '发送者公钥(完整):', naclUtil.encodeBase64(senderPublicKey),
          '接收者私钥前8位:', naclUtil.encodeBase64(recipientSecretKey).substring(0, 8) + '...',
          '浏览器信息:', navigator.userAgent,
          '浏览器供应商:', navigator.vendor,
          '平台:', navigator.platform);
        return null;
      }
      
      // 将二进制转换回文本
      try {
        const result = naclUtil.encodeUTF8(decryptedMessage);
        console.info('[CryptoService] 消息解密成功 - 长度:', result.length);
        return result;
      } catch (error) {
        console.error('[CryptoService] 错误: 解密成功但UTF8解码失败:', error);
        console.error('[CryptoService] 解码失败的消息长度:', decryptedMessage.length);
        return null;
      }
    } catch (error) {
      console.error('[CryptoService] 解密消息时发生严重异常:', error);
      console.error('[CryptoService] 浏览器环境:', navigator.userAgent);
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
    
    // 记录盐值和密码哈希信息，便于跨浏览器调试
    const saltInfo = {
      盐值: salt,
      盐值哈希: this.hashString(salt),
      密码长度: password.length,
      密码哈希: this.hashString(password),
      盐值后密码字节长度: saltedPassword.length
    };
    
    console.info('[CryptoService-DEBUG] 生成加密密钥使用的参数:', saltInfo);
    this.setDebugInfo(`genEncKey_salt_${Date.now()}`, saltInfo);
    
    // 使用SHA-512哈希并取前32字节作为密钥
    const hashKey = nacl.hash(saltedPassword);
    const encryptionKey = hashKey.slice(0, 32); // 用于加密私钥的密钥
    
    // 记录生成的加密密钥信息
    const encryptionKeyBase64 = naclUtil.encodeBase64(encryptionKey);
    const keyInfo = {
      encryptionKey前12位: encryptionKeyBase64.substring(0, 12) + '...',
      encryptionKey长度: encryptionKeyBase64.length,
      encryptionKey完整哈希: this.hashString(encryptionKeyBase64)
    };
    
    console.info('[CryptoService-DEBUG] 生成的加密密钥信息:', keyInfo);
    this.setDebugInfo(`genEncKey_result_${Date.now()}`, keyInfo);
    
    return encryptionKey;
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
  static async encryptPrivateKeyWithKey(secretKey: string, encryptionKey: Uint8Array, salt: string): Promise<string> {
    try {
      // 创建一次性随机数
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      
      // 将私钥转换为二进制
      const secretKeyUint8 = naclUtil.decodeBase64(secretKey);
      
      // 记录私钥加密的详细过程
      console.info('[CryptoService-DEBUG] 加密私钥的过程详情:', {
        原始私钥前12位: secretKey.substring(0, 12) + '...',
        原始私钥长度: secretKey.length,
        原始私钥哈希: this.hashString(secretKey),
        使用盐值: salt,
        盐值哈希: this.hashString(salt),
        nonce长度: nonce.length,
        nonce哈希: this.hashString(naclUtil.encodeBase64(nonce)),
        加密密钥前12位: naclUtil.encodeBase64(encryptionKey).substring(0, 12) + '...',
        加密密钥长度: encryptionKey.length,
        加密密钥哈希: this.hashString(naclUtil.encodeBase64(encryptionKey))
      });
      
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
      
      // 转换为Base64字符串
      const ciphertext = naclUtil.encodeBase64(fullEncrypted);
      
      // 创建带盐值的Blob结构
      const blob: EncryptedPrivateKeyBlob = {
        version: 1,
        salt: salt,
        ciphertext: ciphertext
      };
      
      // 序列化为JSON字符串
      const jsonBlob = JSON.stringify(blob);
      
      // 输出调试信息（无论是开发环境还是生产环境）
      console.info('[CryptoService] 加密私钥 - 元数据:',
        '原始私钥长度:', secretKey.length,
        '使用盐值:', salt.substring(0, 10) + '...',
        '加密密钥长度:', encryptionKey.length,
        '加密后长度:', fullEncrypted.length,
        '浏览器:', navigator.userAgent);
      
      // 记录加密后结果的详细信息
      console.info('[CryptoService-DEBUG] 加密后的私钥详情:', {
        Blob版本: blob.version,
        使用盐值哈希: this.hashString(salt),
        加密后私钥前12位: ciphertext.substring(0, 12) + '...',
        加密后私钥长度: ciphertext.length,
        加密后私钥哈希: this.hashString(ciphertext),
        JSON结果长度: jsonBlob.length
      });
      
      // 开发环境下的详细日志
      if (process.env.NODE_ENV === 'development') {
        console.log('加密私钥 - 原始私钥:', secretKey);
        console.log('加密私钥 - 加密密钥(前32位哈希):', naclUtil.encodeBase64(encryptionKey));
        console.log('加密私钥 - 加密后:', ciphertext);
        console.log('加密私钥 - 完整Blob:', jsonBlob);
      }
      
      // 返回JSON Blob
      return jsonBlob;
    } catch (error) {
      console.error('[CryptoService] 错误: 加密私钥失败!', error);
      throw error;
    }
  }

  // 解密私钥 - 使用哈希值a而非原始密码
  static async decryptPrivateKey(encryptedData: string, password: string): Promise<string | null> {
    try {
      // 尝试解析为JSON Blob
      let blob: EncryptedPrivateKeyBlob | null = null;
      let encryptedSecretKeyBase64: string = '';
      let useSalt: string = '';
      
      try {
        blob = JSON.parse(encryptedData) as EncryptedPrivateKeyBlob;
        
        // 验证blob结构
        if (!blob || typeof blob !== 'object' || !blob.version || !blob.salt || !blob.ciphertext) {
          console.log('[CryptoService] 加密数据不是有效的Blob格式，尝试作为旧格式处理');
          blob = null;
        } else {
          console.log('[CryptoService] 解析到Blob格式数据，版本:', blob.version);
          encryptedSecretKeyBase64 = blob.ciphertext;
          useSalt = blob.salt;
        }
      } catch (e) {
        console.log('[CryptoService] 未能解析为JSON，尝试作为旧格式处理');
        blob = null;
      }
      
      if (!blob) {
        // 旧格式：直接使用Base64数据
        encryptedSecretKeyBase64 = encryptedData;
        useSalt = await this.getEncryptionSalt(); // 使用当前盐值
        console.log('[CryptoService] 使用旧格式处理，当前盐值前10位:', useSalt.substring(0, 10) + '...');
      }
      
      // 使用适当的盐值生成加密密钥
      const encryptionKey = await this.generateEncryptionKeyWithSalt(password, useSalt);
      
      // 记录解密私钥的详细过程
      console.info('[CryptoService-DEBUG] 解密私钥的过程详情:', {
        数据格式: blob ? 'Blob(v' + blob.version + ')' : '旧格式',
        使用的盐值前12位: useSalt.substring(0, 12) + '...',
        盐值哈希: this.hashString(useSalt),
        加密后私钥前12位: encryptedSecretKeyBase64.substring(0, 12) + '...',
        加密后私钥长度: encryptedSecretKeyBase64.length,
        加密后私钥哈希: this.hashString(encryptedSecretKeyBase64),
        密码长度: password.length,
        密码哈希: this.hashString(password),
        加密密钥前12位: naclUtil.encodeBase64(encryptionKey).substring(0, 12) + '...',
        加密密钥长度: encryptionKey.length,
        加密密钥哈希: this.hashString(naclUtil.encodeBase64(encryptionKey))
      });
      
      // 将Base64字符串转换回二进制
      const encryptedWithNonce = naclUtil.decodeBase64(encryptedSecretKeyBase64);
      
      // 提取nonce
      const nonce = encryptedWithNonce.slice(0, nacl.secretbox.nonceLength);
      
      // 记录提取的nonce信息
      console.info('[CryptoService-DEBUG] 解密私钥使用的nonce:', {
        nonce长度: nonce.length,
        nonce哈希: this.hashString(naclUtil.encodeBase64(nonce))
      });
      
      // 提取加密私钥
      const encryptedSecretKey = encryptedWithNonce.slice(nacl.secretbox.nonceLength);
      
      // 输出调试信息（无论是开发环境还是生产环境）
      console.info('[CryptoService] 解密私钥 - 元数据:', 
        '加密的私钥长度:', encryptedSecretKeyBase64.length,
        '使用盐值:', useSalt.substring(0, 10) + '...',
        'nonce长度:', nonce.length,
        '加密私钥长度:', encryptedSecretKey.length,
        '加密密钥长度:', encryptionKey.length,
        '浏览器:', navigator.userAgent);
      
      // 使用加密密钥解密私钥
      const decryptedSecretKey = nacl.secretbox.open(
        encryptedSecretKey,
        nonce,
        encryptionKey
      );
      
      // 如果解密失败，尝试使用多种方法
      if (!decryptedSecretKey) {
        console.error('[CryptoService] 私钥解密失败 - 密钥不匹配');
        console.error('[CryptoService] 尝试解密的私钥前10位:', encryptedSecretKeyBase64.substring(0, 10) + '...');
        
        // 如果使用Blob格式失败，尝试旧方法
        if (blob) {
          console.log('[CryptoService] Blob格式解密失败，尝试使用多种方法解密');
          return await this.tryDecryptWithMultipleKeys(encryptedData, password);
        }
        
        return null;
      }
      
      // 将二进制转换回Base64字符串
      const decryptedSecretKeyBase64 = naclUtil.encodeBase64(decryptedSecretKey);
      
      // 输出调试信息（无论是开发环境还是生产环境）
      console.info('[CryptoService] 私钥解密成功 - 解密后长度:', decryptedSecretKey.length);
      
      // 记录解密后的私钥信息
      console.info('[CryptoService-DEBUG] 解密后的私钥详情:', {
        解密后私钥前12位: decryptedSecretKeyBase64.substring(0, 12) + '...',
        解密后私钥长度: decryptedSecretKeyBase64.length,
        解密后私钥哈希: this.hashString(decryptedSecretKeyBase64)
      });
      
      // 开发环境下的详细日志
      if (process.env.NODE_ENV === 'development') {
        console.log('解密私钥 - 加密的私钥:', encryptedSecretKeyBase64);
        console.log('解密私钥 - 解密密钥(前32位哈希):', naclUtil.encodeBase64(encryptionKey));
        console.log('解密私钥 - 解密后:', decryptedSecretKeyBase64);
      }
      
      // 将二进制转换回Base64字符串
      return decryptedSecretKeyBase64;
    } catch (error) {
      console.error('[CryptoService] 解密私钥失败:', error);
      console.error('[CryptoService] 浏览器环境:', navigator.userAgent);
      return null;
    }
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
    
    // 检查是否是blob格式
    let actualEncryptedKey: string = encryptedSecretKey;
    let storedSalt: string | null = null;
    
    try {
      const blob = JSON.parse(encryptedSecretKey) as EncryptedPrivateKeyBlob;
      if (blob && blob.version && blob.salt && blob.ciphertext) {
        console.log('[CryptoService] 检测到Blob格式，提取盐值和密文');
        actualEncryptedKey = blob.ciphertext;
        storedSalt = blob.salt;
      }
    } catch (e) {
      // 不是JSON格式，使用原始数据
      console.log('[CryptoService] 不是Blob格式，使用原始数据');
    }
    
    // 记录浏览器信息，便于排查不同浏览器的加解密差异
    const browserInfo = {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform,
      // 尝试检测特定浏览器
      isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
      isFirefox: /Firefox/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      isEdge: /Edg/.test(navigator.userAgent),
      isOpera: /OPR/.test(navigator.userAgent) || /Opera/.test(navigator.userAgent)
    };
    
    console.info('[CryptoService] 浏览器信息:', browserInfo);
    
    // 记录加密私钥信息
    console.info('[CryptoService-DEBUG] 尝试解密的加密私钥信息:', {
      格式: storedSalt ? 'Blob格式' : '旧格式',
      存储盐值: storedSalt ? storedSalt.substring(0, 10) + '...' : '无',
      encryptedSecretKey前12位: actualEncryptedKey.substring(0, 12) + '...',
      encryptedSecretKey长度: actualEncryptedKey.length,
      encryptedSecretKey完整哈希: this.hashString(actualEncryptedKey),
      密码长度: password.length,
      密码哈希: this.hashString(password),
      用户名: username
    });
    
    // 如果blob中有盐值，首先尝试使用存储的盐值
    if (storedSalt) {
      try {
        console.log('[CryptoService] 尝试使用Blob中的盐值派生密钥解密');
        const encryptionKey = await this.generateEncryptionKeyWithSalt(password, storedSalt);
        const decryptedKey = await this.decryptPrivateKeyWithKey(actualEncryptedKey, encryptionKey);
        
        if (decryptedKey) {
          console.log('[CryptoService] 成功: 使用Blob中的盐值派生密钥解密成功');
          return decryptedKey;
        }
      } catch (error) {
        console.warn('[CryptoService] 使用Blob盐值解密失败:', error);
      }
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
        const decryptedKey = await this.decryptPrivateKeyWithKey(actualEncryptedKey, encryptionKey);
        
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
      const decryptedKey = await this.decryptPrivateKeyWithKey(actualEncryptedKey, usernameSaltKey);
      
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
      const decryptedKey = await this.decryptPrivateKeyWithKey(actualEncryptedKey, fallbackKey);
      
      // 恢复原始盐值
      this.encryptionSalt = originalSalt;
      
      if (decryptedKey) {
        console.log('[CryptoService] 成功: 使用默认盐值派生密钥解密成功');
        return decryptedKey;
      }
    } catch (error) {
      console.warn('[CryptoService] 方法3解密失败:', error);
    }

    // 尝试方式4：浏览器特定处理 - Safari可能对某些算法和Base64处理有差异
    if (browserInfo.isSafari) {
      try {
        console.log('[CryptoService] 尝试方法4: Safari特定解密方法');
        // 对Safari使用特殊处理
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        // Safari可能需要不同的盐值处理
        const safariSalt = 'safari_' + username + '_salt';
        
        // 使用自定义的盐值处理
        const saltedPassword = new Uint8Array([
          ...passwordData, 
          ...encoder.encode(safariSalt)
        ]);
        
        // 生成Safari特定的密钥
        const hashKey = nacl.hash(saltedPassword);
        const safariKey = hashKey.slice(0, 32);
        
        const decryptedKey = await this.decryptPrivateKeyWithKey(actualEncryptedKey, safariKey);
        if (decryptedKey) {
          console.log('[CryptoService] 成功: 使用Safari特定方法解密成功');
          return decryptedKey;
        }
      } catch (error) {
        console.warn('[CryptoService] Safari特定方法解密失败:', error);
      }
    }
    
    // 尝试方式5：浏览器特定处理 - Chrome和Firefox的差异化处理
    if (browserInfo.isChrome || browserInfo.isFirefox) {
      try {
        console.log(`[CryptoService] 尝试方法5: ${browserInfo.isChrome ? 'Chrome' : 'Firefox'}特定解密方法`);
        // 使用不同浏览器特定的盐值
        const browserSpecificSalt = 
          (browserInfo.isChrome ? 'chrome_' : 'firefox_') + username + '_salt';
        
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        
        // 使用浏览器特定的盐值处理
        const saltedPassword = new Uint8Array([
          ...passwordData, 
          ...encoder.encode(browserSpecificSalt)
        ]);
        
        // 生成浏览器特定的密钥
        const hashKey = nacl.hash(saltedPassword);
        const browserSpecificKey = hashKey.slice(0, 32);
        
        const decryptedKey = await this.decryptPrivateKeyWithKey(actualEncryptedKey, browserSpecificKey);
        if (decryptedKey) {
          console.log(`[CryptoService] 成功: 使用${browserInfo.isChrome ? 'Chrome' : 'Firefox'}特定方法解密成功`);
          return decryptedKey;
        }
      } catch (error) {
        console.warn(`[CryptoService] ${browserInfo.isChrome ? 'Chrome' : 'Firefox'}特定方法解密失败:`, error);
      }
    }
    
    console.error('[CryptoService] 所有解密方法均失败', browserInfo);
    return null;
  }

  // 创建密钥对并保存到localStorage
  static async initializeKeyPair(password: string): Promise<StringKeyPair> {
    try {
      console.log('[CryptoService] 初始化密钥对开始');
      console.log('[CryptoService] 诊断: 检查现有密钥状态...');
      
      // 保存诊断信息到localStorage
      this.setDebugInfo('initStart', {
        时间戳: new Date().toISOString(),
        浏览器: this.getBrowserId(),
        密码哈希: this.hashString(password)
      });
      
      // 记录诊断信息函数
      const recordDiagnostics = (stage: string, info: any) => {
        const debugObj = {
          时间戳: new Date().toISOString(),
          阶段: stage,
          ...info
        };
        console.info(`[CryptoService-DEBUG] ${stage}:`, debugObj);
        this.setDebugInfo(`init_${stage}_${Date.now()}`, debugObj);
      };
      
      // 打印浏览器环境信息
      const browserInfo = {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isEdge: /Edg/.test(navigator.userAgent),
        isOpera: /OPR/.test(navigator.userAgent) || /Opera/.test(navigator.userAgent)
      };
      
      console.info('[CryptoService-DEBUG] 浏览器环境信息：', browserInfo);
      this.setDebugInfo('browserInfo', browserInfo);
      
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
            recordDiagnostics('密钥对验证失败', {
              publicKey存在: !!parsedKeyPair.publicKey,
              secretKey存在: !!parsedKeyPair.secretKey
            });
          } else {
            // 打印密钥信息（部分）
            const keyInfo = {
              publicKey前12位: parsedKeyPair.publicKey.substring(0, 12) + '...',
              publicKey长度: parsedKeyPair.publicKey.length,
              secretKey前12位: parsedKeyPair.secretKey.substring(0, 12) + '...',
              secretKey长度: parsedKeyPair.secretKey.length,
              publicKey完整哈希: this.hashString(parsedKeyPair.publicKey),
              secretKey完整哈希: this.hashString(parsedKeyPair.secretKey)
            };
            console.info('[CryptoService-DEBUG] 本地密钥对信息:', keyInfo);
            recordDiagnostics('已有密钥对', keyInfo);
          }
          return parsedKeyPair;
        } catch (error) {
          console.error('[CryptoService] 错误: 本地密钥对解析失败!', error);
          recordDiagnostics('密钥对解析失败', { 错误: String(error) });
          localStorage.removeItem('userKeyPair'); // 移除无效的密钥对
        }
      } else {
        console.warn('[CryptoService] 警告: 本地私钥丢失! 没有找到localStorage中的userKeyPair');
        recordDiagnostics('密钥对缺失', {});
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
          console.info('[CryptoService-DEBUG] 已存储的加密密钥信息:', {
            encryptionKey前12位: storedEncryptionKeyString.substring(0, 12) + '...',
            encryptionKey长度: storedEncryptionKeyString.length,
            encryptionKey完整哈希: this.hashString(storedEncryptionKeyString)
          });
        } catch (error) {
          console.error('[CryptoService] 错误: 派生密钥损坏! 无法解析encryptionKey', error);
          localStorage.removeItem('encryptionKey'); // 移除无效的加密密钥
          
          // 如果有密码，重新派生
          if (password) {
            console.log('[CryptoService] 尝试从密码重新派生加密密钥');
            encryptionKey = await this.generateEncryptionKey(password);
            const newEncKeyString = this.keyToString(encryptionKey);
            localStorage.setItem('encryptionKey', newEncKeyString);
            console.info('[CryptoService-DEBUG] 重新派生的加密密钥信息:', {
              新encryptionKey前12位: newEncKeyString.substring(0, 12) + '...',
              新encryptionKey长度: newEncKeyString.length,
              新encryptionKey完整哈希: this.hashString(newEncKeyString)
            });
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
        const newEncKeyString = this.keyToString(encryptionKey);
        localStorage.setItem('encryptionKey', newEncKeyString);
        console.info('[CryptoService-DEBUG] 新派生的加密密钥信息:', {
          新encryptionKey前12位: newEncKeyString.substring(0, 12) + '...',
          新encryptionKey长度: newEncKeyString.length,
          新encryptionKey完整哈希: this.hashString(newEncKeyString),
          密码长度: password.length,
          密码哈希: this.hashString(password),
          用户名: username
        });
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
          
          // 使用能识别Blob中盐值的方法解密私钥
          let decryptedSecretKey = await this.decryptPrivateKey(encryptedSecretKey, password);
          
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
        // 不再检查hasGeneratedKeysFlag，而是再次确认服务器状态
        try {
          // 获取用户名
          const username = localStorage.getItem('username');
          if (!username) {
            console.error('[CryptoService] 无法获取用户名，无法检查服务器密钥');
            throw new Error('无法获取用户名');
          }
          
          // 再次确认服务器上是否真的没有公钥 - 修正：添加username参数
          const serverPublicKey = await getUserPublicKey(username);
          
          if (serverPublicKey) {
            // 服务器有公钥，但我们无法解密私钥
            console.error('[CryptoService] 服务器上已有密钥，但无法解密。请使用原始浏览器访问，或提供正确的密码');
            throw new Error('服务器已有密钥，但无法恢复。请使用原始浏览器或正确密码');
          }
          
          // 确认服务器上确实没有加密私钥
          const serverEncryptedPrivateKey = await getPrivateKey();
          if (serverEncryptedPrivateKey) {
            console.error('[CryptoService] 服务器上已有加密私钥，但无法解密。请使用原始浏览器访问，或提供正确的密码');
            throw new Error('无法解密服务器已有的密钥。请使用原始浏览器或正确密码');
          }
          
          // 确认是新用户或全新账户，询问用户是否生成新密钥
          if (!confirm('将为您创建新的加密密钥。如果您之前使用过其他浏览器，这将导致无法查看之前的加密消息。确定继续吗？')) {
            throw new Error('用户取消创建新密钥');
          }
          
          console.log('[CryptoService] 确认服务器没有现有密钥，创建新密钥对');
          
          // 生成新的密钥对
          const keyPair = this.generateKeyPair();
          const stringKeyPair = this.keyPairToString(keyPair);
          
          // 获取盐值
          const salt = await this.getEncryptionSalt();
          
          // 加密私钥
          console.log('[CryptoService] 正在使用加密密钥加密私钥...');
          const encryptedPrivateKey = await this.encryptPrivateKeyWithKey(stringKeyPair.secretKey, encryptionKey, salt);
          
          // 保存加密的私钥到服务器
          try {
            console.log('[CryptoService] 正在保存加密的私钥到服务器...');
            await savePrivateKey(encryptedPrivateKey);
            console.log('[CryptoService] 加密私钥已成功保存到服务器');
          } catch (error) {
            console.error('[CryptoService] 保存加密私钥到服务器失败:', error);
            // 不要因为保存失败而终止整个流程，但要记录错误
          }
          
          // 保存到localStorage
          localStorage.setItem('userKeyPair', JSON.stringify(stringKeyPair));
          console.log('[CryptoService] 密钥对已保存到localStorage');
          
          return stringKeyPair;
        } catch (error) {
          console.error('[CryptoService] 创建新密钥前检查失败:', error);
          throw error;
        }
      } else {
        console.log('[CryptoService] 不需要创建新密钥对，已成功恢复现有密钥');
      }
      
      // 这种情况不应该发生，但为了类型安全
      throw new Error('无法初始化密钥对，流程异常');
    } catch (error) {
      console.error('[CryptoService] 初始化密钥对失败:', error);
      throw error;
    }
  }

  // 使用加密密钥加密私钥(不依赖原始密码)
  static async decryptPrivateKeyWithKey(encryptedData: string, encryptionKey: Uint8Array): Promise<string | null> {
    try {
      // 检查是否是blob格式
      let encryptedSecretKeyBase64: string = encryptedData;
      let blobSalt: string | null = null;
      
      try {
        const blob = JSON.parse(encryptedData) as EncryptedPrivateKeyBlob;
        if (blob && blob.version && blob.ciphertext) {
          console.log('[CryptoService] decryptPrivateKeyWithKey - 检测到Blob格式，提取密文');
          encryptedSecretKeyBase64 = blob.ciphertext;
          
          // 获取Blob中的盐值
          if (blob.salt) {
            blobSalt = blob.salt;
            console.log('[CryptoService] decryptPrivateKeyWithKey - 检测到Blob中包含盐值:', blobSalt.substring(0, 10) + '...');
          }
        }
      } catch (e) {
        // 不是JSON格式，使用原始数据
        console.log('[CryptoService] decryptPrivateKeyWithKey - 使用旧格式数据');
      }
      
      // 将Base64字符串转换回二进制
      const encryptedWithNonce = naclUtil.decodeBase64(encryptedSecretKeyBase64);
      
      // 提取nonce
      const nonce = encryptedWithNonce.slice(0, nacl.secretbox.nonceLength);
      
      // 提取加密私钥
      const encryptedSecretKey = encryptedWithNonce.slice(nacl.secretbox.nonceLength);
      
      // 记录详细的调试信息
      console.info('[CryptoService-DEBUG] decryptPrivateKeyWithKey过程:', {
        数据格式: encryptedSecretKeyBase64 === encryptedData ? '旧格式' : 'Blob格式',
        加密私钥前12位: encryptedSecretKeyBase64.substring(0, 12) + '...',
        加密私钥长度: encryptedSecretKeyBase64.length,
        加密私钥哈希: this.hashString(encryptedSecretKeyBase64),
        加密密钥前12位: naclUtil.encodeBase64(encryptionKey).substring(0, 12) + '...',
        加密密钥长度: encryptionKey.length,
        加密密钥哈希: this.hashString(naclUtil.encodeBase64(encryptionKey)),
        nonce长度: nonce.length,
        nonce哈希: this.hashString(naclUtil.encodeBase64(nonce)),
        encryptedSecretKey长度: encryptedSecretKey.length,
        使用Blob盐值: blobSalt ? blobSalt.substring(0, 10) + '...' : '无'
      });
      
      // 使用加密密钥解密私钥
      let decryptedSecretKey = nacl.secretbox.open(
        encryptedSecretKey,
        nonce,
        encryptionKey
      );
      
      // 如果解密失败且有Blob盐值，尝试使用Blob的盐值重新派生密钥
      if (!decryptedSecretKey && blobSalt) {
        // 从localStorage获取用户名和密码
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('temp_password');
        
        if (username && password) {
          console.log('[CryptoService] 初次解密失败，尝试使用Blob中的盐值重新派生密钥');
          
          try {
            // 使用Blob中的盐值重新派生密钥
            const newEncryptionKey = await this.generateEncryptionKeyWithSalt(password, blobSalt);
            
            // 使用新派生的密钥尝试解密
            decryptedSecretKey = nacl.secretbox.open(
              encryptedSecretKey,
              nonce,
              newEncryptionKey
            );
            
            if (decryptedSecretKey) {
              console.log('[CryptoService] 使用Blob盐值派生的密钥成功解密私钥');
              
              // 成功解密后，尝试使用服务器盐值重新加密
              try {
                const serverSalt = await this.getEncryptionSalt();
                const serverEncryptionKey = await this.generateEncryptionKeyWithSalt(password, serverSalt);
                const decryptedSecretKeyBase64 = naclUtil.encodeBase64(decryptedSecretKey);
                
                console.log('[CryptoService] 尝试使用服务器盐值重新加密私钥');
                const newEncrypted = await this.encryptPrivateKeyWithKey(
                  decryptedSecretKeyBase64,
                  serverEncryptionKey,
                  serverSalt
                );
                
                // 保存到服务器
                try {
                  await savePrivateKey(newEncrypted);
                  console.log('[CryptoService] 成功使用服务器盐值重新加密并保存私钥');
                } catch (saveError) {
                  console.error('[CryptoService] 使用服务器盐值重新保存私钥失败:', saveError);
                }
              } catch (migrationError) {
                console.error('[CryptoService] 尝试使用服务器盐值重新加密失败:', migrationError);
              }
            }
          } catch (derivationError) {
            console.error('[CryptoService] 使用Blob盐值重新派生密钥失败:', derivationError);
          }
        }
      }
      
      // 如果解密失败，返回null
      if (!decryptedSecretKey) {
        console.error('[CryptoService] 错误: 私钥解密失败! 无法使用提供的加密密钥解密');
        console.error('[CryptoService-DEBUG] 解密失败详情:', {
          加密私钥前12位: encryptedSecretKeyBase64.substring(0, 12) + '...',
          加密私钥哈希: this.hashString(encryptedSecretKeyBase64),
          加密密钥哈希: this.hashString(naclUtil.encodeBase64(encryptionKey)),
          使用Blob盐值: blobSalt ? blobSalt.substring(0, 10) + '...' : '无'
        });
        return null;
      }
      
      // 将二进制转换回Base64字符串
      const decryptedSecretKeyBase64 = naclUtil.encodeBase64(decryptedSecretKey);
      
      // 输出调试信息
      console.log('[CryptoService] 解密私钥 - 元数据:', 
        '加密的私钥长度:', encryptedSecretKeyBase64.length,
        '解密后长度:', decryptedSecretKey.length);
      
      // 记录解密后的详细信息
      console.info('[CryptoService-DEBUG] decryptPrivateKeyWithKey结果:', {
        解密后私钥前12位: decryptedSecretKeyBase64.substring(0, 12) + '...',
        解密后私钥长度: decryptedSecretKeyBase64.length,
        解密后私钥哈希: this.hashString(decryptedSecretKeyBase64)
      });
      
      // 将二进制转换回Base64字符串
      return decryptedSecretKeyBase64;
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

  // 计算字符串的哈希值，用于安全比较不同值
  public static hashString(str: string): string {
    try {
      // 使用SHA-256哈希函数
      const hashArray = nacl.hash(naclUtil.decodeUTF8(str)).slice(0, 8);
      // 转换为十六进制字符串
      return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[CryptoService] 计算哈希值失败:', error);
      return 'hash-error';
    }
  }

  // 用于调试 - 安全打印对象的部分信息
  private static debugObject(obj: any, prefix: string = '', maxDepth: number = 1): any {
    if (maxDepth <= 0) return '[嵌套对象]';
    
    if (obj === null) return null;
    if (obj === undefined) return undefined;
    
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return '[Array(' + obj.length + ')]';
    }
    
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          if (value.length > 20) {
            result[key] = value.substring(0, 20) + '...';
          } else {
            result[key] = value;
          }
        } else if (typeof value === 'object') {
          result[key] = this.debugObject(value, prefix + '  ', maxDepth - 1);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  private static setDebugInfo(key: string, value: any): void {
    // 确保只在启用调试时保存
    const debugEnabled = localStorage.getItem('enableCryptoDebug') === 'true';
    if (!debugEnabled && process.env.NODE_ENV !== 'development') {
      return;
    }
    
    try {
      // 对于对象或数组，先转为JSON
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem('crypto_debug_' + key, valueToStore);
    } catch (error) {
      console.error('[CryptoService] 保存调试信息失败:', error);
    }
  }
  
  // 获取文本形式的浏览器标识，用于调试文件名
  private static getBrowserId(): string {
    if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
      return 'chrome';
    } else if (/Firefox/.test(navigator.userAgent)) {
      return 'firefox';
    } else if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
      return 'safari';
    } else if (/Edg/.test(navigator.userAgent)) {
      return 'edge';
    } else {
      return 'other';
    }
  }
  
  // 用于导出密钥信息到浏览器控制台，以便复制保存
  static exportDebugInfo(): any {
    try {
      const username = localStorage.getItem('username') || 'unknown';
      const browser = this.getBrowserId();
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      
      // 获取所有相关密钥信息
      const keyPair = this.getUserKeyPair();
      const encryptionKeyString = localStorage.getItem('encryptionKey');
      
      // 创建包含重要信息的对象
      const debugInfo = {
        timestamp,
        browser,
        username,
        userAgent: navigator.userAgent,
        publicKey: keyPair ? keyPair.publicKey : null,
        publicKeyHash: keyPair ? this.hashString(keyPair.publicKey) : null,
        secretKeyHash: keyPair ? this.hashString(keyPair.secretKey) : null,
        encryptionKeyHash: encryptionKeyString ? this.hashString(encryptionKeyString) : null
      };
      
      // 导出到控制台
      console.info('[CryptoService] 导出调试信息 - 请复制以下JSON对象:');
      console.info(JSON.stringify(debugInfo, null, 2));
      
      // 也保存到localStorage以便其他代码访问
      this.setDebugInfo('exportedInfo_' + timestamp, debugInfo);
      
      return debugInfo;
    } catch (error) {
      console.error('[CryptoService] 导出调试信息失败:', error);
      return null;
    }
  }
  
  // 新增：导出加密的私钥
  static async exportEncryptedPrivateKey(): Promise<any> {
    try {
      const username = localStorage.getItem('username') || 'unknown';
      console.info('[CryptoService] 正在获取用户 ' + username + ' 的加密私钥...');
      
      // 从服务器获取加密的私钥
      const encryptedPrivateKey = await getPrivateKey();
      
      if (!encryptedPrivateKey) {
        console.error('[CryptoService] 无法获取加密私钥，服务器可能没有存储');
        return null;
      }
      
      // 获取当前的公钥
      const keyPair = this.getUserKeyPair();
      const publicKey = keyPair ? keyPair.publicKey : null;
      
      // 显示在控制台
      console.info('=====================================================');
      console.info('用户加密私钥导出 - ' + new Date().toLocaleString());
      console.info('=====================================================');
      console.info('用户名: ' + username);
      console.info('浏览器: ' + this.getBrowserId());
      console.info('=====================================================');
      console.info('加密私钥:');
      console.info(encryptedPrivateKey);
      console.info('=====================================================');
      console.info('对应公钥:');
      console.info(publicKey);
      console.info('=====================================================');
      console.info('请保存这些信息，用于跨浏览器恢复账户');
      console.info('=====================================================');
      
      // 创建可导出的对象
      const exportData = {
        username,
        timestamp: new Date().toISOString(),
        browser: this.getBrowserId(),
        encryptedPrivateKey,
        publicKey,
        userAgent: navigator.userAgent
      };
      
      // 保存到localStorage
      localStorage.setItem('exported_keys_' + Date.now(), JSON.stringify(exportData));
      
      return exportData;
    } catch (error) {
      console.error('[CryptoService] 导出加密私钥失败:', error);
      return null;
    }
  }
  
  // 启用详细调试
  static enableDebugging(): void {
    localStorage.setItem('enableCryptoDebug', 'true');
    console.info('[CryptoService] 已启用详细调试记录');
    
    // 导出当前密钥信息
    this.exportDebugInfo();
    
    // 提示用户如何获取加密私钥
    console.info('[CryptoService] 要导出加密私钥，请在控制台执行: CryptoService.exportEncryptedPrivateKey()');
  }
  
  // 禁用详细调试
  static disableDebugging(): void {
    localStorage.setItem('enableCryptoDebug', 'false');
    console.info('[CryptoService] 已禁用详细调试记录');
  }

  // 使用加密密钥加密私钥 - 使用哈希值a而非原始密码
  static async encryptPrivateKey(secretKey: string, password: string): Promise<string> {
    // 获取当前盐值
    const salt = await this.getEncryptionSalt();
    
    // 生成加密密钥
    const encryptionKey = await this.generateEncryptionKeyWithSalt(password, salt);
    
    // 使用加密密钥加密私钥
    return await this.encryptPrivateKeyWithKey(secretKey, encryptionKey, salt);
  }
} 