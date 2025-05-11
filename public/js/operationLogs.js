/**
 * 操作日志页面脚本
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 初始化销售工具类
        const salesUtils = new SalesUtils();
        
        // 检查用户登录状态和权限
        salesUtils.checkAuthAndPermission(['admin']);
        
        // 获取当前用户信息并显示
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            document.getElementById('current-user').textContent = `${user.username} (${user.role})`;
        }
        
        // 初始化侧边栏菜单权限
        setupSidebarByRole();
        
        // 初始化日志页面功能
        initLogPage();
    } catch (error) {
        console.error('初始化页面时出错:', error);
        alert('加载页面时出错，请重新登录');
        window.location.href = 'login.html?redirect=operationLogs.html';
    }
});

/**
 * 根据用户角色设置侧边栏菜单
 */
function setupSidebarByRole() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // 管理员可以查看所有菜单
    if (user.role === 'admin') {
        document.getElementById('sales-staff-mgmt').style.display = 'block';
        document.getElementById('product-cat-mgmt').style.display = 'block';
        document.getElementById('order-mgmt').style.display = 'block';
        document.getElementById('customer-mgmt').style.display = 'block';
        document.getElementById('reports-link').style.display = 'block';
    } else if (user.role === 'sales') {
        // 销售人员只能查看部分菜单
        document.getElementById('reports-link').style.display = 'block';
    }
}

/**
 * 初始化日志页面功能
 */
function initLogPage() {
    // 获取当前用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }
    
    // 初始化过滤器面板折叠功能
    initFilterPanel();
    
    // 初始化标签页切换功能
    initTabs();
    
    // 初始化日期选择器为过去7天
    initDateRange();
    
    // 绑定过滤表单提交事件
    document.getElementById('log-filter-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 获取当前选中的标签页
        const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
        
        // 根据当前标签页加载对应日志
        if (activeTab === 'login-logs') {
            loadLoginLogs();
        } else {
            loadAdminLogs();
        }
    });
    
    // 绑定表单重置事件
    document.getElementById('log-filter-form').addEventListener('reset', function() {
        // 重置后延迟执行，确保表单值已被清空
        setTimeout(() => {
            initDateRange(); // 重置为过去7天
        }, 10);
    });
    
    // 初始化加载数据
    loadLoginLogs();
}

/**
 * 初始化过滤器面板折叠功能
 */
function initFilterPanel() {
    const toggleBtn = document.getElementById('toggle-filters');
    const filterContent = document.getElementById('filter-content');
    
    toggleBtn.addEventListener('click', function() {
        filterContent.classList.toggle('collapsed');
        toggleBtn.classList.toggle('collapsed');
    });
}

/**
 * 初始化标签页切换功能
 */
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有标签的active类
            tabs.forEach(t => t.classList.remove('active'));
            // 添加当前标签的active类
            this.classList.add('active');
            
            // 隐藏所有内容
            tabContents.forEach(content => content.classList.remove('active'));
            // 显示当前内容
            const tabContentId = this.getAttribute('data-tab');
            document.getElementById(tabContentId).classList.add('active');
            
            // 加载对应标签页数据
            if (tabContentId === 'login-logs') {
                loadLoginLogs();
            } else {
                loadAdminLogs();
            }
        });
    });
}

/**
 * 初始化日期范围为过去7天
 */
function initDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    // 格式化日期为YYYY-MM-DD
    document.getElementById('end-date').value = formatDate(endDate);
    document.getElementById('start-date').value = formatDate(startDate);
}

/**
 * 格式化日期为YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取过滤条件
 * @returns {Object} - 过滤条件对象
 */
function getFilterParams() {
    const params = {};
    
    // 日期范围
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    // 用户角色
    const role = document.getElementById('user-role').value;
    if (role !== 'all') params.role = role;
    
    // 操作类型
    const action = document.getElementById('log-action').value;
    if (action !== 'all') params.action = action;
    
    // 用户ID
    const userId = document.getElementById('user-id').value.trim();
    if (userId) params.userId = userId;
    
    // 分页参数
    params.page = 1;
    params.limit = 20;
    
    return params;
}

