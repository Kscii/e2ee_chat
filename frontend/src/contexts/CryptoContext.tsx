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
            if (isAuth && user && !keyInitAttempted) {
                console.log(`[CryptoContext] Initializing key pair - attempt ${retryCount + 1}/${MAX_RETRIES + 1}`);
                console.log(`[CryptoContext] User: ${user?.username}, Authentication status: ${isAuth}, Password: ${password ? 'Set' : 'Not set'}`);

                // If password is empty but retry count hasn't reached max, wait and retry
                if (!password && retryCount < MAX_RETRIES) {
                    console.log(`[CryptoContext] Password is empty, will retry in ${RETRY_DELAY}ms (${retryCount + 1}/${MAX_RETRIES})`);
                    const timer = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, RETRY_DELAY);
                    return () => clearTimeout(timer);
                }

                // Reached max retry count or password is available, start initialization
                setKeyInitAttempted(true);

                // Final check, if password is still empty, log error and exit
                if (!password) {
                    console.error('[CryptoContext] Error: Cannot initialize key pair, password is empty (max retries reached)');
                    return;
                }

                console.log('[CryptoContext] Starting key pair initialization...');
                console.log('[CryptoContext] User authenticated:', isAuth);
                console.log('[CryptoContext] User info:', user?.username);
                console.log('[CryptoContext] Password status:', password ? 'Set' : 'Not set');

                try {
                    // First check if key pair already exists in localStorage
                    const storedKeyPair = CryptoService.getUserKeyPair();

                    if (storedKeyPair) {
                        console.log('[CryptoContext] Loading existing key pair from localStorage');
                        setKeyPair(storedKeyPair);
                        setIsInitialized(true);

                        // Ensure public key is uploaded to server
                        try {
                            console.log('[CryptoContext] Ensuring public key is uploaded to server');
                            await savePublicKey(storedKeyPair.publicKey);
                            console.log('[CryptoContext] Public key uploaded to server');
                        } catch (err) {
                            console.error('[CryptoContext] Failed to upload public key:', err);
                        }

                        return;
                    }

                    // Check if user has a public key on the server
                    try {
                        console.log(`[CryptoContext] Checking if user ${user.username} has a public key on server`);
                        const hasPublicKey = await checkPublicKeyExists(user.username);
                        console.log(`[CryptoContext] User ${user.username} ${hasPublicKey ? 'has' : 'does not have'} a public key on server`);
                    } catch (error) {
                        console.error('[CryptoContext] Failed to check public key existence:', error);
                    }

                    // Initialize key pair - will decide whether to create new keys or recover existing ones based on server
                    console.log('[CryptoContext] Initializing key pair with password...');
                    const newKeyPair = await CryptoService.initializeKeyPair(password);
                    console.log('[CryptoContext] Key pair initialization complete:', !!newKeyPair);

                    setKeyPair(newKeyPair);
                    setIsInitialized(true);

                    // Upload public key to server (may be redundant if recovered from server, but harmless)
                    try {
                        console.log('[CryptoContext] Ensuring public key is uploaded to server');
                        await savePublicKey(newKeyPair.publicKey);
                        console.log('[CryptoContext] Public key uploaded to server');
                    } catch (err) {
                        console.error('[CryptoContext] Failed to upload public key:', err);
                    }
                } catch (error) {
                    console.error('[CryptoContext] Failed to initialize key pair:', error);
                    setIsInitialized(false);
                }
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