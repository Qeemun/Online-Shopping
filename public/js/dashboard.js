/**
 * dashboard.js - 统一管理面板控制脚本
 * 为管理员和销售人员提供统一的仪表板功能
 */

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    checkAuth();
    
    // 显示当前日期
    displayCurrentDate();
});

// 检查用户是否已登录
function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(userStr);
    console.log('当前用户角色:', user.role); // 调试信息
    
    // 默认隐藏所有面板
    const adminElements = ['admin-dashboard', 'admin-summary'];
    const salesElements = ['sales-dashboard', 'sales-summary-container'];
    
    try {
        // 检查用户角色并设置相应的界面
        if (user.role === 'admin') {
            document.body.classList.add('role-admin');
            
            // 设置标题
            const dashboardTitle = document.getElementById('dashboard-title');
            if (dashboardTitle) dashboardTitle.textContent = '管理员控制面板';
            
            // 显示管理员界面，隐藏销售人员界面
            adminElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.style.display = 'block';
            });
            
            salesElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.style.display = 'none';
            });
            
            loadAdminSummary();
        } 
        else if (user.role === 'sales' || user.role === 'seller' || user.role === 'salesStaff') {
            document.body.classList.add('role-sales');
            
            // 设置标题
            const dashboardTitle = document.getElementById('dashboard-title');
            if (dashboardTitle) dashboardTitle.textContent = '销售管理面板';
            
            // 显示销售人员界面，隐藏管理员界面
            salesElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.style.display = 'block';
            });
            
            adminElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.style.display = 'none';
            });
            
            loadSalesSummary(user.id); // 直接传递用户ID
        } 
        else {
            alert('您无权访问此页面');
            window.location.href = 'index.html';
            return;
        }
        
        // 显示用户名
        if (user.username) {
            const userNameElement = document.getElementById('user-name');
            const usernameElement = document.getElementById('username');
            
            if (userNameElement) userNameElement.textContent = user.username;
            if (usernameElement) usernameElement.textContent = user.username;
        }
    } catch (error) {
        console.error('设置面板时出错:', error);
    }
}

// 显示当前日期
function displayCurrentDate() {
    try {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('zh-CN', options);
        }
    } catch (error) {
        console.error('显示日期时出错:', error);
    }
}

// 加载管理员概览数据
function loadAdminSummary() {
    const token = localStorage.getItem('token');
    
    fetch('http://localhost:3000/api/admin/dashboard/summary', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取管理员概览失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateDashboardStats('total-users', data.summary.totalUsers || 0);
            updateDashboardStats('total-sales-staff', data.summary.totalSalesStaff || 0);
            updateDashboardStats('today-orders', data.summary.todayOrders || 0);
            updateDashboardStats('today-sales', '¥' + (data.summary.todaySales || 0).toFixed(2));
        } else {
            throw new Error(data.message || '获取管理员概览失败');
        }
    })
    .catch(error => {
        console.error('加载管理员概览出错:', error);
        updateDashboardStats('total-users', '获取失败');
        updateDashboardStats('total-sales-staff', '获取失败');
        updateDashboardStats('today-orders', '获取失败');
        updateDashboardStats('today-sales', '获取失败');
    });
}

// 安全更新仪表板统计信息
function updateDashboardStats(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// 加载销售摘要数据
function loadSalesSummary(userId) {
    const token = localStorage.getItem('token');
    
    // 确保有用户ID
    if (!userId) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userId = user.id;
        if (!userId) {
            console.error('用户ID未找到');
            const summaryStats = document.getElementById('summary-stats');
            if (summaryStats) {
                summaryStats.innerHTML = '<p>无法加载销售摘要数据 - 用户ID未找到</p>';
            }
            return;
        }
    }
    
    console.log('加载销售摘要，用户ID:', userId); // 调试信息
    
    // 更新API路径 - 使用/api前缀
    fetch(`http://localhost:3000/api/sales/my-summary`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取销售摘要失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            displaySalesSummary(data.summary);
        } else {
            throw new Error(data.message || '获取销售摘要失败');
        }
    })
    .catch(error => {
        console.error('加载销售摘要出错:', error);
        const summaryStats = document.getElementById('summary-stats');
        if (summaryStats) {
            summaryStats.innerHTML = '<p>无法加载销售摘要数据</p>';
        }
    });
}

// 显示销售摘要数据
function displaySalesSummary(summary) {
    const summaryStats = document.getElementById('summary-stats');
    if (!summaryStats) {
        console.error('未找到summary-stats元素');
        return;
    }
    
    // 确保summary对象存在并包含所需属性
    if (!summary) {
        summaryStats.innerHTML = '<p>收到的销售摘要数据为空</p>';
        return;
    }
    
    const todayRevenue = summary.todayRevenue || 0;
    const monthRevenue = summary.monthRevenue || 0;
    const productCount = summary.productCount || 0;
    const pendingOrders = summary.pendingOrders || 0;
    
    summaryStats.innerHTML = `
        <div class="stat-card">
            <div class="label">今日销售额</div>
            <div class="value">¥${todayRevenue.toFixed(2)}</div>
        </div>
        <div class="stat-card">
            <div class="label">本月销售额</div>
            <div class="value">¥${monthRevenue.toFixed(2)}</div>
        </div>
        <div class="stat-card">
            <div class="label">负责商品数</div>
            <div class="value">${productCount}</div>
        </div>
        <div class="stat-card">
            <div class="label">待处理订单</div>
            <div class="value">${pendingOrders}</div>
        </div>
    `;
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}