/**
 * 加载登录日志
 * @param {number} page - 页码
 */
function loadLoginLogs(page = 1) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) return;
    
    // 显示加载中
    const loadingIndicator = document.getElementById('login-logs-loading');
    const emptyMessage = document.getElementById('login-logs-empty');
    const tableBody = document.getElementById('login-logs-table').querySelector('tbody');
    
    tableBody.innerHTML = '';
    loadingIndicator.style.display = 'block';
    emptyMessage.style.display = 'none';
    
    // 获取过滤参数
    const params = getFilterParams();
    params.page = page;
    
    // 构建查询参数
    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');    // 请求获取登录日志
    fetch(`http://localhost:3000/api/admin/logs/login?${queryString}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP错误状态: ${response.status}`);
        }
        
        // 检查内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`响应不是JSON格式: ${contentType}`);
        }
        
        return response.json();
    })
    .then(data => {
        loadingIndicator.style.display = 'none';
        
        if (data.success && data.data.length > 0) {
            // 更新统计数据
            updateLoginStats(data);
            
            // 渲染日志数据
            data.data.forEach(log => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${log.userId}</td>
                    <td>${log.user ? log.user.username : '未知用户'}</td>
                    <td>${log.role}</td>
                    <td>${log.action === 'login' ? '登录' : '注销'}</td>
                    <td>${formatDateTime(log.timestamp || log.createdAt)}</td>
                    <td>${log.ipAddress || '-'}</td>
                    <td class="user-agent-cell" title="${log.userAgent || '-'}">${log.userAgent || '-'}</td>
                    <td class="session-id-cell" title="${log.sessionId || '-'}">${log.sessionId || '-'}</td>
                `;
                tableBody.appendChild(row);
            });
            
            // 渲染分页控件
            renderPagination('login-logs-pagination', data.pagination, loadLoginLogs);
        } else {
            // 显示无数据消息
            emptyMessage.style.display = 'block';
            document.getElementById('login-logs-pagination').innerHTML = '';
            
            // 清空统计数据
            document.getElementById('total-logins').textContent = '0';
            document.getElementById('total-logouts').textContent = '0';
            document.getElementById('unique-users-login').textContent = '0';
        }
    })
    .catch(error => {
        console.error('加载登录日志失败:', error);
        loadingIndicator.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.textContent = '加载失败，请重试';
    });
}

/**
 * 更新登录统计数据
 * @param {Object} data - 响应数据
 */
function updateLoginStats(data) {
    // 计算登录次数和注销次数
    const loginCount = data.data.filter(log => log.action === 'login').length;
    const logoutCount = data.data.filter(log => log.action === 'logout').length;
    
    document.getElementById('total-logins').textContent = loginCount;
    document.getElementById('total-logouts').textContent = logoutCount;
    
    // 计算独立用户数
    const uniqueUsers = new Set(data.data.map(log => log.userId)).size;
    document.getElementById('unique-users-login').textContent = uniqueUsers;
}

/**
 * 加载管理操作日志
 * @param {number} page - 页码
 */
function loadAdminLogs(page = 1) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) return;
    
    // 显示加载中
    const loadingIndicator = document.getElementById('admin-logs-loading');
    const emptyMessage = document.getElementById('admin-logs-empty');
    const tableBody = document.getElementById('admin-logs-table').querySelector('tbody');
    
    tableBody.innerHTML = '';
    loadingIndicator.style.display = 'block';
    emptyMessage.style.display = 'none';
    
    // 获取过滤参数
    const params = getFilterParams();
    params.page = page;
    
    // 构建查询参数
    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');    // 请求获取管理操作日志
    fetch(`http://localhost:3000/api/admin/logs/activity?${queryString}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP错误状态: ${response.status}`);
        }
        
        // 检查内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`响应不是JSON格式: ${contentType}`);
        }
        
        return response.json();
    })
    .then(data => {
        loadingIndicator.style.display = 'none';
        
        if (data.success && data.data.length > 0) {
            // 更新统计数据
            updateAdminStats(data);
            
            // 渲染日志数据
            data.data.forEach(log => {
                const row = document.createElement('tr');
                
                // 状态徽章样式
                const statusBadge = log.status ? 
                    `<span class="status-badge status-${log.status === 'success' ? 'success' : 'failed'}">${log.status === 'success' ? '成功' : '失败'}</span>` : 
                    '-';
                
                row.innerHTML = `
                    <td>${log.accountId}</td>
                    <td>${log.user ? log.user.username : '未知用户'}</td>
                    <td>${log.role}</td>
                    <td class="truncate-text" title="${log.action}">${log.action}</td>
                    <td>${log.module || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>${formatDateTime(log.timestamp || log.createdAt)}</td>
                    <td>${log.ipAddress || '-'}</td>
                `;
                tableBody.appendChild(row);
            });
            
            // 渲染分页控件
            renderPagination('admin-logs-pagination', data.pagination, loadAdminLogs);
        } else {
            // 显示无数据消息
            emptyMessage.style.display = 'block';
            document.getElementById('admin-logs-pagination').innerHTML = '';
            
            // 清空统计数据
            document.getElementById('total-admin-actions').textContent = '0';
            document.getElementById('unique-admins').textContent = '0';
            document.getElementById('success-rate').textContent = '0%';
        }
    })
    .catch(error => {
        console.error('加载管理操作日志失败:', error);
        loadingIndicator.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.textContent = '加载失败，请重试';
    });
}

