// API路径配置
const API_BASE_URL = 'http://localhost:3000';

// 用户相关API
const userApi = {
    register: `${API_BASE_URL}/api/users/register`,
    login: `${API_BASE_URL}/api/users/login`,
    logout: `${API_BASE_URL}/api/users/logout`,
    profile: `${API_BASE_URL}/api/users/profile/details`,
    updateProfile: `${API_BASE_URL}/api/users/profile`,
    updateFavoriteCategory: `${API_BASE_URL}/api/users/profile/favorite-category`,
    sessionLogs: `${API_BASE_URL}/api/users/session-logs`,
    stats: `${API_BASE_URL}/api/users/stats`
};

// 产品相关API
const productApi = {
    list: `${API_BASE_URL}/api/products`,
    details: (id) => `${API_BASE_URL}/api/products/${id}`,
    create: `${API_BASE_URL}/api/products`,
    update: (id) => `${API_BASE_URL}/api/products/${id}`,
    delete: (id) => `${API_BASE_URL}/api/products/${id}`,
    category: (category) => `${API_BASE_URL}/api/products/category/${category}`
};

// 购物车相关API
const cartApi = {
    list: `${API_BASE_URL}/api/cart`,
    add: `${API_BASE_URL}/api/cart`,
    update: `${API_BASE_URL}/api/cart`,
    remove: `${API_BASE_URL}/api/cart`
};

// 订单相关API
const orderApi = {
    create: `${API_BASE_URL}/api/orders`,
    list: `${API_BASE_URL}/api/orders`,
    details: (id) => `${API_BASE_URL}/api/orders/${id}`,
    update: (id) => `${API_BASE_URL}/api/orders/${id}`
};

// 用户活动日志API - 使用用户路由下的activity-logs接口
const activityApi = {
    userLogs: (userId) => `${API_BASE_URL}/api/users/${userId}/activity-logs`,
    addLog: `${API_BASE_URL}/api/users/activity-logs`,  // 恢复正确的API路径
    productStats: (productId) => `${API_BASE_URL}/api/products/${productId}/stats`
};

// 管理员日志API
const adminLogApi = {
    list: `${API_BASE_URL}/api/admin-logs/logs`,
    stats: `${API_BASE_URL}/api/admin-logs/stats`,
    cleanup: `${API_BASE_URL}/api/admin-logs/cleanup`
};

// 推荐系统API
const recommendationApi = {
    userRecommendations: `${API_BASE_URL}/api/recommendations/mine`,
    similarProducts: (productId) => `${API_BASE_URL}/api/recommendations/similar/${productId}`,
    popularProducts: `${API_BASE_URL}/api/recommendations/popular`
};

// 通用请求函数
async function fetchApi(url, options = {}) {
    // 默认选项
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // 添加认证令牌（如果存在）
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers.Authorization = `Bearer ${token}`;
    }

    // 合并选项
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 导出API
const api = {
    user: userApi,
    product: productApi,
    cart: cartApi,
    order: orderApi,
    activity: activityApi,
    adminLog: adminLogApi,
    recommendation: recommendationApi,
    fetch: fetchApi
};

// 记录用户停留时间
function logProductViewDuration(productId, durationSeconds) {
    const user = localStorage.getItem('user');
    // 如果用户未登录或没有产品ID，不记录活动
    if (!user || !productId) return Promise.resolve();

    try {
        const userData = JSON.parse(user);
        const userId = userData?.id;
        if (!userId) return Promise.resolve();

        console.log('准备发送浏览记录:', {userId, productId, durationSeconds});
        
        // 使用表单数据发送请求
        return fetch(api.activity.addLog, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId,
                productId,
                durationSeconds
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('浏览记录已保存:', data);
            return data;
        })
        .catch(err => {
            console.error('记录产品停留时间失败:', err);
            // 返回已解决的Promise以避免未处理的拒绝
            return Promise.resolve();
        });
    } catch (e) {
        console.error('解析用户信息失败:', e);
        return Promise.resolve();
    }
}