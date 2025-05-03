import React, { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
    children: ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuth, loading } = useAuth();

    if (loading) {
        // 可以显示一个加载组件
        return <div>加载中...</div>;
    }

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default PrivateRoute; 