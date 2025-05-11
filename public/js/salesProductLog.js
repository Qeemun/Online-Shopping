/**
 * 销售产品日志页面脚本
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化销售工具类
    const salesUtils = new SalesUtils();
    
    // 检查用户登录状态和权限
    salesUtils.checkAuthAndPermission(['sales', 'admin']);
    
    // 显示当前登录用户
    displayCurrentUser();
    
    // 初始化日志页面功能
    initLogPage();
});

/**
 * 显示当前登录的用户信息
 */
function displayCurrentUser() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const userSpan = document.getElementById('current-user');
        userSpan.textContent = `${user.username} (${user.role === 'admin' ? '管理员' : '销售员'})`;
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
      // 初始化标签页切换功能
    initTabs();
    
    // 加载商品类别
    loadCategories();
    
    // 当类别变化时加载对应商品
    document.getElementById('product-category').addEventListener('change', function() {
        loadProducts(this.value);
    });
    
    // 初始化日期选择器为过去30天
    initDateRange();
    
    // 设置日期范围选择
    document.getElementById('date-range').addEventListener('change', function() {
        const customDateContainer = document.getElementById('custom-date-container');
        if (this.value === 'custom') {
            customDateContainer.style.display = 'flex';
        } else {
            customDateContainer.style.display = 'none';
            // 自动应用选定的日期范围
            setDateRangeFromSelection(this.value);
        }
    });
      // 设置搜索按钮点击
    document.getElementById('search-logs').addEventListener('click', function() {
        applyFilters();
    });
    
    // 重置过滤器
    document.getElementById('reset-filters').addEventListener('click', function() {
        resetFilters();
        applyFilters();
    });
    
    // 应用自定义日期范围
    document.getElementById('apply-date-range').addEventListener('click', function() {
        applyFilters();
    });
    
    // 初始化加载数据
    loadViewLogs();
}

// 删除initFilterPanel函数，因为新的UI不再需要折叠功能

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
            if (tabContentId === 'view-logs') {
                loadViewLogs();
            } else {
                loadPurchaseLogs();
            }
        });
    });
}

/**
 * 初始化日期范围为过去30天
 */
function initDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
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
 * 加载商品类别
 */
function loadCategories() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // 获取销售人员负责的类别
    fetch('http://localhost:3000/api/products/categories/all', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 获取类别选择器和当前选中值
            const categorySelect = document.getElementById('product-category');
            const currentValue = categorySelect.value;
            
            // 清除原有选项（保留"全部类别"选项）
            categorySelect.innerHTML = '<option value="all" selected>全部类别</option>';
            
            // 添加类别选项
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            // 恢复之前选中的值（如果存在）
            if (currentValue && currentValue !== 'all') {
                categorySelect.value = currentValue;
            }
            
            // 加载第一个类别的产品
            loadProducts(categorySelect.value);
        }
    })
    .catch(error => {
        console.error('加载类别失败:', error);
    });
}

/**
 * 加载指定类别的产品
 * @param {string} category - 商品类别
 */
