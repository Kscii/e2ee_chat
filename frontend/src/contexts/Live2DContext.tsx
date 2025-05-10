import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Live2DContextType {
    live2dEnabled: boolean;
    toggleLive2D: () => void;
}

const defaultContext: Live2DContextType = {
    live2dEnabled: true,
    toggleLive2D: () => { },
};

const Live2DContext = createContext<Live2DContextType>(defaultContext);

export const useLive2D = () => useContext(Live2DContext);

interface Live2DProviderProps {
    children: ReactNode;
}

export const Live2DProvider: React.FC<Live2DProviderProps> = ({ children }) => {
    // 从localStorage获取初始状态，默认为启用
    const [live2dEnabled, setLive2DEnabled] = useState<boolean>(() => {
        const savedState = localStorage.getItem('live2dEnabled');
        return savedState === null ? true : savedState === 'true';
    });

    // 切换Live2D显示状态
    const toggleLive2D = () => {
        setLive2DEnabled(prev => !prev);
    };

    // 当状态改变时保存到localStorage
    useEffect(() => {
        localStorage.setItem('live2dEnabled', String(live2dEnabled));

        // 控制Live2D元素的显示或隐藏
        const waifuElement = document.getElementById('waifu');
        if (waifuElement) {
            if (live2dEnabled) {
                waifuElement.classList.remove('hide');
            } else {
                waifuElement.classList.add('hide');
            }
        }
    }, [live2dEnabled]);

    return (
        <Live2DContext.Provider value={{ live2dEnabled, toggleLive2D }}>
            {children}
        </Live2DContext.Provider>
    );
};

export default Live2DContext; 