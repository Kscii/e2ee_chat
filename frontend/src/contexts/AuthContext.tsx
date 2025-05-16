import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getUserInfo, isAuthenticated, logout, login } from '../api/auth';
import { CryptoService } from '../utils/crypto';

interface User {
    username: string;
    email?: string;
    phone?: string;
    id: number;
    avatar_path: string;
    created_at: string;
    last_login: string;
}

export interface AuthContextType {
    user: User | null;
    isAuth: boolean;
    isLoading: boolean;
    password: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    updateUserInfo: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth必须在AuthProvider内部使用');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [password, setPassword] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            setIsLoading(true);

            try {
                if (isAuthenticated()) {
                    const userData = await getUserInfo();
                    setUser(userData);
                    setIsAuth(true);

                    // 不再从sessionStorage恢复密码
                    // localStorage中的encryptionKey在CryptoContext中使用
                }
            } catch (error) {
                console.error('验证用户失败:', error);
                handleLogout();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const handleLogin = async (username: string, password: string) => {
        try {
            setIsLoading(true);
            console.log('[AuthContext] 开始登录流程...');

            // 调用修改后的登录API
            const response = await login(username, password);
            console.log('[AuthContext] 登录API调用成功');

            // 创建基本用户对象
            const basicUser = {
                id: 0,
                username: response.username,
                email: '',
                phone: '',
                avatar_path: '',
                created_at: '',
                last_login: ''
            };

            // 设置用户状态
            setUser(basicUser);
            setIsAuth(true);
            console.log('[AuthContext] 用户认证状态已更新');

            // 获取完整用户信息
            try {
                console.log('[AuthContext] 获取完整用户信息...');
                const userData = await getUserInfo();
                setUser(userData);
                console.log('[AuthContext] 用户信息已更新');
            } catch (error) {
                console.error('[AuthContext] 获取用户信息失败，但继续使用基本用户信息:', error);
                // 继续使用基本用户信息，不阻断登录流程
            }

            return;
        } catch (error) {
            console.error('[AuthContext] 登录失败:', error);
            // 登录失败时确保密码被清除
            setPassword(null);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        setUser(null);
        setIsAuth(false);
        setPassword(null);
        // 清除本地存储中的密钥信息
        localStorage.removeItem('userKeyPair');
        localStorage.removeItem('encryptionKey');
        // 不需要清除sessionStorage，因为我们不再使用它存储密码
    };

    const updateUserInfo = async (data: Partial<User>) => {
        try {
            setIsLoading(true);
            setUser(prev => prev ? { ...prev, ...data } : null);
            return;
        } catch (error) {
            console.error('更新用户信息失败:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        user,
        isAuth,
        isLoading,
        password,
        login: handleLogin,
        logout: handleLogout,
        updateUserInfo
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 