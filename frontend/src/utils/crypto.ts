import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
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
  
  /**
   * 生成一个随机盐值用于密码哈希和密钥派生
   * @returns 生成的随机盐值(32字符的十六进制字符串)
   */
  public static generateSalt(): string {
    // 使用加密安全的随机数生成器
    const randomBytes = nacl.randomBytes(16); // 生成16字节，表示为32个十六进制字符
    // 转换为Base64字符串再转换为Hex字符串
    const base64Salt = naclUtil.encodeBase64(randomBytes);
    // 将Base64字符串转换为十六进制字符串
    const hexSalt = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('[CryptoService] 生成新的随机盐值:', hexSalt.substring(0, 8) + '...');
    return hexSalt;
  }
  
  /**
   * 从服务器获取用户盐值（用于登录流程，不创建新盐）
   * @param username 用户名
   * @returns 盐值，如果不存在则返回null
   */
  public static async fetchH1Salt(username: string): Promise<string | null> {
    try {
      console.log('[CryptoService] 登录流程 - 从服务器获取用户盐值');
      const salt = await getUserEncryptionSalt(username);
      console.log('[CryptoService] 登录流程 - 成功获取盐值');
      return salt;
    } catch (error) {
      console.error('[CryptoService] 登录流程 - 获取盐值失败:', error);
      return null;
    }
  }
  
  /**
   * 将密码和盐值序列化为二进制数据
   * @param password 用户密码
   * @param salt 盐值
   * @returns 序列化后的二进制数据
   */
  public static serializePassword(password: string, salt: string): Uint8Array {
    const encoder = new TextEncoder();
    return new Uint8Array([
      ...encoder.encode(password),
      ...encoder.encode(salt)
    ]);
  }
  
  /**
   * SHA-256哈希函数
   * @param data 要哈希的数据
   * @returns 哈希结果
   */
  public static generateSHA256Hash(data: Uint8Array): Uint8Array {
    return nacl.hash(data);
  }

  /**
   * 使用密码和盐值生成哈希值1（第一层哈希 - SHA-256）
   * @param password 用户密码
   * @param salt 服务器提供的盐值
   * @returns 哈希值1 (Base64编码)
   */
  public static async generateHash1(password: string, salt: string): Promise<string> {
    try {
      console.log('[CryptoService] 生成哈希值1');
      
      // 序列化密码和盐值
      const saltedPassword = this.serializePassword(password, salt);
      
      // 使用SHA-256哈希
      const hashKey = this.generateSHA256Hash(saltedPassword);
      
      // 转换为Base64字符串
      const hash1 = naclUtil.encodeBase64(hashKey);
      
      console.log('[CryptoService] 哈希值1生成成功, 前20位:', hash1.substring(0, 20) + '...');
      
      return hash1;
    } catch (error) {
      console.error('[CryptoService] 生成哈希值1失败:', error);
      throw error;
    }
  }

  /**
   * 从密码派生用于加密私钥的密钥
   * @param password 用户密码
   * @param providedSalt 可选参数，直接提供盐值(用于注册流程)
   * @returns 派生的加密密钥
   */
  public static async generateEncryptionKey(password: string, providedSalt?: string): Promise<Uint8Array> {
    try {
      let salt: string;
      
      // 如果提供了盐值，直接使用
      if (providedSalt) {
        salt = providedSalt;
        console.log('[CryptoService] 使用提供的盐值生成加密密钥');
      } else {
        // 获取用户名
        const username = localStorage.getItem('username');
        if (!username) {
          throw new Error('未找到用户名，无法派生加密密钥');
        }
        
        // 尝试从服务器获取盐值
        salt = await this.fetchH1Salt(username) || '';
        if (!salt) {
          console.warn('[CryptoService] 警告: 无法获取用户盐值，使用基于用户名的盐值');
          salt = 'user_' + username + '_salt';
        }
      }
      
      // 序列化密码和盐值
      const saltedPassword = this.serializePassword(password, salt);
      
      // 使用SHA-512哈希并取前32字节作为密钥
      const hashKey = this.generateSHA256Hash(saltedPassword);
      const encryptionKey = hashKey.slice(0, 32); // 用于加密私钥的密钥
      
      return encryptionKey;
      } catch (error) {
      console.error('[CryptoService] 派生加密密钥失败:', error);
      throw error;
    }
  }
  
  /**
   * 使用密码加密用户私钥
   * @param secretKey 用户私钥(Base64编码)
   * @param password 用户密码
   * @param providedSalt 可选参数，直接提供盐值(用于注册流程)
   * @returns 加密后的私钥Blob(JSON字符串)
   */
  public static async encryptPrivateKey(secretKey: string, password: string, providedSalt?: string): Promise<string> {
    try {
      let salt: string;
      
      // 如果提供了盐值，直接使用
      if (providedSalt) {
        salt = providedSalt;
        console.log('[CryptoService] 使用提供的盐值加密私钥');
      } else {
        // 获取用户名
        const username = localStorage.getItem('username');
        if (!username) {
          throw new Error('未找到用户名，无法加密私钥');
        }
        
        // 尝试从服务器获取盐值
        salt = await this.fetchH1Salt(username) || '';
        if (!salt) {
          console.warn('[CryptoService] 警告: 无法获取用户盐值，使用基于用户名的盐值');
          salt = 'user_' + username + '_salt';
  }
      }
      
      // 生成加密密钥，直接传递盐值避免再次获取
      const encryptionKey = await this.generateEncryptionKey(password, salt);
      
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
      
      // 转换为Base64字符串
      const ciphertext = naclUtil.encodeBase64(fullEncrypted);
      
      // 创建带盐值的Blob结构
      const blob: EncryptedPrivateKeyBlob = {
        version: 1,
        salt: salt,
        ciphertext: ciphertext
      };
      
      // 序列化为JSON字符串
      return JSON.stringify(blob);
    } catch (error) {
      console.error('[CryptoService] 加密私钥失败:', error);
      throw error;
    }
  }

  /**
   * 使用密码解密用户私钥
   * @param encryptedData 加密的私钥Blob(JSON字符串)
   * @param password 用户密码
   * @returns 解密后的私钥(Base64编码)，失败返回null
   */
  public static async decryptPrivateKey(encryptedData: string, password: string): Promise<string | null> {
    try {
      // 解析JSON Blob
      let blob: EncryptedPrivateKeyBlob;
      try {
        blob = JSON.parse(encryptedData) as EncryptedPrivateKeyBlob;
        
        // 验证blob结构
        if (!blob || typeof blob !== 'object' || !blob.version || !blob.salt || !blob.ciphertext) {
          throw new Error('无效的加密数据格式');
        }
      } catch (e) {
        throw new Error('解析加密数据失败: ' + e);
      }
      
      // 使用blob中的盐值派生加密密钥
      const saltedPassword = this.serializePassword(password, blob.salt);
      const hashKey = this.generateSHA256Hash(saltedPassword);
      const encryptionKey = hashKey.slice(0, 32);
      
      // 将Base64密文转换回二进制
      const encryptedWithNonce = naclUtil.decodeBase64(blob.ciphertext);
      
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
        console.error('[CryptoService] 私钥解密失败 - 密钥不匹配');
        return null;
      }
      
      // 将二进制转换回Base64字符串
      return naclUtil.encodeBase64(decryptedSecretKey);
    } catch (error) {
      console.error('[CryptoService] 解密私钥失败:', error);
      return null;
    }
  }

  /**
   * 加密消息
   * @param message 明文消息
   * @param recipientPublicKey 接收者公钥
   * @param senderSecretKey 发送者私钥
   * @returns 加密后的消息(Base64编码)
   */
  public static encryptMessage(message: string, recipientPublicKey: Uint8Array, senderSecretKey: Uint8Array): string {
    try {
      if (!message) {
        throw new Error('无法加密空消息');
      }

      if (!recipientPublicKey || recipientPublicKey.length !== nacl.box.publicKeyLength) {
        throw new Error('接收者公钥无效');
      }

      if (!senderSecretKey || senderSecretKey.length !== nacl.box.secretKeyLength) {
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
        throw new Error('消息加密失败');
    }
    
      // 将nonce和加密后的消息合并
      const fullMessage = new Uint8Array(nonce.length + encryptedMessage.length);
      fullMessage.set(nonce);
      fullMessage.set(encryptedMessage, nonce.length);
      
      // 转换为Base64字符串
      return naclUtil.encodeBase64(fullMessage);
    } catch (error) {
      console.error('[CryptoService] 加密消息失败:', error);
      throw error;
    }
  }

  /**
   * 解密消息
   * @param encryptedMessageBase64 加密的消息(Base64编码)
   * @param senderPublicKey 发送者公钥
   * @param recipientSecretKey 接收者私钥
   * @returns 解密后的明文消息，失败返回null
   */
  public static decryptMessage(encryptedMessageBase64: string, senderPublicKey: Uint8Array, recipientSecretKey: Uint8Array): string | null {
    try {
      if (!encryptedMessageBase64) {
        console.error('[CryptoService] 错误: 无法解密空消息!');
        return null;
        }

      if (!senderPublicKey || senderPublicKey.length !== nacl.box.publicKeyLength) {
        console.error('[CryptoService] 错误: 发送者公钥无效!');
        return null;
      }

      if (!recipientSecretKey || recipientSecretKey.length !== nacl.box.secretKeyLength) {
        console.error('[CryptoService] 错误: 接收者私钥无效!');
    return null;
  }

      // 将Base64字符串转换回二进制
      const encryptedMessageWithNonce = naclUtil.decodeBase64(encryptedMessageBase64);
      
      // 检查消息长度
      if (encryptedMessageWithNonce.length <= nacl.box.nonceLength) {
        console.error('[CryptoService] 错误: 加密消息太短!');
        return null;
          }
      
      // 提取nonce
      const nonce = encryptedMessageWithNonce.slice(0, nacl.box.nonceLength);
      
      // 提取加密消息
      const encryptedMessage = encryptedMessageWithNonce.slice(nacl.box.nonceLength);
      
      // 使用发送者的公钥和接收者的私钥解密消息
      const decryptedMessage = nacl.box.open(
        encryptedMessage,
        nonce,
        senderPublicKey,
        recipientSecretKey
      );
      
      // 如果解密失败，返回null
      if (!decryptedMessage) {
        console.error('[CryptoService] 错误: 消息解密失败!');
        return null;
      }
      
      // 将二进制转换回文本
      return naclUtil.encodeUTF8(decryptedMessage);
    } catch (error) {
      console.error('[CryptoService] 解密消息失败:', error);
      return null;
    }
  }

  /**
   * 获取当前用户的密钥对
   * @returns 当前用户的密钥对，不存在则返回null
   */
  public static getUserKeyPair(): StringKeyPair | null {
    const storedKeyPair = localStorage.getItem('userKeyPair');
    return storedKeyPair ? JSON.parse(storedKeyPair) : null;
  }
  
  /**
   * 将二进制密钥转换为Base64字符串
   */
  public static keyToString(key: Uint8Array): string {
    return naclUtil.encodeBase64(key);
  }

  /**
   * 将Base64字符串转换回二进制密钥
   */
  public static stringToKey(keyString: string): Uint8Array {
    return naclUtil.decodeBase64(keyString);
  }

  /**
   * 将密钥对转换为字符串格式以便存储
   */
  public static keyPairToString(keyPair: KeyPair): StringKeyPair {
    return {
      publicKey: this.keyToString(keyPair.publicKey),
      secretKey: this.keyToString(keyPair.secretKey)
    };
      }
      
  /**
   * 将字符串格式密钥对转换回原始格式
   */
  public static stringToKeyPair(stringKeyPair: StringKeyPair): KeyPair {
    return {
      publicKey: this.stringToKey(stringKeyPair.publicKey),
      secretKey: this.stringToKey(stringKeyPair.secretKey)
    };
        }
        
  /**
   * 生成新的密钥对
   */
  public static generateKeyPair(): KeyPair {
    return nacl.box.keyPair();
  }
  
  /**
   * 创建或恢复用户密钥对
   * @param password 用户密码
   * @returns 创建或恢复的密钥对
   */
  public static async initializeKeyPair(password: string): Promise<StringKeyPair> {
    try {
      const username = localStorage.getItem('username');
      if (!username) {
        throw new Error('无法获取用户名，无法初始化密钥对');
      }
      
      // 首先检查localStorage中是否已有密钥对
      const storedKeyPair = localStorage.getItem('userKeyPair');
      if (storedKeyPair) {
        try {
          const parsedKeyPair = JSON.parse(storedKeyPair);
          if (parsedKeyPair.publicKey && parsedKeyPair.secretKey) {
            console.log('[CryptoService] 从localStorage加载已有密钥对');
            return parsedKeyPair;
          }
        } catch (e) {
          console.warn('[CryptoService] 本地密钥对解析失败');
          // 继续后续流程，创建新密钥对
        }
      }
      
      // 从服务器获取加密的私钥
      try {
        console.log('[CryptoService] 尝试从服务器获取加密的私钥');
        const encryptedPrivateKey = await getPrivateKey();
        
        if (encryptedPrivateKey) {
          // 从密码派生加密密钥
          const encryptionKey = await this.generateEncryptionKey(password);
        
          // 使用派生的密钥解密私钥
          const decryptedSecretKey = await this.decryptPrivateKey(encryptedPrivateKey, password);
          
          if (decryptedSecretKey) {
            console.log('[CryptoService] 私钥解密成功，获取公钥');
        
            // 获取用户的公钥
            const publicKey = await getUserPublicKey(username);
            
            if (publicKey) {
              // 创建恢复的密钥对
        const keyPair = {
          publicKey: publicKey,
          secretKey: decryptedSecretKey
        };
        
        // 保存到localStorage
        localStorage.setItem('userKeyPair', JSON.stringify(keyPair));
        
              console.log('[CryptoService] 密钥对恢复成功');
        return keyPair;
            }
      }
        }
    } catch (error) {
        console.warn('[CryptoService] 从服务器恢复密钥对失败:', error);
        // 继续后续流程，创建新密钥对
  }

      // 如果无法恢复现有密钥，则创建新的密钥对
      console.log('[CryptoService] 创建新的密钥对');
      const keyPair = this.generateKeyPair();
      const stringKeyPair = this.keyPairToString(keyPair);
      
      // 使用密码加密私钥
      const encryptedPrivateKey = await this.encryptPrivateKey(stringKeyPair.secretKey, password);
      
      // 保存加密的私钥到服务器（需要在用户注册成功后）
      try {
        await savePrivateKey(encryptedPrivateKey);
        console.log('[CryptoService] 加密私钥已保存到服务器');
    } catch (error) {
        console.warn('[CryptoService] 保存加密私钥到服务器失败:', error);
      }
      
      // 保存到localStorage
      localStorage.setItem('userKeyPair', JSON.stringify(stringKeyPair));
      
      return stringKeyPair;
    } catch (error) {
      console.error('[CryptoService] 初始化密钥对失败:', error);
      throw error;
  }
  }
} 