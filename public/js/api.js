// API路径配置
const API_BASE_URL = 'http://localhost:3000';

// 用户相关API
const userApi = {
    register: `${API_BASE_URL}/users/register`,
    login: `${API_BASE_URL}/users/login`,
    logout: `${API_BASE_URL}/users/logout`,
    profile: `${API_BASE_URL}/users/profile/details`,
    updateProfile: `${API_BASE_URL}/users/profile`,
    updateFavoriteCategory: `${API_BASE_URL}/users/profile/favorite-category`,
    sessionLogs: `${API_BASE_URL}/users/session-logs`,
    stats: `${API_BASE_URL}/users/stats`
};

// 产品相关API
const productApi = {
    list: `${API_BASE_URL}/products`,
    details: (id) => `${API_BASE_URL}/products/${id}`,
    create: `${API_BASE_URL}/products`,
    update: (id) => `${API_BASE_URL}/products/${id}`,
    delete: (id) => `${API_BASE_URL}/products/${id}`,
    category: (category) => `${API_BASE_URL}/products/category/${category}`
};

// 购物车相关API
const cartApi = {
    list: `${API_BASE_URL}/cart`,
    add: `${API_BASE_URL}/cart`,
    update: `${API_BASE_URL}/cart`,
    remove: `${API_BASE_URL}/cart`
};

// 订单相关API
const orderApi = {
    create: `${API_BASE_URL}/orders`,
    list: `${API_BASE_URL}/orders`,
    details: (id) => `${API_BASE_URL}/orders/${id}`,
    update: (id) => `${API_BASE_URL}/orders/${id}`
};

// 用户活动日志API
const activityApi = {
    userLogs: (userId) => `${API_BASE_URL}/user-activity/customers/${userId}/logs`,
    addLog: `${API_BASE_URL}/user-activity/logs`,
    productStats: (productId) => `${API_BASE_URL}/user-activity/products/${productId}/stats`
};

// 管理员日志API
const adminLogApi = {
    list: `${API_BASE_URL}/api/admin-logs/logs`,
    stats: `${API_BASE_URL}/api/admin-logs/stats`,
    cleanup: `${API_BASE_URL}/api/admin-logs/cleanup`
};

// 推荐系统API
const recommendationApi = {
    userRecommendations: `${API_BASE_URL}/recommendations/mine`,
    similarProducts: (productId) => `${API_BASE_URL}/recommendations/similar/${productId}`,
    popularProducts: `${API_BASE_URL}/recommendations/popular`
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
    const userId = JSON.parse(localStorage.getItem('user'))?.id;
    if (!userId || !productId) return;

    return fetchApi(api.activity.addLog, {
        method: 'POST',
        body: JSON.stringify({
            userId,
            productId,
            durationSeconds
        })
    }).catch(err => console.error('记录产品停留时间失败:', err));
}