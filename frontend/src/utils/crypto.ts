import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

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

  // 创建密钥对并保存到localStorage
  static initializeKeyPair(): StringKeyPair {
    // 检查localStorage中是否已有密钥对
    const storedKeyPair = localStorage.getItem('userKeyPair');
    
    if (storedKeyPair) {
      return JSON.parse(storedKeyPair);
    }
    
    // 生成新的密钥对
    const keyPair = this.generateKeyPair();
    const stringKeyPair = this.keyPairToString(keyPair);
    
    // 保存到localStorage
    localStorage.setItem('userKeyPair', JSON.stringify(stringKeyPair));
    
    return stringKeyPair;
  }

  // 获取当前用户的密钥对
  static getUserKeyPair(): StringKeyPair | null {
    const storedKeyPair = localStorage.getItem('userKeyPair');
    return storedKeyPair ? JSON.parse(storedKeyPair) : null;
  }
} 