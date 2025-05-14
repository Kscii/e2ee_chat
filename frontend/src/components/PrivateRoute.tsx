import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
    children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuth, isLoading } = useAuth();

    if (isLoading) {
        // 可以显示一个加载组件
        return <div>加载中...</div>;
    }

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default PrivateRoute; 