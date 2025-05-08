// 全局变量
let currentPage = 1;
let totalPages = 1;
let logsPerPage = 10;
let currentFilters = {
    productId: '',
    action: '',
    startDate: '',
    endDate: ''
};

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    checkAuth();
    
    // 加载销售人员负责的商品
    loadSalesStaffProducts();
    
    // 初始化日期范围
    initDateRange();
    
    // 加载活动日志
    loadActivityLogs();
});

// 检查用户是否已登录且为销售人员
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
    
    // 检查用户是否为销售人员
    if (user.role !== 'sales' && user.role !== 'seller' && user.role !== 'salesStaff') {
        alert('您无权访问此页面');
        window.location.href = 'index.html';
        return;
    }
}

// 初始化日期范围
function initDateRange() {
    const dateRange = document.getElementById('date-range');
    const dateRangeValue = dateRange.value;
    
    if (dateRangeValue === 'custom') {
        document.getElementById('custom-date-inputs').style.display = 'flex';
    } else {
        document.getElementById('custom-date-inputs').style.display = 'none';
        
        // 设置默认日期范围
        const { startDate, endDate } = getDateRangeFromPreset(dateRangeValue);
        currentFilters.startDate = startDate;
        currentFilters.endDate = endDate;
    }
}

// 根据预设获取日期范围
function getDateRangeFromPreset(preset) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const endDate = today.toISOString().split('T')[0];
    
    let startDate;
    
    switch (preset) {
        case 'today':
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            startDate = todayStart.toISOString().split('T')[0];
            break;
        case 'yesterday':
            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);
            startDate = yesterdayStart.toISOString().split('T')[0];
            
            const yesterdayEnd = new Date();
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);
            endDate = yesterdayEnd.toISOString().split('T')[0];
            break;
        case '7days':
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            startDate = sevenDaysAgo.toISOString().split('T')[0];
            break;
        case '30days':
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            startDate = thirtyDaysAgo.toISOString().split('T')[0];
            break;
        default:
            const defaultStart = new Date();
            defaultStart.setDate(defaultStart.getDate() - 7);
            defaultStart.setHours(0, 0, 0, 0);
            startDate = defaultStart.toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
}

// 切换自定义日期输入
function toggleCustomDateInputs() {
    const dateRange = document.getElementById('date-range');
    const customDateInputs = document.getElementById('custom-date-inputs');
    
    if (dateRange.value === 'custom') {
        customDateInputs.style.display = 'flex';
        
        // 设置默认值为最近7天
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        document.getElementById('start-date').valueAsDate = sevenDaysAgo;
        document.getElementById('end-date').valueAsDate = new Date();
    } else {
        customDateInputs.style.display = 'none';
        
        // 更新日期范围
        const { startDate, endDate } = getDateRangeFromPreset(dateRange.value);
        currentFilters.startDate = startDate;
        currentFilters.endDate = endDate;
        
        // 重新加载日志
        loadActivityLogs();
    }
}

// 加载销售人员负责的商品
async function loadSalesStaffProducts() {
    try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        const response = await fetch(`/sales-staff/${userId}/products`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取负责商品失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取负责商品失败');
        }
        
        // 更新商品筛选器
        updateProductFilter(data.products);
    } catch (error) {
        console.error('加载销售人员商品出错:', error);
        showNotification('加载负责商品失败', 'error');
    }
}

// 更新商品筛选器
function updateProductFilter(products) {
    const productFilter = document.getElementById('product-filter');
    
    // 清空现有选项（保留默认选项）
    productFilter.innerHTML = '<option value="">所有商品</option>';
    
    if (!products || products.length === 0) {
        return;
    }
    
    // 按名称字母顺序排序
    products.sort((a, b) => a.name.localeCompare(b.name));
    
    // 添加所有商品选项
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        productFilter.appendChild(option);
    });
}

// 筛选日志
function filterLogs(event) {
    event.preventDefault();
    
    const productId = document.getElementById('product-filter').value;
    const action = document.getElementById('action-filter').value;
    const dateRange = document.getElementById('date-range').value;
    
    let startDate, endDate;
    
    if (dateRange === 'custom') {
        startDate = document.getElementById('start-date').value;
        endDate = document.getElementById('end-date').value;
        
        if (!startDate || !endDate) {
            alert('请选择开始和结束日期');
            return;
        }
    } else {
        const dates = getDateRangeFromPreset(dateRange);
        startDate = dates.startDate;
        endDate = dates.endDate;
    }
    
    // 更新当前筛选器
    currentFilters = {
        productId,
        action,
        startDate,
        endDate
    };
    
    // 重置为第一页
    currentPage = 1;
    
    // 重新加载日志
    loadActivityLogs();
}

