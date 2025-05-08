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
    
    // 检查用户角色并设置相应的界面
    if (user.role === 'admin') {
        document.body.classList.add('role-admin');
        document.getElementById('dashboard-title').textContent = '管理员控制面板';
        loadAdminSummary();
    } else if (user.role === 'sales' || user.role === 'seller' || user.role === 'salesStaff') {
        document.body.classList.add('role-sales');
        document.getElementById('dashboard-title').textContent = '销售管理面板';
        loadSalesSummary(user.id); // 直接传递用户ID
    } else {
        alert('您无权访问此页面');
        window.location.href = 'index.html';
        return;
    }
    
    // 显示用户名
    if (user.username) {
        document.getElementById('user-name').textContent = user.username;
        document.getElementById('username').textContent = user.username;
    }
}

// 显示当前日期
function displayCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', options);
}

// 加载管理员概览数据
function loadAdminSummary() {
    const token = localStorage.getItem('token');
    
    fetch('http://localhost:3000/admin/dashboard/summary', {
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
            document.getElementById('total-users').textContent = data.summary.totalUsers || 0;
            document.getElementById('total-sales-staff').textContent = data.summary.totalSalesStaff || 0;
            document.getElementById('today-orders').textContent = data.summary.todayOrders || 0;
            document.getElementById('today-sales').textContent = '¥' + (data.summary.todaySales || 0).toFixed(2);
        } else {
            throw new Error(data.message || '获取管理员概览失败');
        }
    })
    .catch(error => {
        console.error('加载管理员概览出错:', error);
        document.getElementById('total-users').textContent = '获取失败';
        document.getElementById('total-sales-staff').textContent = '获取失败';
        document.getElementById('today-orders').textContent = '获取失败';
        document.getElementById('today-sales').textContent = '获取失败';
    });
}

// 加载销售摘要数据
function loadSalesSummary(userId) {
    const token = localStorage.getItem('token');
    
    // 确保有用户ID
    if (!userId) {
        userId = localStorage.getItem('userId');
        if (!userId) {
            console.error('用户ID未找到');
            document.getElementById('summary-stats').innerHTML = '<p>无法加载销售摘要数据 - 用户ID未找到</p>';
            return;
        }
    }
    
    console.log('加载销售摘要，用户ID:', userId); // 调试信息
    
    fetch(`http://localhost:3000/sales-staff/${userId}/summary`, {
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
        document.getElementById('summary-stats').innerHTML = '<p>无法加载销售摘要数据</p>';
    });
}

// 显示销售摘要数据
function displaySalesSummary(summary) {
    const summaryStats = document.getElementById('summary-stats');
    
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