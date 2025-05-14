import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { savePrivateKey, getPrivateKey, getUserPublicKey } from '../api/keys';

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
    
    // 将nonce和加密后的消息合并
    const fullMessage = new Uint8Array(nonce.length + encryptedMessage.length);
    fullMessage.set(nonce);
    fullMessage.set(encryptedMessage, nonce.length);
    
    // 转换为Base64字符串
    return naclUtil.encodeBase64(fullMessage);
  }

  // 解密消息
  static decryptMessage(encryptedMessageBase64: string, senderPublicKey: Uint8Array, recipientSecretKey: Uint8Array): string | null {
    // 将Base64字符串转换回二进制
    const encryptedMessageWithNonce = naclUtil.decodeBase64(encryptedMessageBase64);
    
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
    if (!decryptedMessage) return null;
    
    // 将二进制转换回文本
    return naclUtil.encodeUTF8(decryptedMessage);
  }

  // 使用密码加密私钥
  static encryptPrivateKey(secretKey: string, password: string): string {
    // 创建从密码派生的密钥
    const passwordKey = this.createPasswordKey(password);
    
    // 创建一次性随机数
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    
    // 将私钥转换为二进制
    const secretKeyUint8 = naclUtil.decodeBase64(secretKey);
    
    // 使用密码密钥加密私钥
    const encryptedSecretKey = nacl.secretbox(
      secretKeyUint8,
      nonce,
      passwordKey
    );
    
    // 将nonce和加密后的私钥合并
    const fullEncrypted = new Uint8Array(nonce.length + encryptedSecretKey.length);
    fullEncrypted.set(nonce);
    fullEncrypted.set(encryptedSecretKey, nonce.length);
    
    // 输出调试信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('加密私钥 - 原始私钥:', secretKey);
      console.log('加密私钥 - 加密后:', naclUtil.encodeBase64(fullEncrypted));
    }
    
    // 转换为Base64字符串
    return naclUtil.encodeBase64(fullEncrypted);
  }

  // 解密私钥
  static decryptPrivateKey(encryptedSecretKeyBase64: string, password: string): string | null {
    try {
      // 创建从密码派生的密钥
      const passwordKey = this.createPasswordKey(password);
      
      // 将Base64字符串转换回二进制
      const encryptedWithNonce = naclUtil.decodeBase64(encryptedSecretKeyBase64);
      
      // 提取nonce
      const nonce = encryptedWithNonce.slice(0, nacl.secretbox.nonceLength);
      
      // 提取加密私钥
      const encryptedSecretKey = encryptedWithNonce.slice(nacl.secretbox.nonceLength);
      
      // 使用密码密钥解密私钥
      const decryptedSecretKey = nacl.secretbox.open(
        encryptedSecretKey,
        nonce,
        passwordKey
      );
      
      // 如果解密失败，返回null
      if (!decryptedSecretKey) return null;
      
      // 输出调试信息（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('解密私钥 - 加密的私钥:', encryptedSecretKeyBase64);
        console.log('解密私钥 - 解密后:', naclUtil.encodeBase64(decryptedSecretKey));
      }
      
      // 将二进制转换回Base64字符串
      return naclUtil.encodeBase64(decryptedSecretKey);
    } catch (error) {
      console.error('解密私钥失败:', error);
      return null;
    }
  }

  // 从密码创建密钥（用于加密私钥）
  private static createPasswordKey(password: string): Uint8Array {
    // 使用SHA-256哈希密码以得到固定长度的密钥
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // 创建32字节（256位）密钥，必须是nacl.secretbox所需的长度
    const hashKey = nacl.hash(passwordData);
    return hashKey.slice(0, 32); // 取前32字节作为密钥
  }

  // 创建密钥对并保存到localStorage
  static async initializeKeyPair(password: string): Promise<StringKeyPair> {
    try {
      console.log('[CryptoService] 初始化密钥对开始');
      
      if (!password) {
        console.error('[CryptoService] 错误：密码为空，无法初始化密钥对');
        console.error('[CryptoService] 密码值:', password);
        console.error('[CryptoService] 密码类型:', typeof password);
        throw new Error('密码为空，无法初始化密钥对');
      }
      
      console.log('[CryptoService] 密码状态: 已提供，长度:', password.length);

      // 检查localStorage中是否已有密钥对
      const storedKeyPair = localStorage.getItem('userKeyPair');
      
      if (storedKeyPair) {
        console.log('[CryptoService] 从localStorage加载已有密钥对');
        return JSON.parse(storedKeyPair);
      }
      
      // 尝试从服务器获取加密的私钥
      try {
        console.log('[CryptoService] 尝试从服务器获取加密的私钥...');
        const encryptedSecretKey = await getPrivateKey();
        
        if (encryptedSecretKey) {
          console.log('[CryptoService] 已从服务器检索到加密私钥，正在解密...');
          // 解密私钥
          const decryptedSecretKey = this.decryptPrivateKey(encryptedSecretKey, password);
          
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
              console.error('[CryptoService] 无法获取公钥，无法恢复密钥对');
              throw new Error('无法获取公钥，无法恢复密钥对');
            }
          } else {
            console.error('[CryptoService] 私钥解密失败，可能密码不正确');
            throw new Error('私钥解密失败，可能密码不正确');
          }
        } else {
          console.log('[CryptoService] 服务器上没有找到加密的私钥，将创建新密钥对');
        }
      } catch (error) {
        console.warn('[CryptoService] 从服务器恢复密钥失败，将创建新密钥对:', error);
      }
      
      // 生成新的密钥对
      console.log('[CryptoService] 正在生成新的密钥对...');
      const keyPair = this.generateKeyPair();
      const stringKeyPair = this.keyPairToString(keyPair);
      
      // 输出调试信息（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('[CryptoService] 新创建的密钥对:', stringKeyPair);
      }
      
      // 加密私钥
      console.log('[CryptoService] 正在使用密码加密私钥...');
      const encryptedPrivateKey = this.encryptPrivateKey(stringKeyPair.secretKey, password);
      
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
      console.error('[CryptoService] 初始化密钥对失败:', error);
      throw error;
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
} 