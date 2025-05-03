import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getUserInfo, isAuthenticated, logout } from '../api/auth';

interface User {
    username: string;
    email?: string;
    phone?: string;
}

interface AuthContextType {
    isAuth: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
    setUser: (user: User | null) => void;
    setIsAuth: (isAuth: boolean) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuth: false,
    user: null,
    loading: true,
    error: null,
    setUser: () => { },
    setIsAuth: () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState<boolean>(isAuthenticated());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            if (isAuthenticated()) {
                try {
                    setLoading(true);
                    const userData = await getUserInfo();
                    setUser(userData);
                    setIsAuth(true);
                } catch (error) {
                    setError(error instanceof Error ? error.message : '获取用户信息失败');
                    setIsAuth(false);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const handleLogout = () => {
        logout();
        setUser(null);
        setIsAuth(false);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuth,
                user,
                loading,
                error,
                setUser,
                setIsAuth,
                logout: handleLogout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}; 