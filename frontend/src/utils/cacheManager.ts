// 缓存管理工具
// 集中管理所有浏览器本地缓存

// 需要缓存的键列表
const CACHE_KEYS = [
  'token',
  'username',
  'userKeyPair',
  'encryptionKey',
  // 添加其他需要缓存的键
];

// 内存中的缓存
let memoryCache: Record<string, any> = {};

// 定义存储事件名
const STORAGE_EVENT_NAME = 'app_cache_update';

/**
 * 保存数据到缓存
 * @param key 缓存键
 * @param value 缓存值
 */
export const setCache = (key: string, value: any): void => {
  // 存储到localStorage
  if (typeof value === 'object') {
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    localStorage.setItem(key, String(value));
  }
  
  // 同时更新内存缓存
  memoryCache[key] = value;
  
  // 触发自定义事件，通知其他标签页
  dispatchStorageEvent(key, value);
  
  console.log(`[CacheManager] 数据已缓存: ${key}`);
};

/**
 * 从缓存获取数据
 * @param key 缓存键
 * @param defaultValue 默认值（如果缓存不存在）
 */
export const getCache = <T>(key: string, defaultValue: T | null = null): T | null => {
  // 先检查内存缓存
  if (memoryCache[key] !== undefined) {
    return memoryCache[key] as T;
  }
  
  // 如果内存缓存没有，尝试从localStorage获取
  const value = localStorage.getItem(key);
  
  if (value === null) {
    return defaultValue;
  }
  
  try {
    // 尝试解析为JSON对象
    const parsed = JSON.parse(value);
    // 更新内存缓存
    memoryCache[key] = parsed;
    return parsed as T;
  } catch (e) {
    // 如果不是JSON，则直接返回字符串
    memoryCache[key] = value;
    return value as unknown as T;
  }
};

/**
 * 移除特定缓存
 * @param key 缓存键
 */
export const removeCache = (key: string): void => {
  localStorage.removeItem(key);
  delete memoryCache[key];
  
  // 触发自定义事件，通知其他标签页
  dispatchStorageEvent(key, null);
  
  console.log(`[CacheManager] 缓存已移除: ${key}`);
};

/**
 * 清除所有缓存
 */
export const clearAllCache = (): void => {
  // 清除localStorage中的所有缓存键
  CACHE_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 重置内存缓存
  memoryCache = {};
  
  // 触发清除所有缓存的事件
  dispatchStorageEvent('all', null);
  
  console.log('[CacheManager] 所有缓存已清除');
};

/**
 * 在登录时重置缓存
 * 保留username，清除其他缓存
 */
export const resetCacheOnLogin = (username: string): void => {
  // 清除除username外的所有缓存
  CACHE_KEYS.forEach(key => {
    if (key !== 'username') {
      localStorage.removeItem(key);
      delete memoryCache[key];
    }
  });
  
  // 设置用户名
  setCache('username', username);
  
  // 触发登录重置事件
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, {
    detail: { action: 'reset_login', username }
  }));
  
  console.log('[CacheManager] 登录缓存已重置');
};

/**
 * 在页面加载时初始化内存缓存
 */
export const initializeCache = (): void => {
  // 从localStorage加载所有缓存到内存
  CACHE_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        memoryCache[key] = JSON.parse(value);
      } catch (e) {
        memoryCache[key] = value;
      }
    }
  });
  
  // 添加storage事件监听器，支持跨标签页同步
  window.addEventListener('storage', handleStorageChange);
  
  // 添加自定义事件监听器，支持同一页面不同组件间同步
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomStorageEvent);
  
  console.log('[CacheManager] 缓存已初始化');
};

/**
 * 销毁缓存管理器，移除事件监听器
 */
export const destroyCache = (): void => {
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener(STORAGE_EVENT_NAME, handleCustomStorageEvent);
  console.log('[CacheManager] 缓存管理器已销毁');
};

/**
 * 处理localStorage变化的事件
 */
function handleStorageChange(event: StorageEvent): void {
  if (!event.key || !CACHE_KEYS.includes(event.key)) {
    return;
  }
  
  if (event.newValue === null) {
    // 值被删除
    delete memoryCache[event.key];
  } else {
    // 值被更新
    try {
      memoryCache[event.key] = JSON.parse(event.newValue);
    } catch (e) {
      memoryCache[event.key] = event.newValue;
    }
  }
  
  console.log(`[CacheManager] 从其他标签页更新缓存: ${event.key}`);
}

/**
 * 处理自定义存储事件
 */
function handleCustomStorageEvent(event: Event): void {
  const customEvent = event as CustomEvent;
  if (!customEvent.detail) return;
  
  const { action, key, value } = customEvent.detail;
  
  if (action === 'reset_login') {
    // 重置登录缓存不在此处理，避免循环
    return;
  }
  
  if (key && CACHE_KEYS.includes(key)) {
    if (value === null) {
      delete memoryCache[key];
    } else {
      memoryCache[key] = value;
    }
    
    console.log(`[CacheManager] 从自定义事件更新缓存: ${key}`);
  }
}

/**
 * 触发存储事件
 */
function dispatchStorageEvent(key: string, value: any): void {
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, {
    detail: { key, value }
  }));
} 