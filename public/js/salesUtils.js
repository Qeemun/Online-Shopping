/**
 * 销售工具类
 * 提供销售管理相关的通用功能
 */
class SalesUtils {
    /**
     * 检查用户是否已登录，并验证角色权限
     * @param {Array} allowedRoles - 允许的角色数组，例如 ['sales', 'admin']
     * @returns {boolean} - 权限验证结果
     */
    checkAuthAndPermission(allowedRoles = ['sales', 'admin']) {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        // 检查是否已登录
        if (!user || !token) {
            alert('请先登录');
            window.location.href = 'login.html';
            return false;
        }
        
        // 验证角色权限
        if (!allowedRoles.includes(user.role)) {
            alert('您没有权限访问此页面');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }
    
    /**
     * 获取指定日期范围内的销售数据
     * @param {string} startDate - 开始日期，格式为 YYYY-MM-DD
     * @param {string} endDate - 结束日期，格式为 YYYY-MM-DD
     * @param {number} categoryId - 商品类别ID，可选
     * @returns {Promise} - 返回销售数据的Promise
     */
    async getSalesData(startDate, endDate, categoryId = null) {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (categoryId) params.append('categoryId', categoryId);
            
            const response = await fetch(`http://localhost:3000/api/sales/data?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('获取销售数据失败:', error);
            return null;
        }
    }
    
    /**
     * 获取指定类别或产品的库存信息
     * @param {number} categoryId - 商品类别ID，可选
     * @param {number} productId - 商品ID，可选
     * @returns {Promise} - 返回库存数据的Promise
     */
    async getInventoryData(categoryId = null, productId = null) {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const params = new URLSearchParams();
            if (categoryId) params.append('categoryId', categoryId);
            if (productId) params.append('productId', productId);
            
            const response = await fetch(`http://localhost:3000/api/products/inventory?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('获取库存数据失败:', error);
            return null;
        }
    }
    
    /**
     * 生成指定日期范围内的销售报表
     * @param {string} startDate - 开始日期，格式为 YYYY-MM-DD
     * @param {string} endDate - 结束日期，格式为 YYYY-MM-DD
     * @param {string} reportType - 报表类型，可选值: 'daily', 'weekly', 'monthly'
     * @param {number} categoryId - 商品类别ID，可选
     * @returns {Promise} - 返回报表数据的Promise
     */
    async generateSalesReport(startDate, endDate, reportType = 'daily', categoryId = null) {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('reportType', reportType);
            if (categoryId) params.append('categoryId', categoryId);
            
            const response = await fetch(`http://localhost:3000/api/sales/reports?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('生成销售报表失败:', error);
            return null;
        }
    }
    
    /**
     * 按类别统计销售业绩
     * @param {string} startDate - 开始日期，格式为 YYYY-MM-DD
     * @param {string} endDate - 结束日期，格式为 YYYY-MM-DD
     * @returns {Promise} - 返回按类别统计的销售数据
     */
    async getSalesByCategory(startDate, endDate) {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await fetch(`http://localhost:3000/api/sales/by-category?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('获取类别销售统计失败:', error);
            return null;
        }
    }
    
    /**
     * 获取销售人员负责的商品类别
     * @param {number} salesId - 销售人员ID，如果不提供则使用当前登录用户的ID
     * @returns {Promise} - 返回销售人员负责的类别列表
     */
    async getSalesAssignedCategories(salesId = null) {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const id = salesId || user.id;
            
            const response = await fetch(`http://localhost:3000/api/sales/assigned-categories/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('获取销售人员负责类别失败:', error);
            return null;
        }
    }
    
    /**
     * 格式化日期为 YYYY-MM-DD 格式
     * @param {Date} date - 日期对象
     * @returns {string} - 格式化后的日期字符串
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * 格式化日期时间
     * @param {string} dateString - 日期字符串
     * @returns {string} - 格式化后的日期时间
     */
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    /**
     * 格式化金额，添加千位分隔符，保留两位小数
     * @param {number} amount - 金额
     * @returns {string} - 格式化后的金额字符串
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY'
        }).format(amount);
    }
    
    /**
     * 生成过去N天的日期数组，用于图表显示
     * @param {number} days - 天数
     * @returns {Array} - 日期数组，格式为 MM-DD
     */
    generatePastDays(days) {
        const result = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            result.push(`${month}-${day}`);
        }
        
        return result;
    }
    
    /**
     * 显示通知消息
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
}