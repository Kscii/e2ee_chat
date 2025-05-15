import React, { createContext, useContext, useEffect, useState } from 'react';
import { CryptoService, StringKeyPair } from '../utils/crypto';
import { savePublicKey, getUserPublicKey } from '../api/keys';
import { useAuth } from './AuthContext';

interface CryptoContextType {
    keyPair: StringKeyPair | null;
    isInitialized: boolean;
    getMyPublicKey: () => string | null;
    getMySecretKey: () => string | null;
    encryptMessage: (message: string, recipientPublicKeyBase64: string) => string;
    decryptMessage: (encryptedMessage: string, senderPublicKeyBase64: string) => string | null;
}

const defaultContext: CryptoContextType = {
    keyPair: null,
    isInitialized: false,
    getMyPublicKey: () => null,
    getMySecretKey: () => null,
    encryptMessage: () => { throw new Error('CryptoContext not initialized'); },
    decryptMessage: () => { throw new Error('CryptoContext not initialized'); }
};

export const CryptoContext = createContext<CryptoContextType>(defaultContext);

export const useCrypto = () => useContext(CryptoContext);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [keyPair, setKeyPair] = useState<StringKeyPair | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const { user, isAuth, password } = useAuth();
    const [keyInitAttempted, setKeyInitAttempted] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // Reset key initialization state when user changes
    useEffect(() => {
        if (!isAuth || !user) {
            setKeyPair(null);
            setIsInitialized(false);
            setKeyInitAttempted(false);
            setRetryCount(0);
            console.log('[CryptoContext] User logged out or changed, resetting key state');
        }
    }, [isAuth, user?.username]);

    // Check if the user has a public key on the server
    const checkPublicKeyExists = async (username: string): Promise<boolean> => {
        try {
            await getUserPublicKey(username);
            return true;
        } catch (error) {
            return false;
        }
    };

    // Initialize key pair
    useEffect(() => {
        const initializeKeys = async () => {
            // 如果已经初始化过，跳过
            if (isInitialized && keyPair) {
                console.log('[CryptoContext] 密钥对已初始化，跳过');
                return;
            }

            // 检查用户是否已认证
            if (isAuth && user) {
                console.log(`[CryptoContext] 用户已认证，准备初始化密钥对`);

                // 首先检查localStorage是否已有密钥对，无论密码是否为空都可以直接使用
                const storedKeyPair = CryptoService.getUserKeyPair();
                if (storedKeyPair) {
                    console.log('[CryptoContext] 从localStorage加载已有密钥对');
                    setKeyPair(storedKeyPair);
                    setIsInitialized(true);
                    setKeyInitAttempted(true);

                    // 确保公钥已上传到服务器
                    try {
                        await savePublicKey(storedKeyPair.publicKey);
                        console.log('[CryptoContext] 确保公钥已上传到服务器');
                    } catch (err) {
                        console.error('[CryptoContext] 上传公钥失败，但不影响使用:', err);
                    }
                    return;
                }

                // 方案1：尝试从已存储的加密密钥初始化（不需要密码）
                const encryptionKeyString = localStorage.getItem('encryptionKey');
                if (encryptionKeyString) {
                    try {
                        console.log('[CryptoContext] 尝试使用已存储的加密密钥初始化...');
                        setKeyInitAttempted(true);

                        // 将字符串转换回加密密钥
                        const encryptionKey = CryptoService.stringToKey(encryptionKeyString);

                        // 使用加密密钥初始化
                        const newKeyPair = await CryptoService.initializeKeyPairWithEncryptionKey(encryptionKey);

                        if (newKeyPair) {
                            console.log('[CryptoContext] 使用加密密钥初始化成功');
                            setKeyPair(newKeyPair);
                            setIsInitialized(true);
                            return;
                        } else {
                            console.error('[CryptoContext] 使用加密密钥初始化失败');
                        }
                    } catch (error) {
                        console.error('[CryptoContext] 使用已存储加密密钥初始化失败:', error);
                    }
                }

                // 方案2：如果有密码，尝试使用密码初始化
                if (password) {
                    try {
                        console.log('[CryptoContext] 使用密码初始化密钥对...');
                        setKeyInitAttempted(true); // 标记为已尝试

                        // 尝试加载或初始化密钥对
                        const newKeyPair = await CryptoService.initializeKeyPair(password);
                        console.log('[CryptoContext] 密钥对初始化完成');

                        setKeyPair(newKeyPair);
                        setIsInitialized(true);
                    } catch (error) {
                        console.error('[CryptoContext] 使用密码初始化密钥对失败:', error);
                        setIsInitialized(false);
                    }
                }
                // 只有当前两种方法都失败且还没尝试过时，才设置重试
                else if (!keyInitAttempted) {
                    console.log('[CryptoContext] 没有密码也没有有效的加密密钥，等待备用方案...');

                    // 方案3：等待密码设置，使用重试机制
                    const timer = setTimeout(() => {
                        if (retryCount < MAX_RETRIES) {
                            setRetryCount(prev => prev + 1);
                            console.log(`[CryptoContext] 重试 ${retryCount + 1}/${MAX_RETRIES}`);
                        } else {
                            console.error('[CryptoContext] 达到最大重试次数，密码仍为空');
                            // 不再立即放弃，而是尝试最后一次备用方案
                            tryFallbackInitialization();
                        }
                    }, RETRY_DELAY);
                    return () => clearTimeout(timer);
                }
            }
        };

        // 备用初始化方法，在所有尝试失败后使用
        const tryFallbackInitialization = async () => {
            console.log('[CryptoContext] 尝试最后的备用初始化方法...');
            try {
                // 检查是否可以从服务器恢复公钥
                if (user) {
                    const username = user.username;
                    const publicKey = await getUserPublicKey(username);

                    if (publicKey) {
                        console.log('[CryptoContext] 从服务器获取到公钥，但无法获取私钥');
                        console.warn('[CryptoContext] 警告: 只能恢复公钥，将无法解密消息');

                        // 创建只有公钥的密钥对
                        const partialKeyPair = {
                            publicKey: publicKey,
                            secretKey: '' // 私钥为空
                        };

                        // 设置部分密钥对，用户仍然可以加密但无法解密
                        setKeyPair(partialKeyPair);
                        setIsInitialized(true);

                        // 提示用户需要重新登录
                        console.warn('[CryptoContext] 请用户重新登录以完全恢复加密功能');
                    } else {
                        setKeyInitAttempted(true); // 最终放弃
                        console.error('[CryptoContext] 无法从服务器获取公钥，无法初始化密钥对');
                    }
                } else {
                    setKeyInitAttempted(true); // 最终放弃
                }
            } catch (error) {
                console.error('[CryptoContext] 备用初始化失败:', error);
                setKeyInitAttempted(true); // 最终放弃
            }
        };

        initializeKeys();
    }, [isAuth, user, password, keyInitAttempted, retryCount, keyPair, isInitialized]);

    // Get my public key
    const getMyPublicKey = (): string | null => {
        return keyPair ? keyPair.publicKey : null;
    };

    // Get my private key
    const getMySecretKey = (): string | null => {
        return keyPair ? keyPair.secretKey : null;
    };

    // Encrypt message
    const encryptMessage = (message: string, recipientPublicKeyBase64: string): string => {
        if (!keyPair) {
            console.error('[CryptoContext] 错误: 无法加密消息，密钥对未初始化！');
            throw new Error('Key pair not initialized');
        }

        if (!message) {
            console.error('[CryptoContext] 错误: 无法加密空消息！');
            throw new Error('Cannot encrypt empty message');
        }

        if (!recipientPublicKeyBase64) {
            console.error('[CryptoContext] 错误: 接收者公钥为空！');
            throw new Error('Recipient public key is empty');
        }

        try {
            console.log('[CryptoContext] 正在加密消息 - 接收者公钥:',
                recipientPublicKeyBase64.substring(0, 8) + '...');

            const mySecretKey = CryptoService.stringToKey(keyPair.secretKey);
            const recipientPublicKey = CryptoService.stringToKey(recipientPublicKeyBase64);

            const result = CryptoService.encryptMessage(message, recipientPublicKey, mySecretKey);
            console.log('[CryptoContext] 消息加密成功，长度:', result.length);
            return result;
        } catch (error) {
            console.error('[CryptoContext] 消息加密失败:', error);
            throw error;
        }
    };

    // Decrypt message
    const decryptMessage = (encryptedMessage: string, senderPublicKeyBase64: string): string | null => {
        if (!keyPair) {
            console.error('[CryptoContext] 错误: 无法解密消息，密钥对未初始化！');
            throw new Error('Key pair not initialized');
        }

        if (!encryptedMessage) {
            console.error('[CryptoContext] 错误: 无法解密空消息！');
            return null;
        }

        if (!senderPublicKeyBase64) {
            console.error('[CryptoContext] 错误: 发送者公钥为空！');
            return null;
        }

        try {
            console.log('[CryptoContext] 正在解密消息 - 发送者公钥:',
                senderPublicKeyBase64.substring(0, 8) + '...');

            // 导出调试信息
            try {
                if (typeof CryptoService.exportDebugInfo === 'function') {
                    console.info('[CryptoContext] 导出解密前的密钥调试信息');
                    CryptoService.exportDebugInfo();
                }
            } catch (e) {
                console.warn('[CryptoContext] 无法导出调试信息:', e);
            }

            // 记录详细的密钥信息用于跨浏览器对比
            if (typeof CryptoService.hashString === 'function') {
                console.info('[CryptoContext-DEBUG] 解密密钥详情:', {
                    本地公钥哈希: CryptoService.hashString(keyPair.publicKey),
                    本地私钥哈希: CryptoService.hashString(keyPair.secretKey),
                    发送者公钥哈希: CryptoService.hashString(senderPublicKeyBase64),
                    加密消息哈希: CryptoService.hashString(encryptedMessage),
                    浏览器: navigator.userAgent,
                    时间戳: new Date().toISOString()
                });
            }

            const mySecretKey = CryptoService.stringToKey(keyPair.secretKey);
            const senderPublicKey = CryptoService.stringToKey(senderPublicKeyBase64);

            const result = CryptoService.decryptMessage(encryptedMessage, senderPublicKey, mySecretKey);

            if (result) {
                console.log('[CryptoContext] 消息解密成功');
                return result;
            } else {
                console.error('[CryptoContext] 消息解密失败！可能是密钥不匹配或消息已损坏');

                // 在解密失败时记录额外的诊断信息
                console.error('[CryptoContext] 解密失败详情:',
                    '本地密钥对是否完整:', !!(keyPair && keyPair.publicKey && keyPair.secretKey),
                    '本地公钥:', keyPair.publicKey.substring(0, 8) + '...',
                    '发送者公钥:', senderPublicKeyBase64.substring(0, 8) + '...');

                // 记录完整的密钥哈希值，便于对比
                if (typeof CryptoService.hashString === 'function') {
                    console.error('[CryptoContext-DEBUG] 解密失败详细信息:', {
                        本地公钥完整哈希: CryptoService.hashString(keyPair.publicKey),
                        本地私钥完整哈希: CryptoService.hashString(keyPair.secretKey),
                        发送者公钥完整哈希: CryptoService.hashString(senderPublicKeyBase64),
                        本地公钥长度: keyPair.publicKey.length,
                        本地私钥长度: keyPair.secretKey.length,
                        发送者公钥长度: senderPublicKeyBase64.length,
                        加密消息长度: encryptedMessage.length,
                        加密消息前20位: encryptedMessage.substring(0, 20) + '...',
                        浏览器详情: navigator.userAgent
                    });
                }

                // 建议重新初始化密钥对
                console.warn('[CryptoContext] 建议: 可能需要重新刷新页面或重新登录，确保密钥对从服务器正确恢复');

                return null;
            }
        } catch (error) {
            console.error('[CryptoContext] 解密过程中发生异常:', error);
            return null;
        }
    };

    const value = {
        keyPair,
        isInitialized,
        getMyPublicKey,
        getMySecretKey,
        encryptMessage,
        decryptMessage
    };

    return (
        <CryptoContext.Provider value={value}>
            {children}
        </CryptoContext.Provider>
    );
}; 