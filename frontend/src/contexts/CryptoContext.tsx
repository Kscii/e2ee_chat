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
    encryptMessage: () => { throw new Error('CryptoContext 未初始化'); },
    decryptMessage: () => { throw new Error('CryptoContext 未初始化'); }
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
    const RETRY_DELAY = 1000; // 1秒

    // 当用户变化时重置密钥初始化状态
    useEffect(() => {
        if (!isAuth || !user) {
            setKeyPair(null);
            setIsInitialized(false);
            setKeyInitAttempted(false);
            setRetryCount(0);
            console.log('[CryptoContext] 用户已登出或变化，重置密钥状态');
        }
    }, [isAuth, user?.username]);

    // 检查服务器上是否有用户公钥
    const checkPublicKeyExists = async (username: string): Promise<boolean> => {
        try {
            await getUserPublicKey(username);
            return true;
        } catch (error) {
            return false;
        }
    };

    // 初始化密钥对
    useEffect(() => {
        const initializeKeys = async () => {
            if (isAuth && user && !keyInitAttempted) {
                console.log(`[CryptoContext] 初始化密钥对 - 尝试 ${retryCount + 1}/${MAX_RETRIES + 1}`);
                console.log(`[CryptoContext] 用户: ${user?.username}, 认证状态: ${isAuth}, 密码: ${password ? '已设置' : '未设置'}`);

                // 如果密码为空但重试次数未达最大，等待后重试
                if (!password && retryCount < MAX_RETRIES) {
                    console.log(`[CryptoContext] 密码为空，将在 ${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`);
                    const timer = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, RETRY_DELAY);
                    return () => clearTimeout(timer);
                }

                // 达到最大重试次数或已有密码，开始初始化
                setKeyInitAttempted(true);

                // 最终检查，如果仍然没有密码，记录错误并退出
                if (!password) {
                    console.error('[CryptoContext] 错误：无法初始化密钥对，密码为空 (已达到重试上限)');
                    return;
                }

                console.log('[CryptoContext] 开始初始化密钥对...');
                console.log('[CryptoContext] 用户已认证:', isAuth);
                console.log('[CryptoContext] 用户信息:', user?.username);
                console.log('[CryptoContext] 密码状态:', password ? '已设置' : '未设置');

                try {
                    // 首先检查localStorage中是否已有密钥对
                    const storedKeyPair = CryptoService.getUserKeyPair();

                    if (storedKeyPair) {
                        console.log('[CryptoContext] 从localStorage加载已有密钥对');
                        setKeyPair(storedKeyPair);
                        setIsInitialized(true);

                        // 确保公钥已上传到服务器
                        try {
                            console.log('[CryptoContext] 确保公钥已上传到服务器');
                            await savePublicKey(storedKeyPair.publicKey);
                            console.log('[CryptoContext] 公钥已上传到服务器');
                        } catch (err) {
                            console.error('[CryptoContext] 上传公钥失败:', err);
                        }

                        return;
                    }

                    // 检查用户在服务器上是否有公钥
                    try {
                        console.log(`[CryptoContext] 检查用户 ${user.username} 在服务器上是否有公钥`);
                        const hasPublicKey = await checkPublicKeyExists(user.username);
                        console.log(`[CryptoContext] 用户 ${user.username} 在服务器上${hasPublicKey ? '有' : '没有'}公钥`);
                    } catch (error) {
                        console.error('[CryptoContext] 检查公钥存在性失败:', error);
                    }

                    // 初始化密钥对 - 会根据服务器上是否有现有密钥来决定是创建新密钥还是恢复现有密钥
                    console.log('[CryptoContext] 使用密码初始化密钥对...');
                    const newKeyPair = await CryptoService.initializeKeyPair(password);
                    console.log('[CryptoContext] 密钥对初始化完成:', !!newKeyPair);

                    setKeyPair(newKeyPair);
                    setIsInitialized(true);

                    // 上传公钥到服务器（如果从服务器恢复，这可能是多余的，但无害）
                    try {
                        console.log('[CryptoContext] 确保公钥已上传到服务器');
                        await savePublicKey(newKeyPair.publicKey);
                        console.log('[CryptoContext] 公钥已上传到服务器');
                    } catch (err) {
                        console.error('[CryptoContext] 上传公钥失败:', err);
                    }
                } catch (error) {
                    console.error('[CryptoContext] 初始化密钥对失败:', error);
                    setIsInitialized(false);
                }
            }
        };

        initializeKeys();
    }, [isAuth, user, password, keyInitAttempted, retryCount]);

    // 获取我的公钥
    const getMyPublicKey = (): string | null => {
        return keyPair ? keyPair.publicKey : null;
    };

    // 获取我的私钥
    const getMySecretKey = (): string | null => {
        return keyPair ? keyPair.secretKey : null;
    };

    // 加密消息
    const encryptMessage = (message: string, recipientPublicKeyBase64: string): string => {
        if (!keyPair) {
            throw new Error('密钥对未初始化');
        }

        const mySecretKey = CryptoService.stringToKey(keyPair.secretKey);
        const recipientPublicKey = CryptoService.stringToKey(recipientPublicKeyBase64);

        return CryptoService.encryptMessage(message, recipientPublicKey, mySecretKey);
    };

    // 解密消息
    const decryptMessage = (encryptedMessage: string, senderPublicKeyBase64: string): string | null => {
        if (!keyPair) {
            throw new Error('密钥对未初始化');
        }

        const mySecretKey = CryptoService.stringToKey(keyPair.secretKey);
        const senderPublicKey = CryptoService.stringToKey(senderPublicKeyBase64);

        return CryptoService.decryptMessage(encryptedMessage, senderPublicKey, mySecretKey);
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