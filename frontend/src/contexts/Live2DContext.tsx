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
            typeof window.live2dv4 !== 'undefined'
            // 不再检查initModel，因为它可能在window.live2dv2/live2dv4之后定义
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

            // 尝试直接查找initModel函数
            if (typeof window.initModel === 'function') {
                console.log('[Live2D] 找到initModel函数，正在初始化...');
                try {
                    window.initModel();
                    console.log('[Live2D] 模型初始化调用完成');
                } catch (error) {
                    console.error('[Live2D] 模型初始化直接调用出错:', error);
                    loadLive2DScripts(); // 如果直接调用失败，尝试重新加载脚本
                }
                return;
            }

            // 如果initModel不存在，检查Live2D脚本是否已加载
            if (checkLive2DScriptsLoaded()) {
                console.log('[Live2D] Live2D脚本已加载，但initModel未定义，等待脚本完全初始化...');

                // 等待一段时间后再次检查
                setTimeout(() => {
                    if (typeof window.initModel === 'function') {
                        console.log('[Live2D] 延迟后找到initModel函数，正在初始化...');
                        try {
                            window.initModel();
                        } catch (error) {
                            console.error('[Live2D] 延迟初始化出错:', error);
                        }
                    } else {
                        console.error('[Live2D] 延迟后仍未找到initModel函数，尝试重新加载脚本');
                        loadLive2DScripts();
                    }
                }, 2000);
            } else {
                console.log('[Live2D] Live2D脚本未加载，开始加载脚本...');
                loadLive2DScripts();
            }
        } catch (error) {
            console.error('[Live2D] 初始化过程中出错:', error);
        }
    };

    // 加载Live2D相关脚本
    const loadLive2DScripts = () => {
        try {
            if (!document.getElementById('live2d-bundle-script')) {
                console.log('[Live2D] 开始加载Live2D脚本...');

                // 移除可能已存在的脚本元素
                const oldScript1 = document.getElementById('live2d-bundle-script');
                const oldScript2 = document.getElementById('waifu-tips-script');
                if (oldScript1) oldScript1.remove();
                if (oldScript2) oldScript2.remove();

                // 加载bundle脚本
                const script1 = document.createElement('script');
                script1.id = 'live2d-bundle-script';
                script1.src = '/live2d/dist/live2d_bundle.js';
                script1.onerror = (err) => {
                    console.error('[Live2D] live2d_bundle.js 加载失败:', err);
                };
                script1.onload = () => {
                    console.log('[Live2D] live2d_bundle.js 加载成功');

                    // 加载tips脚本
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
                                console.log('[Live2D] 脚本加载后找到initModel函数，开始初始化...');
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
        } catch (error) {
            console.error('[Live2D] 加载脚本过程中出错:', error);
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