function loadProducts(category) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const productSelect = document.getElementById('product');
    
    // 如果选择"全部类别"，则清空产品选择器
    if (category === 'all') {
        productSelect.innerHTML = '<option value="all" selected>全部商品</option>';
        return;
    }
    
    // 获取指定类别的产品
    fetch(`http://localhost:3000/api/products/category/${category}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 清除原有选项（保留"全部商品"选项）
            productSelect.innerHTML = '<option value="all" selected>全部商品</option>';
            
            // 添加产品选项
            data.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                productSelect.appendChild(option);
            });
        }
    })
    .catch(error => {
        console.error('加载产品失败:', error);
    });
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
    
    // 商品类别和产品
    const category = document.getElementById('product-category').value;
    const productId = document.getElementById('product').value;
    
    if (category !== 'all') params.category = category;
    if (productId !== 'all') params.productId = productId;
    
    // 分页参数
    params.page = 1;
    params.limit = 20;
    
    return params;
}

/**
 * 加载浏览日志
 * @param {number} page - 页码
 */
function loadViewLogs(page = 1) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) return;
    
    // 显示加载中
    const loadingIndicator = document.getElementById('view-logs-loading');
    const emptyMessage = document.getElementById('view-logs-empty');
    const tableBody = document.getElementById('view-logs-table').querySelector('tbody');
    
    tableBody.innerHTML = '';
    loadingIndicator.style.display = 'block';
    emptyMessage.style.display = 'none';
    
    // 获取过滤参数
    const params = getFilterParams();
    params.page = page;
    
    // 如果是销售人员，添加salesId参数
    if (user.role === 'sales') {
        params.salesId = user.id;
    }
    
    // 构建查询参数
    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      // 请求获取浏览日志
    fetch(`http://localhost:3000/api/sales/logs/product-views?${queryString}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        loadingIndicator.style.display = 'none';
        
        if (data.success && data.data.length > 0) {
            // 更新统计数据
            updateViewStats(data);
            
            // 渲染日志数据
            data.data.forEach(log => {
                const row = document.createElement('tr');                row.innerHTML = `
                    <td>${log.userId}</td>
                    <td>${log.user ? log.user.username : '未知用户'}</td>
                    <td>${log.product ? log.product.name : '未知商品'}</td>
                    <td>${log.product ? log.product.category : '未知类别'}</td>
                    <td>${log.durationSeconds ? `${log.durationSeconds}秒` : '未记录'}</td>
                    <td>${formatDateTime(log.createdAt)}</td>
                    <td>${log.ipAddress || '未记录'}</td>
                `;
                tableBody.appendChild(row);
            });
            
            // 渲染分页控件
            renderPagination('view-logs-pagination', data.pagination, loadViewLogs);
        } else {
            // 显示无数据消息
            emptyMessage.style.display = 'block';
            document.getElementById('view-logs-pagination').innerHTML = '';
            
            // 清空统计数据
            document.getElementById('total-views').textContent = '0';
            document.getElementById('unique-users-view').textContent = '0';
            document.getElementById('avg-view-time').textContent = '0秒';
        }
    })
    .catch(error => {
        console.error('加载浏览日志失败:', error);
        loadingIndicator.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.textContent = '加载失败，请重试';
    });
}

/**
 * 更新浏览统计数据
 * @param {Object} data - 响应数据
 */
function updateViewStats(data) {
    // 总浏览次数
    document.getElementById('total-views').textContent = data.pagination.total;
    
    // 计算独立用户数
    const uniqueUsers = new Set(data.data.map(log => log.userId)).size;
    document.getElementById('unique-users-view').textContent = uniqueUsers;
    
    // 计算平均停留时间
    const totalDuration = data.data.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
    const avgDuration = data.data.length ? Math.round(totalDuration / data.data.length) : 0;
    document.getElementById('avg-view-time').textContent = `${avgDuration}秒`;
}

/**
 * 加载购买日志
 * @param {number} page - 页码
 */
