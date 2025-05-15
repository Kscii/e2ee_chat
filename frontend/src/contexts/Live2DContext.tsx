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

// 声明全局window对象中可能存在的Live2D相关变量
declare global {
    interface Window {
        initModel?: () => void;
        live2dv2?: any;
        live2dv4?: any;
        live2dCurrentVersion?: number;
    }
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

    // 检查Live2D脚本是否已加载
    const checkLive2DScriptsLoaded = (): boolean => {
        return (
            typeof window.live2dv2 !== 'undefined' &&
            typeof window.live2dv4 !== 'undefined' &&
            typeof window.initModel !== 'undefined'
        );
    };

    // 初始化Live2D模型
    const initializeLive2D = () => {
        try {
            // 清除localStorage中的modelName，强制使用默认模型
            localStorage.removeItem('modelName');

            if (checkLive2DScriptsLoaded()) {
                // 如果initModel函数存在，调用它
                if (typeof window.initModel === 'function') {
                    console.log('正在初始化Live2D模型...');
                    window.initModel();
                    console.log('Live2D初始化成功');

                    // 添加错误监听器捕获JSON解析错误
                    window.addEventListener('error', (event) => {
                        if (event.message.includes('JSON')) {
                            console.error('Live2D JSON解析错误:', event);
                        }
                    });
                } else {
                    console.error('找不到Live2D initModel函数');
                }
            } else {
                console.error('Live2D脚本未完全加载');

                // 尝试重新加载脚本
                if (!document.getElementById('live2d-bundle-script')) {
                    console.log('尝试手动加载Live2D脚本...');
                    const script1 = document.createElement('script');
                    script1.id = 'live2d-bundle-script';
                    script1.src = '/live2d/dist/live2d_bundle.js';
                    script1.onload = () => {
                        console.log('live2d_bundle.js加载成功');

                        const script2 = document.createElement('script');
                        script2.type = 'module';
                        script2.src = '/live2d/waifu-tips.js';
                        script2.onload = () => {
                            console.log('waifu-tips.js加载成功');
                            setTimeout(() => {
                                if (typeof window.initModel === 'function') {
                                    window.initModel();
                                }
                            }, 500);
                        };
                        document.body.appendChild(script2);
                    };
                    document.body.appendChild(script1);
                }
            }
        } catch (error) {
            console.error('Live2D初始化过程中出错:', error);
        }
    };

    // 组件挂载时初始化Live2D
    useEffect(() => {
        // 当页面完全加载后执行初始化
        if (document.readyState === 'complete') {
            setTimeout(initializeLive2D, 1000); // 延迟1秒，确保DOM完全渲染
        } else {
            window.addEventListener('load', () => {
                setTimeout(initializeLive2D, 1000);
            });
        }

        return () => {
            window.removeEventListener('load', initializeLive2D);
        };
    }, []);

    // 当状态改变时保存到localStorage并控制显示/隐藏
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