/**
 * 更新管理操作统计数据
 * @param {Object} data - 响应数据
 */
function updateAdminStats(data) {
    // 总操作次数
    document.getElementById('total-admin-actions').textContent = data.pagination.total;
    
    // 计算操作人员数
    const uniqueAdmins = new Set(data.data.map(log => log.accountId)).size;
    document.getElementById('unique-admins').textContent = uniqueAdmins;
    
    // 计算成功率
    const successLogs = data.data.filter(log => log.status === 'success').length;
    const successRate = data.data.length ? Math.round((successLogs / data.data.length) * 100) : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
}

/**
 * 格式化日期时间
 * @param {string} dateString - 日期字符串
 * @returns {string} - 格式化后的日期时间
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 渲染分页控件
 * @param {string} elementId - 分页容器元素ID
 * @param {Object} pagination - 分页信息
 * @param {Function} loadFunction - 加载数据函数
 */
function renderPagination(elementId, pagination, loadFunction) {
    const paginationContainer = document.getElementById(elementId);
    paginationContainer.innerHTML = '';
    
    if (!pagination || pagination.totalPages <= 1) {
        return;
    }
    
    const { page, totalPages } = pagination;
    
    // 创建"上一页"按钮
    const prevItem = document.createElement('div');
    prevItem.className = `page-item ${page <= 1 ? 'disabled' : ''}`;
    prevItem.innerHTML = `<span class="page-link">&laquo;</span>`;
    if (page > 1) {
        prevItem.addEventListener('click', () => loadFunction(page - 1));
    }
    paginationContainer.appendChild(prevItem);
    
    // 创建页码按钮
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement('div');
        pageItem.className = `page-item ${i === page ? 'active' : ''}`;
        pageItem.innerHTML = `<span class="page-link">${i}</span>`;
        if (i !== page) {
            pageItem.addEventListener('click', () => loadFunction(i));
        }
        paginationContainer.appendChild(pageItem);
    }
    
    // 创建"下一页"按钮
    const nextItem = document.createElement('div');
    nextItem.className = `page-item ${page >= totalPages ? 'disabled' : ''}`;
    nextItem.innerHTML = `<span class="page-link">&raquo;</span>`;
    if (page < totalPages) {
        nextItem.addEventListener('click', () => loadFunction(page + 1));
    }
    paginationContainer.appendChild(nextItem);
}