function loadPurchaseLogs(page = 1) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) return;
    
    // 显示加载中
    const loadingIndicator = document.getElementById('purchase-logs-loading');
    const emptyMessage = document.getElementById('purchase-logs-empty');
    const tableBody = document.getElementById('purchase-logs-table').querySelector('tbody');
    
    tableBody.innerHTML = '';
    loadingIndicator.style.display = 'block';
    emptyMessage.style.display = 'none';
    
    // 获取过滤参数
    const params = getFilterParams();
    params.page = page;
    
    // 如果是销售人员，添加salesId参数
    if (user.role === 'sales') {
        params.salesId = user.id;
    }
    
    // 构建查询参数
    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      // 请求获取购买日志
    fetch(`http://localhost:3000/api/sales/logs/purchase?${queryString}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        loadingIndicator.style.display = 'none';
        
        if (data.success && data.data.length > 0) {
            // 更新统计数据
            updatePurchaseStats(data);
            
            // 渲染日志数据
            data.data.forEach(log => {
                const row = document.createElement('tr');                row.innerHTML = `
                    <td>${log.orderId}</td>
                    <td>${log.userId}</td>
                    <td>${log.user ? log.user.username : '未知用户'}</td>
                    <td>${log.product ? log.product.name : '未知商品'}</td>
                    <td>${log.product ? log.product.category : '未知类别'}</td>
                    <td>¥${log.unitPrice.toFixed(2)}</td>
                    <td>${log.quantity}</td>
                    <td>¥${log.totalAmount.toFixed(2)}</td>
                    <td>${formatDateTime(log.orderDate)}</td>
                `;
                tableBody.appendChild(row);
            });
            
            // 渲染分页控件
            renderPagination('purchase-logs-pagination', data.pagination, loadPurchaseLogs);
        } else {
            // 显示无数据消息
            emptyMessage.style.display = 'block';
            document.getElementById('purchase-logs-pagination').innerHTML = '';
            
            // 清空统计数据
            document.getElementById('total-orders').textContent = '0';
            document.getElementById('unique-users-purchase').textContent = '0';
            document.getElementById('total-amount').textContent = '¥0';
        }
    })
    .catch(error => {
        console.error('加载购买日志失败:', error);
        loadingIndicator.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.textContent = '加载失败，请重试';
    });
}

/**
 * 更新购买统计数据
 * @param {Object} data - 响应数据
 */
function updatePurchaseStats(data) {
    // 总订单数
    const uniqueOrders = new Set(data.data.map(log => log.orderId)).size;
    document.getElementById('total-orders').textContent = uniqueOrders;
    
    // 计算独立用户数
    const uniqueUsers = new Set(data.data.map(log => log.userId)).size;
    document.getElementById('unique-users-purchase').textContent = uniqueUsers;
    
    // 计算总销售额
    const totalAmount = data.data.reduce((sum, log) => sum + log.totalAmount, 0);
    document.getElementById('total-amount').textContent = `¥${totalAmount.toFixed(2)}`;
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

/**
 * 根据选择的日期范围设置开始和结束日期
 * @param {string} rangeValue 日期范围值：7, 30, 90, 等
 */
function setDateRangeFromSelection(rangeValue) {
    const today = new Date();
    let startDate = new Date();
    
    switch (rangeValue) {
        case '7':
            startDate.setDate(today.getDate() - 7);
            break;
        case '30':
            startDate.setDate(today.getDate() - 30);
            break;
        case '90':
            startDate.setDate(today.getDate() - 90);
            break;
        case '365':
            startDate.setDate(today.getDate() - 365);
            break;
        default:
            startDate.setDate(today.getDate() - 30); // 默认30天
    }
    
    // 更新日期选择器
    document.getElementById('start-date').value = formatDate(startDate);
    document.getElementById('end-date').value = formatDate(today);
    
    // 应用新的日期范围筛选
    applyFilters();
}

/**
 * 应用所有筛选条件并重新加载数据
 */
function applyFilters() {
    // 获取当前选中的标签页
    const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
    
    // 根据当前标签页加载对应日志
    if (activeTab === 'view-logs') {
        loadViewLogs();
    } else {
        loadPurchaseLogs();
    }
}

/**
 * 重置所有过滤器
 */
function resetFilters() {
    // 重置日期范围
    const dateRangeSelect = document.getElementById('date-range');
    dateRangeSelect.value = '30';
    
    // 更新自定义日期容器可见性
    document.getElementById('custom-date-container').style.display = 'none';
    
    // 重置日期为过去30天
    setDateRangeFromSelection('30');
    
    // 重置类别和产品选择
    document.getElementById('product-category').value = 'all';
    document.getElementById('product').value = 'all';
}