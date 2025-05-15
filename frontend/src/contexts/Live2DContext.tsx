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
        waifuPath?: string;
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

    // 设置模型路径
    const setupModelPath = () => {
        if (typeof window !== 'undefined') {
            // 设置waifuPath以确保模型文件路径正确
            window.waifuPath = '/live2d';
            console.log('[Live2D] 设置模型路径:', window.waifuPath);
        }
    };

    // 初始化Live2D模型
    const initializeLive2D = () => {
        try {
            // 设置模型路径
            setupModelPath();

            // 清除localStorage中的modelName，强制使用默认模型
            localStorage.removeItem('modelName');
            console.log('[Live2D] 已清除之前的模型设置');

            if (checkLive2DScriptsLoaded()) {
                // 如果initModel函数存在，调用它
                if (typeof window.initModel === 'function') {
                    console.log('[Live2D] 正在初始化Live2D模型...');

                    // 添加错误监听器捕获JSON解析错误
                    window.addEventListener('error', (event) => {
                        if (event.message.includes('JSON')) {
                            console.error('[Live2D] JSON解析错误:', event);
                        }
                    });

                    // 延迟初始化，确保DOM和资源加载完成
                    setTimeout(() => {
                        try {
                            if (typeof window.initModel === 'function') {
                                window.initModel();
                                console.log('[Live2D] 模型初始化调用完成');
                            } else {
                                console.error('[Live2D] 初始化时找不到initModel函数');
                            }
                        } catch (initError) {
                            console.error('[Live2D] 模型初始化过程出错:', initError);
                        }
                    }, 1500);
                } else {
                    console.error('[Live2D] 找不到Live2D initModel函数');
                }
            } else {
                console.log('[Live2D] 脚本尚未加载，尝试手动加载...');

                // 尝试重新加载脚本
                if (!document.getElementById('live2d-bundle-script')) {
                    console.log('[Live2D] 开始加载Live2D脚本...');
                    const script1 = document.createElement('script');
                    script1.id = 'live2d-bundle-script';
                    script1.src = '/live2d/dist/live2d_bundle.js';
                    script1.onerror = (err) => {
                        console.error('[Live2D] live2d_bundle.js 加载失败:', err);
                    };
                    script1.onload = () => {
                        console.log('[Live2D] live2d_bundle.js 加载成功');

                        const script2 = document.createElement('script');
                        script2.id = 'waifu-tips-script';
                        script2.type = 'module';
                        script2.src = '/live2d/waifu-tips.js';
                        script2.onerror = (err) => {
                            console.error('[Live2D] waifu-tips.js 加载失败:', err);
                        };
                        script2.onload = () => {
                            console.log('[Live2D] waifu-tips.js 加载成功');
                            // 延迟初始化以确保脚本完全执行
                            setTimeout(() => {
                                if (typeof window.initModel === 'function') {
                                    console.log('[Live2D] 开始初始化模型...');
                                    try {
                                        window.initModel();
                                        console.log('[Live2D] 模型初始化完成');
                                    } catch (error) {
                                        console.error('[Live2D] 模型初始化失败:', error);
                                    }
                                } else {
                                    console.error('[Live2D] 加载脚本后仍找不到initModel函数');
                                }
                            }, 1000);
                        };
                        document.body.appendChild(script2);
                    };
                    document.body.appendChild(script1);
                }
            }
        } catch (error) {
            console.error('[Live2D] 初始化过程中出错:', error);
        }
    };

    // 组件挂载时初始化Live2D
    useEffect(() => {
        // 当页面完全加载后执行初始化
        if (document.readyState === 'complete') {
            setTimeout(initializeLive2D, 2000); // 延迟2秒，确保DOM完全渲染
        } else {
            window.addEventListener('load', () => {
                setTimeout(initializeLive2D, 2000);
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