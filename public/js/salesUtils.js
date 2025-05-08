/**
 * 通用工具函数库 - 用于销售相关页面
 */

// 用户验证相关
const AuthUtils = {
    /**
     * 检查用户是否已登录且为销售人员
     * @param {Array} allowedRoles - 允许的角色数组
     * @param {string} redirectUrl - 权限不足时重定向的URL
     */
    checkAuth(allowedRoles = ['sales', 'seller', 'salesStaff'], redirectUrl = 'login.html') {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
            alert('请先登录');
            window.location.href = 'login.html';
            return false;
        }
        
        const user = JSON.parse(userStr);
        console.log('当前用户角色:', user.role); // 调试信息
        
        // 检查用户是否具有所需权限
        if (!allowedRoles.includes(user.role)) {
            alert('您无权访问此页面');
            window.location.href = redirectUrl;
            return false;
        }
        
        return user; // 返回用户对象方便调用者使用
    },
    
    /**
     * 退出登录
     */
    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
};

// 日期处理相关
const DateUtils = {
    /**
     * 初始化日期范围
     * @param {number} days - 天数
     * @returns {{startDate: Date, endDate: Date}} 起止日期对象
     */
    initializeDateRange(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        return { startDate, endDate };
    },
    
    /**
     * 格式化日期为YYYY-MM-DD
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    /**
     * 格式化日期时间
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期时间
     */
    formatDateTime(dateString) {
        if (!dateString) return '未知';
        
        const date = new Date(dateString);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },
    
    /**
     * 获取日期范围参数
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Object} 日期范围参数对象
     */
    getDateRangeParams(startDate, endDate) {
        return {
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate)
        };
    }
};

// UI相关工具
const UIUtils = {
    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型: success, error, info
     */
    showNotification(message, type = 'info') {
        // 创建通知容器（如果不存在）
        let notificationContainer = document.getElementById('notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '1000';
            document.body.appendChild(notificationContainer);
        }
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3';
        notification.style.color = 'white';
        notification.style.padding = '15px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.transition = 'opacity 0.5s';
        notification.textContent = message;
        
        // 添加到容器
        notificationContainer.appendChild(notification);
        
        // 3秒后移除通知
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
};

// API请求工具
const ApiUtils = {
    /**
     * 进行API请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise} 请求结果Promise
     */
    async request(url, options = {}) {
        // 默认添加token认证
        const token = localStorage.getItem('token');
        if (token && !options.headers) {
            options.headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } else if (token && options.headers && !options.headers['Authorization']) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '请求处理失败');
            }
            
            return data;
        } catch (error) {
            console.error('API请求出错:', error);
            UIUtils.showNotification(error.message, 'error');
            throw error;
        }
    },
    
    /**
     * 获取用户ID
     * @returns {string|null} 用户ID
     */
    getUserId() {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        
        try {
            const user = JSON.parse(userStr);
            return user.id;
        } catch (e) {
            return null;
        }
    }
};

// 图表工具
const ChartUtils = {
    /**
     * 创建或更新图表
     * @param {string} canvasId - Canvas元素ID
     * @param {Object} chartInstance - 现有图表实例(如果有)
     * @param {Object} config - 图表配置
     * @returns {Object} 图表实例
     */
    createOrUpdateChart(canvasId, chartInstance, config) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // 销毁旧图表（如果存在）
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // 创建新图表
        return new Chart(ctx, config);
    }
};