import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getUserInfo, isAuthenticated, logout, login } from '../api/auth';

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

                    // 尝试从sessionStorage恢复密码
                    const savedPassword = sessionStorage.getItem('userPassword');
                    if (savedPassword) {
                        console.log('Recovering password from sessionStorage');
                        setPassword(savedPassword);
                    }
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
            console.log('开始登录流程...');

            // 先调用登录API
            const response = await login(username, password);
            console.log('登录API调用成功');

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

            // 先设置密码，然后设置用户和认证状态
            // 重要：确保密码设置是同步的，这样在其他组件检测到用户变化时密码已经可用
            setPassword(password);
            // 将密码保存到sessionStorage以在页面刷新后恢复
            sessionStorage.setItem('userPassword', password);
            console.log('用户密码已保存用于加密:', password ? '已设置(长度:' + password.length + ')' : '未设置');

            // 然后更新用户状态和认证状态
            setUser(basicUser);
            setIsAuth(true);
            console.log('用户认证状态已更新');

            try {
                console.log('获取完整用户信息...');
                const userData = await getUserInfo();
                setUser(userData);
                console.log('用户信息已更新');
            } catch (error) {
                console.error('获取用户信息失败，但继续使用基本用户信息:', error);
                // 继续使用基本用户信息，不阻断登录流程
            }

            return;
        } catch (error) {
            console.error('登录失败:', error);
            // 登录失败时清除密码
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
        // 清除localStorage中的userKeyPair，确保下一个用户登录时重新生成密钥对
        localStorage.removeItem('userKeyPair');
        // 清除sessionStorage中的密码
        sessionStorage.removeItem('userPassword');
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