// 加载活动日志
async function loadActivityLogs() {
    try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        // 构建查询参数
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: logsPerPage,
            startDate: currentFilters.startDate,
            endDate: currentFilters.endDate
        });
        
        if (currentFilters.productId) {
            queryParams.append('productId', currentFilters.productId);
        }
        
        if (currentFilters.action) {
            queryParams.append('action', currentFilters.action);
        }
        
        const response = await fetch(`/sales-staff/${userId}/activity-logs?${queryParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取活动日志失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取活动日志失败');
        }
        
        // 更新分页信息
        totalPages = Math.ceil(data.total / logsPerPage);
        
        // 显示日志数据
        displayActivityLogs(data.logs);
        
        // 更新分页控件
        updatePagination();
        
        // 更新活动统计
        updateActivityStats(data.stats);
    } catch (error) {
        console.error('加载活动日志出错:', error);
        showNotification('加载活动日志失败', 'error');
        document.getElementById('logs-body').innerHTML = '<tr><td colspan="6">加载活动日志失败</td></tr>';
    }
}

// 显示活动日志
function displayActivityLogs(logs) {
    const logsBody = document.getElementById('logs-body');
    
    if (!logs || logs.length === 0) {
        logsBody.innerHTML = '<tr><td colspan="6" class="no-logs">无匹配的活动记录</td></tr>';
        return;
    }
    
    logsBody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        
        // 格式化日期时间
        const logDate = new Date(log.createdAt);
        const formattedDate = `${logDate.getFullYear()}-${(logDate.getMonth() + 1).toString().padStart(2, '0')}-${logDate.getDate().toString().padStart(2, '0')} ${logDate.getHours().toString().padStart(2, '0')}:${logDate.getMinutes().toString().padStart(2, '0')}`;
        
        // 活动类型标签样式
        let actionTag, actionText;
        switch (log.action) {
            case 'view':
                actionTag = 'view-tag';
                actionText = '浏览';
                break;
            case 'add_to_cart':
                actionTag = 'cart-tag';
                actionText = '加入购物车';
                break;
            case 'purchase':
                actionTag = 'purchase-tag';
                actionText = '购买';
                break;
            default:
                actionTag = '';
                actionText = log.action;
        }
        
        // 显示详情按钮（仅当有订单ID或购物车ID时）
        let detailsButton = '';
        if (log.orderId) {
            detailsButton = `<button onclick="viewOrderDetails(${log.orderId})">查看订单</button>`;
        } else if (log.cartId) {
            detailsButton = `<button onclick="viewCartDetails(${log.cartId})">查看购物车</button>`;
        }
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${log.user ? log.user.username : '访客'}</td>
            <td>${log.product ? log.product.name : '未知商品'}</td>
            <td><span class="action-tag ${actionTag}">${actionText}</span></td>
            <td>${log.referrer || '直接访问'}</td>
            <td>${detailsButton}</td>
        `;
        
        logsBody.appendChild(row);
    });
}

// 更新分页控件
function updatePagination() {
    const paginationControls = document.getElementById('pagination-controls');
    
    if (totalPages <= 1) {
        paginationControls.style.display = 'none';
        return;
    }
    
    paginationControls.style.display = 'flex';
    paginationControls.innerHTML = '';
    
    // 上一页按钮
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadActivityLogs();
        }
    });
    paginationControls.appendChild(prevButton);
    
    // 页码按钮
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.addEventListener('click', () => {
            currentPage = i;
            loadActivityLogs();
        });
        paginationControls.appendChild(pageButton);
    }
    
    // 下一页按钮
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadActivityLogs();
        }
    });
    paginationControls.appendChild(nextButton);
}

// 更新活动统计
function updateActivityStats(stats) {
    document.getElementById('total-views').textContent = stats.viewCount || 0;
    document.getElementById('total-carts').textContent = stats.cartCount || 0;
    document.getElementById('total-purchases').textContent = stats.purchaseCount || 0;
    
    // 计算转化率
    let conversionRate = 0;
    if (stats.viewCount > 0 && stats.purchaseCount > 0) {
        conversionRate = (stats.purchaseCount / stats.viewCount * 100).toFixed(2);
    }
    
    document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
}

// 查看订单详情
function viewOrderDetails(orderId) {
    window.location.href = `orderDetails.html?id=${orderId}`;
}

// 查看购物车详情
function viewCartDetails(cartId) {
    // 实现购物车详情查看逻辑
    alert(`购物车ID: ${cartId} 的详情功能正在开发中`);
}

// 显示通知
function showNotification(message, type = 'info') {
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