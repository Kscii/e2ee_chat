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
            if (isAuth && user && !keyInitAttempted && password) {
                console.log(`[CryptoContext] 用户已认证，开始初始化密钥对`);
                setKeyInitAttempted(true); // 立即标记为已尝试，防止重复执行

                try {
                    // 首先检查localStorage是否已有密钥对，如果有就直接使用
                    const storedKeyPair = CryptoService.getUserKeyPair();
                    if (storedKeyPair) {
                        console.log('[CryptoContext] 从localStorage加载已有密钥对');
                        setKeyPair(storedKeyPair);
                        setIsInitialized(true);

                        // 确保公钥已上传到服务器
                        try {
                            await savePublicKey(storedKeyPair.publicKey);
                            console.log('[CryptoContext] 确保公钥已上传到服务器');
                        } catch (err) {
                            console.error('[CryptoContext] 上传公钥失败，但不影响使用:', err);
                        }
                        return;
                    }

                    // 尝试加载或初始化密钥对
                    console.log('[CryptoContext] 尝试初始化新密钥对...');
                    const newKeyPair = await CryptoService.initializeKeyPair(password);
                    console.log('[CryptoContext] 密钥对初始化完成');

                    setKeyPair(newKeyPair);
                    setIsInitialized(true);
                } catch (error) {
                    console.error('[CryptoContext] 初始化密钥对失败:', error);
                    setIsInitialized(false);
                }
            } else if (isAuth && user && !keyInitAttempted && !password) {
                console.log('[CryptoContext] 用户已认证但密码为空，等待密码...');
                const timer = setTimeout(() => {
                    if (retryCount < MAX_RETRIES) {
                        setRetryCount(prev => prev + 1);
                        console.log(`[CryptoContext] 重试 ${retryCount + 1}/${MAX_RETRIES}`);
                    } else {
                        console.error('[CryptoContext] 达到最大重试次数，密码仍为空');
                        setKeyInitAttempted(true); // 放弃尝试
                    }
                }, RETRY_DELAY);
                return () => clearTimeout(timer);
            }
        };

        initializeKeys();
    }, [isAuth, user, password, keyInitAttempted, retryCount]);

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
            throw new Error('Key pair not initialized');
        }

        const mySecretKey = CryptoService.stringToKey(keyPair.secretKey);
        const recipientPublicKey = CryptoService.stringToKey(recipientPublicKeyBase64);

        return CryptoService.encryptMessage(message, recipientPublicKey, mySecretKey);
    };

    // Decrypt message
    const decryptMessage = (encryptedMessage: string, senderPublicKeyBase64: string): string | null => {
        if (!keyPair) {
            throw new Error('Key pair not initialized');
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