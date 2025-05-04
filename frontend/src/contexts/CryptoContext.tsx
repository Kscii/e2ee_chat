import React, { createContext, useContext, useEffect, useState } from 'react';
import { CryptoService, StringKeyPair } from '../utils/crypto';
import { savePublicKey } from '../api/keys';
import { useAuth } from './AuthContext';

interface CryptoContextType {
    keyPair: StringKeyPair | null;
    isInitialized: boolean;
    getMyPublicKey: () => string | null;
    getMySecretKey: () => string | null;
    encryptMessage: (message: string, recipientPublicKeyBase64: string) => string;
    decryptMessage: (encryptedMessage: string, senderPublicKeyBase64: string) => string | null;
}

const CryptoContext = createContext<CryptoContextType | null>(null);

export const useCrypto = () => {
    const context = useContext(CryptoContext);
    if (!context) {
        throw new Error('useCrypto必须在CryptoProvider内部使用');
    }
    return context;
};

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [keyPair, setKeyPair] = useState<StringKeyPair | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const { user, isAuth } = useAuth();

    // 初始化密钥对
    useEffect(() => {
        if (isAuth && user) {
            // 尝试从localStorage加载密钥对
            const storedKeyPair = CryptoService.getUserKeyPair();

            if (storedKeyPair) {
                setKeyPair(storedKeyPair);
                setIsInitialized(true);

                // 将公钥上传到服务器
                savePublicKey(storedKeyPair.publicKey).catch(err =>
                    console.error('上传公钥失败:', err)
                );
            } else {
                // 创建新的密钥对
                const newKeyPair = CryptoService.initializeKeyPair();
                setKeyPair(newKeyPair);
                setIsInitialized(true);

                // 将公钥上传到服务器
                savePublicKey(newKeyPair.publicKey).catch(err =>
                    console.error('上传公钥失败:', err)
                );
            }
        }
    }, [isAuth, user]);

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