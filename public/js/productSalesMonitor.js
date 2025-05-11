/**
 * 产品销售监控页面脚本
 * 实现销售人员查看所负责商品类别的销售状态信息
 */

// 全局变量
let currentProductId = null;
let currentStaffId = null;
let charts = {
    salesChart: null,
    stockChart: null,
    categoryRevenueChart: null,
    categoryQuantityChart: null,
    categoryStockChart: null,
    salesTrendChart: null
};
// 添加salesData全局变量，避免undefined错误
let salesData = [];

// 日志函数
function logMessage(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${type.toUpperCase()}]`;
    
    if (type === 'error') {
        console.error(`${logPrefix} ${message}`);
    } else if (type === 'warn') {
        console.warn(`${logPrefix} ${message}`);
    } else {
        console.log(`${logPrefix} ${message}`);
    }
}

// 分页状态
let pagination = {
    page: 1,
    limit: 20,
    hasMore: true
};
// 加载状态
let isLoading = false;
// 创建salesUtils实例
const salesUtils = new SalesUtils();

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 使用salesUtils工具类检查权限
    if (!salesUtils.checkAuthAndPermission(['sales', 'admin'])) return;
    
    // 初始化图表
    initializeCharts();
    
    // 初始化日期控件
    initDatePickers();
    
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const staffId = urlParams.get('staffId');
    
    // 根据URL参数决定显示全局视图或特定销售人员视图
    if (staffId) {
        currentStaffId = staffId;
        showView('staff-specific-view');
        loadSalesStaffCategoryPerformance(staffId);
    } else {
        showView('all-categories-view');
        loadCategorySalesPerformance();
    }
    
    // 添加事件监听器
    addEventListeners();
    
    // 初始化类别筛选器
    loadCategories();
    
    // 初始加载实时监控数据
    loadProducts();
});

// 显示特定视图并隐藏其他视图
function showView(viewId) {
    const views = ['all-categories-view', 'staff-specific-view'];
    views.forEach(id => {
        document.getElementById(id).style.display = id === viewId ? 'block' : 'none';
    });
}

// 添加事件监听器
function addEventListeners() {
    // 日期范围切换
    document.getElementById('date-range').addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('custom-date-container').style.display = 'flex';
        } else {
            document.getElementById('custom-date-container').style.display = 'none';
            updateDateBasedFilters(this.value);
        }
    });
    
    // 更新分析按钮
    document.getElementById('update-analysis').addEventListener('click', function() {
        // 获取当前筛选条件并重新加载数据
        reloadData();
    });
    
    // 分类和状态筛选器
    if (document.getElementById('category-filter')) {
        document.getElementById('category-filter').addEventListener('change', filterProducts);
    }
    
    if (document.getElementById('status-filter')) {
        document.getElementById('status-filter').addEventListener('change', filterProducts);
    }
    
    // 绑定销售人员选择器事件(仅管理员可见)
    const salesStaffSelector = document.getElementById('sales-staff-selector');
    if (salesStaffSelector) {
        salesStaffSelector.addEventListener('change', function() {
            const selectedStaffId = this.value;
            
            if (selectedStaffId) {
                // 查看特定销售人员
                window.location.href = `productSalesMonitor.html?staffId=${selectedStaffId}`;
            } else {
                // 查看所有
                window.location.href = 'productSalesMonitor.html';
            }
        });
    }
    
    // 绑定滚动事件，实现无限滚动加载
    window.addEventListener('scroll', handleScroll);
}

// 基于当前状态重新加载数据
function reloadData() {
    if (currentStaffId) {
        loadSalesStaffCategoryPerformance(currentStaffId);
    } else {
        loadCategorySalesPerformance();
    }
    
    // 重置产品分页和加载状态
    pagination = {
        page: 1,
        limit: 20,
        hasMore: true
    };
    isLoading = false;
    
    // 重新加载产品列表
    loadProducts();
}

// 加载所有类别
async function loadCategories() {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        logMessage('开始加载商品类别', 'info');
        
        if (!token || !user) {
            logMessage('用户未登录或缺少token', 'error');
            return;
        }
        
        let url = 'http://localhost:3000/api/products/categories/all';
        
        // 如果是销售人员，只加载其负责的类别
        if (user.role === 'sales') {
            url = `http://localhost:3000/api/sales/assigned-categories/${user.id}`;
            logMessage(`销售人员模式：请求 ${url}`, 'info');
        } else {
            logMessage(`管理员模式：请求 ${url}`, 'info');
        }
        
        logMessage(`开始发送请求到: ${url}`, 'info');
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        logMessage(`API响应状态: ${response.status} ${response.statusText}`, 'info');
        
        if (!response.ok) {
            logMessage(`API调用失败: ${response.status} ${response.statusText}`, 'error');
            throw new Error(`获取商品类别失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        logMessage(`收到API响应数据: ${JSON.stringify(data).substring(0, 200)}...`, 'info');
        
        if (!data.success) {
            logMessage(`API返回错误: ${data.message || '未知错误'}`, 'error');
            throw new Error(data.message || '获取商品类别失败');
        }
        
        // 填充类别筛选器
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) {
            logMessage('找不到category-filter元素', 'warn');
            return;
        }
        
        // 清空现有选项(保留"所有类别"选项)
        categoryFilter.innerHTML = '<option value="">所有类别</option>';
        
        const categories = data.categories || [];
        logMessage(`加载到 ${categories.length} 个类别`, 'info');
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('加载类别失败:', error);
        logMessage(`加载类别失败: ${error.message}`, 'error');
        salesUtils.showNotification('加载商品类别失败: ' + error.message, 'error');
    }
}

// 处理滚动事件
function handleScroll() {
    // 如果正在加载或没有更多数据，则不处理
    if (isLoading || !pagination.hasMore) return;
    
    // 计算滚动位置
    const scrollPosition = window.innerHeight + window.scrollY;
    const bodyHeight = document.body.offsetHeight;
    
    // 当滚动到距离底部200px时，加载更多数据
    if (scrollPosition >= bodyHeight - 200) {
        loadMoreProducts();
    }
}

// 加载所有商品 (初始加载)
async function loadProducts() {
    try {
        // 重置分页
        pagination = {
            page: 1,
            limit: 20,
            hasMore: true
        };
        isLoading = false;
        
        // 清空产品列表
        document.getElementById('product-status-body').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">加载中...</td>
            </tr>
        `;
        
        // 加载第一页数据
        await loadMoreProducts(true);
        
    } catch (error) {
        console.error('加载商品失败:', error);
        document.getElementById('product-status-body').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">加载商品数据失败: ${error.message}</td>
            </tr>
        `;
        salesUtils.showNotification('加载商品失败: ' + error.message, 'error');
    }
}

// 加载更多商品 (无限滚动)
async function loadMoreProducts(isInitialLoad = false) {
    if (isLoading || !pagination.hasMore) return;
    
    isLoading = true;
    
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (!token || !user) return;
        
        // 显示加载指示器
        if (!isInitialLoad) {
            showLoading('product-status-body', 'loading-indicator', 6, '加载更多商品...');
        }
        
        // 构建请求参数
        const params = new URLSearchParams({
            page: pagination.page,
            limit: pagination.limit
        });
        
        // 添加筛选条件
        const categoryFilter = document.getElementById('category-filter').value;
        if (categoryFilter) {
            params.append('category', categoryFilter);
        }
        
        // 添加状态筛选条件
        const statusFilter = document.getElementById('status-filter').value;
        if (statusFilter) {
            params.append('stockStatus', statusFilter);
        }
        
        // 如果是销售人员，只查询其负责的商品
        let url = 'http://localhost:3000/api/products';
        if (user.role === 'sales') {
            url = `http://localhost:3000/api/sales/${user.id}/products`;
        }
        
        // 发送请求
        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取商品数据失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品数据失败');
        }
        
        // 清除初始加载指示器
        if (isInitialLoad) {
            document.getElementById('product-status-body').innerHTML = '';
        } else {
            hideElement('loading-indicator');
        }
        
        // 更新分页信息
        if (data.pagination) {
            pagination = {
                page: pagination.page + 1,
                limit: pagination.limit,
                hasMore: data.pagination.page < data.pagination.totalPages
            };
        } else {
            pagination.hasMore = false;
        }
        
        // 保存所有商品数据
        if (isInitialLoad) {
            window.allProducts = data.products || [];
        } else {
            window.allProducts = [...(window.allProducts || []), ...(data.products || [])];
        }
        
        // 显示商品数据
        displayProducts(data.products || [], isInitialLoad);
        
        // 仅在初次加载时渲染图表
        if (isInitialLoad && window.allProducts && window.allProducts.length > 0) {
            renderSalesChart(window.allProducts);
        }
        
        // 如果没有更多数据，显示结束提示
        if (!pagination.hasMore) {
            showEndMessage('product-status-body', 6);
        }
        
    } catch (error) {
        console.error('加载更多商品失败:', error);
        salesUtils.showNotification('加载更多商品失败: ' + error.message, 'error');
    } finally {
        isLoading = false;
    }
}

// 显示商品列表
function displayProducts(products, isInitialLoad = false) {
    const tableBody = document.getElementById('product-status-body');
    
    if (!products || products.length === 0) {
        if (isInitialLoad) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center;">暂无商品数据</td>
                </tr>
            `;
        }
        return;
    }
    
    // 获取当前筛选条件
    const categoryFilter = document.getElementById('category-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    // 筛选商品
    let filteredProducts = products;
    
    if (statusFilter) {
        filteredProducts = filteredProducts.filter(product => {
            if (statusFilter === 'normal' && product.stock > 10) {
                return true;
            } else if (statusFilter === 'warning' && product.stock > 0 && product.stock <= 10) {
                return true;
            } else if (statusFilter === 'danger' && product.stock <= 0) {
                return true;
            }
            return false;
        });
    }
    
    // 仅在初始加载或有筛选条件时排序
    if (isInitialLoad || statusFilter) {
        // 按库存状态排序（库存紧急的排前面）
        filteredProducts.sort((a, b) => a.stock - b.stock);
    }
    
    // 添加商品行
    const fragment = document.createDocumentFragment();
    
    filteredProducts.forEach(product => {
        // 确定库存状态
        let stockStatus;
        let statusClass;
        
        if (product.stock <= 0) {
            stockStatus = '紧急补货';
            statusClass = 'danger';
        } else if (product.stock <= 10) {
            stockStatus = '库存不足';
            statusClass = 'warning';
        } else {
            stockStatus = '库存正常';
            statusClass = 'normal';
        }
        
        // 格式化最近销售时间
        const lastSale = product.lastSale ? formatDateTime(product.lastSale) : '暂无销售';
        
        const row = document.createElement('tr');
        row.className = statusClass;
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category || '未分类'}</td>
            <td>${product.soldQuantity || 0}</td>
            <td>${product.stock}</td>
            <td class="status ${statusClass}">${stockStatus}</td>
            <td>${lastSale}</td>
        `;
        
        // 添加行点击事件，查看商品详情
        row.addEventListener('click', () => {
            window.location.href = `productDetails.html?id=${product.id}`;
        });
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
}

// 筛选商品
function filterProducts() {
    // 清空表格
    document.getElementById('product-status-body').innerHTML = '';
    
    // 重置分页
    pagination = {
        page: 1,
        limit: 20,
        hasMore: true
    };
    
    // 重新加载商品
    loadProducts();
}

// 在指定容器中显示加载指示器
function showLoading(containerId, loadingId, colspan = 6, message = '加载中...') {
    // 查找是否已有加载指示器
    let loadingIndicator = document.getElementById(loadingId);
    
    // 如果没有，创建一个
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('tr');
        loadingIndicator.id = loadingId;
        loadingIndicator.innerHTML = `
            <td colspan="${colspan}" class="text-center">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            </td>
        `;
        document.getElementById(containerId).appendChild(loadingIndicator);
    } else {
        loadingIndicator.style.display = '';
    }
}

// 显示加载遮罩
function showLoadingOverlay() {
    let loadingOverlay = document.getElementById('loading-overlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>加载中...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.style.display = 'flex';
}

// 隐藏元素
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// 隐藏加载遮罩
function hideLoadingOverlay() {
    hideElement('loading-overlay');
}

// 显示结束信息
function showEndMessage(containerId, colspan = 6) {
    // 查找是否已有结束信息
    let endMessage = document.getElementById('end-message');
    
    // 如果没有，创建一个
    if (!endMessage) {
        endMessage = document.createElement('tr');
        endMessage.id = 'end-message';
        endMessage.innerHTML = `
            <td colspan="${colspan}" class="text-center">
                <div class="end-message">
                    已加载全部商品
                </div>
            </td>
        `;
        document.getElementById(containerId).appendChild(endMessage);
    } else {
        endMessage.style.display = '';
    }
}

// 渲染销售图表
function renderSalesChart(products) {
    // 如果页面上没有图表元素，则不渲染
    const chartCanvas = document.getElementById('sales-chart');
    if (!chartCanvas) return;
    
    // 获取销售量最高的前5个商品
    const topProducts = [...products]
        .sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0))
        .slice(0, 5);
    
    // 准备图表数据
    const labels = topProducts.map(p => p.name);
    const salesData = topProducts.map(p => p.soldQuantity || 0);
    const stockData = topProducts.map(p => p.stock);
    
    // 创建图表
    if (charts.salesChart) {
        charts.salesChart.destroy();
    }
    
    charts.salesChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '已售数量',
                    data: salesData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: '库存数量',
                    data: stockData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '畅销商品销售与库存'
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '数量'
                    }
                }
            }
        }
    });
}

// 格式化日期时间 - 使用salesUtils中的方法
function formatDateTime(dateString) {
    if (!dateString) return '未知';
    return salesUtils.formatDateTime(dateString);
}

// 初始化日期选择器
function initDatePickers() {
    // 设置默认日期范围 (近30天)
    const today = new Date();
    const last30days = new Date();
    last30days.setDate(today.getDate() - 30);
    
    document.getElementById('start-date').valueAsDate = last30days;
    document.getElementById('end-date').valueAsDate = today;
}

// 根据选择的日期范围更新日期筛选器
function updateDateBasedFilters(rangeValue) {
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
    }
    
    // 更新日期选择器
    document.getElementById('start-date').valueAsDate = startDate;
    document.getElementById('end-date').valueAsDate = today;
    
    // 根据新的日期范围重新加载数据
    reloadData();
}

// 应用自定义日期范围
function applyCustomDateRange() {
    // 获取日期值
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    
    // 检查日期有效性
    if (new Date(startDate) > new Date(endDate)) {
        alert('开始日期不能晚于结束日期');
        return;
    }
    
    // 重新加载数据
    reloadData();
}

// 初始化图表
function initializeCharts() {
    // 清除可能存在的旧图表
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
    });
    
    // 初始化类别销售额图表
    initChart('category-revenue-chart', 'bar', '各类别销售额', '销售额 (元)', true, (value) => '¥' + value);
    
    // 初始化类别销售数量图表
    initChart('category-quantity-chart', 'bar', '各类别销售数量', '销售数量');
    
    // 初始化类别库存图表
    initChart('category-stock-chart', 'bar', '各类别库存状态', '库存数量');
    
    // 初始化趋势图表
    initChart('sales-trend-chart', 'line', '销售趋势', '销售额 (元)', true, (value) => '¥' + value);
    
    // 初始化销售人员视图的图表（如果存在）
    if (document.getElementById('category-revenue-chart-staff')) {
        initChart('category-revenue-chart-staff', 'bar', '负责类别销售额', '销售额 (元)', true, (value) => '¥' + value);
        initChart('category-quantity-chart-staff', 'bar', '负责类别销售数量', '销售数量');
        initChart('sales-trend-chart-staff', 'line', '销售趋势', '销售额 (元)', true, (value) => '¥' + value);
    }
}

// 创建图表的辅助函数
function initChart(canvasId, type, title, yAxisLabel, formatYAxis = false, formatCallback = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const chartName = canvasId.replace(/-/g, '') + 'Chart';
    
    // 选择图表颜色
    let backgroundColor = 'rgba(75, 192, 192, 0.6)';
    let borderColor = 'rgba(75, 192, 192, 1)';
    
    if (canvasId.includes('quantity')) {
        backgroundColor = 'rgba(54, 162, 235, 0.6)';
        borderColor = 'rgba(54, 162, 235, 1)';
    } else if (canvasId.includes('stock')) {
        backgroundColor = 'rgba(255, 159, 64, 0.6)';
        borderColor = 'rgba(255, 159, 64, 1)';
    }
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title
            },
            legend: {
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: yAxisLabel
                }
            }
        }
    };
    
    // 添加Y轴格式化（如果需要）
    if (formatYAxis && formatCallback) {
        chartOptions.scales.y.ticks = {
            callback: formatCallback
        };
    }
    
    // 创建数据集
    const datasets = [];
    if (type === 'bar') {
        datasets.push({
            label: yAxisLabel,
            data: [],
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
        });
    }
    
    // 创建图表
    charts[chartName] = new Chart(ctx, {
        type: type,
        data: {
            labels: [],
            datasets: datasets
        },
        options: chartOptions
    });
    
    return charts[chartName];
}

// 加载销售人员选项
function loadSalesStaffOptions() {
    const token = localStorage.getItem('token');
    
    fetch('http://localhost:3000/api/sales-staff', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const selector = document.getElementById('sales-staff-selector');
            
            // 添加"所有销售人员"选项
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = '所有销售人员';
            selector.appendChild(allOption);
            
            // 添加每个销售人员选项
            data.salesStaff.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff.id;
                option.textContent = staff.username;
                selector.appendChild(option);
            });
        } else {
            console.error('加载销售人员失败:', data.message);
            salesUtils.showNotification('加载销售人员失败', 'error');
        }
    })
    .catch(error => {
        console.error('加载销售人员失败:', error);
        salesUtils.showNotification('加载销售人员失败', 'error');
    });
}

// 加载类别销售业绩数据
async function loadCategorySalesPerformance() {
    showLoadingOverlay();
    logMessage('开始加载类别销售业绩数据', 'info');
    
    // 确保categoryUtils已初始化
    if (!categoryUtils.initialized) {
        logMessage('等待categoryUtils初始化...', 'info');
        await categoryUtils.initialize();
        logMessage('categoryUtils初始化完成', 'info');
    }
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) {
        logMessage('用户未登录或缺少token', 'error');
        return;
    }
    
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    try {
        // 构建请求URL
        let apiUrl = 'http://localhost:3000/api/sales/categories/performance';
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        // 如果是销售人员，只查询其负责的类别
        if (user.role === 'sales') {
            params.append('salesId', user.id);
            logMessage(`销售人员模式: 添加销售ID ${user.id} 到请求`, 'info');
        }
        
        const queryString = params.toString();
        if (queryString) {
            apiUrl += `?${queryString}`;
        }
        
        logMessage(`请求URL: ${apiUrl}`, 'info');
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        logMessage(`API响应状态: ${response.status} ${response.statusText}`, 'info');
        
        if (!response.ok) {
            logMessage(`API调用失败: ${response.status} ${response.statusText}`, 'error');
            throw new Error(`获取类别销售业绩失败: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        logMessage(`API原始响应: ${responseText.substring(0, 200)}...`, 'info');
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            logMessage(`JSON解析失败: ${parseError.message}`, 'error');
            logMessage(`返回的非JSON内容: ${responseText.substring(0, 500)}`, 'error');
            throw new Error(`解析API响应失败: ${parseError.message}`);
        }
        
        hideLoadingOverlay();
        
        if (data.success) {
            logMessage(`成功获取类别业绩数据: ${data.categoryPerformance?.length || 0} 条记录`, 'info');
            // 显示类别销售业绩数据
            displayCategoryPerformance(data.categoryPerformance);
            
            // 显示时间序列销售趋势
            if (data.salesTrend) {
                logMessage(`成功获取销售趋势数据: ${data.salesTrend.length || 0} 条记录`, 'info');
                displaySalesTrend(data.salesTrend);
            }
            
            // 显示库存状态
            if (data.stockStatus) {
                displayStockStatus(data.stockStatus);
            }
        } else {
            throw new Error(data.message || '获取类别销售业绩失败');
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('加载类别销售业绩失败:', error);
        salesUtils.showNotification('加载类别销售业绩失败: ' + error.message, 'error');
    }
}

// 加载特定销售人员的类别销售业绩
async function loadSalesStaffCategoryPerformance(staffId) {
    if (!staffId) {
        logMessage('未提供销售人员ID', 'error');
        return;
    }
    
    logMessage(`开始加载销售人员(ID: ${staffId})的类别业绩数据`, 'info');
    showLoadingOverlay();
    
    const token = localStorage.getItem('token');
    if (!token) {
        logMessage('用户未登录或缺少token', 'error');
        return;
    }
    
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    try {
        // 获取销售人员信息
        const staffApiUrl = `http://localhost:3000/api/sales-staff/${staffId}`;
        logMessage(`请求销售人员信息: ${staffApiUrl}`, 'info');
        
        const staffResponse = await fetch(staffApiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        logMessage(`销售人员API响应状态: ${staffResponse.status} ${staffResponse.statusText}`, 'info');
        
        if (!staffResponse.ok) {
            logMessage(`获取销售人员信息失败: ${staffResponse.status} ${staffResponse.statusText}`, 'error');
            throw new Error(`获取销售人员信息失败: ${staffResponse.status} ${staffResponse.statusText}`);
        }
        
        const staffResponseText = await staffResponse.text();
        logMessage(`销售人员API原始响应: ${staffResponseText.substring(0, 200)}...`, 'info');
        
        let staffData;
        try {
            staffData = JSON.parse(staffResponseText);
        } catch (parseError) {
            logMessage(`JSON解析失败: ${parseError.message}`, 'error');
            logMessage(`返回的非JSON内容: ${staffResponseText.substring(0, 500)}`, 'error');
            throw new Error(`解析销售人员API响应失败: ${parseError.message}`);
        }
        
        if (staffData.success) {
            // 设置销售人员名称
            document.getElementById('staff-name').textContent = staffData.salesStaff.username;
            logMessage(`已设置销售人员名称: ${staffData.salesStaff.username}`, 'info');
        } else {
            logMessage(`获取销售人员信息API返回错误: ${staffData.message || '未知错误'}`, 'error');
            throw new Error(staffData.message || '获取销售人员信息失败');
        }
        
        // 构建业绩数据请求URL
        let apiUrl = `http://localhost:3000/api/sales-staff/${staffId}/category-performance`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const queryString = params.toString();
        if (queryString) {
            apiUrl += `?${queryString}`;
        }
        
        logMessage(`请求业绩数据URL: ${apiUrl}`, 'info');
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        logMessage(`业绩数据API响应状态: ${response.status} ${response.statusText}`, 'info');
        
        if (!response.ok) {
            logMessage(`获取销售人员类别业绩失败: ${response.status} ${response.statusText}`, 'error');
            throw new Error(`获取销售人员类别业绩失败: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        logMessage(`业绩数据API原始响应: ${responseText.substring(0, 200)}...`, 'info');
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            logMessage(`JSON解析失败: ${parseError.message}`, 'error');
            logMessage(`返回的非JSON内容: ${responseText.substring(0, 500)}`, 'error');
            throw new Error(`解析业绩数据API响应失败: ${parseError.message}`);
        }
        
        hideLoadingOverlay();
        
        if (data.success) {
            // 显示类别销售业绩数据
            displayCategoryPerformance(data.categoryPerformance, true);
            
            // 显示时间序列销售趋势
            if (data.salesTrend) {
                displaySalesTrend(data.salesTrend, true);
            }
        } else {
            logMessage(`获取销售人员类别业绩API返回错误: ${data.message || '未知错误'}`, 'error');
            throw new Error(data.message || '获取销售人员类别业绩失败');
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('加载销售人员类别业绩失败:', error);
        salesUtils.showNotification('加载销售人员类别业绩失败: ' + error.message, 'error');
    }
}

// 显示类别业绩数据
function displayCategoryPerformance(categoryData, isStaffView = false) {
    // 确定使用哪个表格和图表
    const tableId = isStaffView ? 'staff-category-performance-body' : 'category-performance-body';
    const tableBody = document.getElementById(tableId);
    
    // 如果表格不存在，则使用默认表格
    const targetTableBody = tableBody || document.getElementById('category-performance-body');
    
    targetTableBody.innerHTML = '';
    
    if (!categoryData || categoryData.length === 0) {
        targetTableBody.innerHTML = '<tr><td colspan="6" class="text-center">暂无数据</td></tr>';
        
        // 清空图表
        updateCategoryCharts([], [], [], [], isStaffView);
        return;
    }
    
    // 准备图表数据
    const categories = [];
    const revenues = [];
    const quantities = [];
    const stocks = [];
    
    // 填充表格并收集图表数据
    categoryData.forEach(category => {
        // 使用categoryUtils获取类别ID (如果尚未添加)
        if (!category.categoryId && categoryUtils.initialized) {
            category.categoryId = categoryUtils.getCategoryId(category.category);
        }
        
        const row = document.createElement('tr');
        
        // 计算平均客单价
        const avgOrderValue = category.orderCount > 0 
            ? (category.totalRevenue / category.orderCount).toFixed(2) 
            : 0;
            
        // 兼容两种命名格式：soldQuantity/salesQuantity 和 stockQuantity/currentStock
        const soldQty = category.soldQuantity || category.salesQuantity || 0;  
        const stockQty = category.stockQuantity || category.currentStock || 0;
        
        row.innerHTML = `
            <td>${category.category || '未分类'}</td>
            <td>¥${category.totalRevenue.toFixed(2)}</td>
            <td>${category.orderCount}</td>
            <td>${soldQty}</td>
            <td>¥${avgOrderValue}</td>
            <td>${stockQty}</td>
        `;
        
        targetTableBody.appendChild(row);
        
        // 收集图表数据
        categories.push(category.category || '未分类');
        revenues.push(parseFloat(category.totalRevenue.toFixed(2)));
        quantities.push(soldQty);
        stocks.push(stockQty);
    });
    
    // 更新图表
    updateCategoryCharts(categories, revenues, quantities, stocks, isStaffView);
}

// 更新类别相关的图表
function updateCategoryCharts(categories, revenues, quantities, stocks = [], isStaffView = false) {
    // 确定使用哪套图表
    const revenueChartId = isStaffView ? 'categoryrevenuechart-staffChart' : 'categoryrevenuechartChart';
    const quantityChartId = isStaffView ? 'categoryquantitychart-staffChart' : 'categoryquantitychartChart';
    const stockChartId = 'categorystockchartChart';
    const trendChartId = isStaffView ? 'salestrendchart-staffChart' : 'salestrendchartChart';
    
    // 更新销售额图表
    if (charts[revenueChartId]) {
        charts[revenueChartId].data.labels = categories;
        charts[revenueChartId].data.datasets[0].data = revenues;
        charts[revenueChartId].update();
    }
    
    // 更新销售数量图表
    if (charts[quantityChartId]) {
        charts[quantityChartId].data.labels = categories;
        charts[quantityChartId].data.datasets[0].data = quantities;
        charts[quantityChartId].update();
    }
    
    // 更新库存图表（如果有数据）
    if (!isStaffView && charts[stockChartId] && stocks.length > 0) {
        charts[stockChartId].data.labels = categories;
        charts[stockChartId].data.datasets[0].data = stocks;
        charts[stockChartId].update();
    }
}

// 显示销售趋势
function displaySalesTrend(salesTrend, isStaffView = false) {
    // 确定使用哪个趋势图表
    const trendChartId = isStaffView ? 'salestrendchart-staffChart' : 'salestrendchartChart';
    const trendChart = charts[trendChartId];
    
    if (!trendChart) return;
    
    // 获取所有日期
    const dates = Object.keys(salesTrend).sort();
    
    // 获取所有类别
    const categories = new Set();
    dates.forEach(date => {
        Object.keys(salesTrend[date]).forEach(category => {
            categories.add(category);
        });
    });
    
    // 准备数据集
    const datasets = [];
    const colorPalette = [
        'rgba(75, 192, 192, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(199, 199, 199, 1)',
        'rgba(83, 102, 255, 1)',
        'rgba(40, 180, 99, 1)',
        'rgba(205, 97, 85, 1)'
    ];
    
    let colorIndex = 0;
    
    categories.forEach(category => {
        const data = dates.map(date => {
            return salesTrend[date][category] 
                ? salesTrend[date][category].revenue 
                : 0;
        });
        
        datasets.push({
            label: category,
            data: data,
            fill: false,
            borderColor: colorPalette[colorIndex % colorPalette.length],
            tension: 0.1
        });
        
        colorIndex++;
    });
    
    // 更新图表
    trendChart.data.labels = dates;
    trendChart.data.datasets = datasets;
    trendChart.update();
}

// 显示库存状态
function displayStockStatus(stockStatus) {
    if (!stockStatus || !stockStatus.length) return;
    
    // 准备图表数据
    const categories = [];
    const stocks = [];
    
    // 遍历库存数据
    stockStatus.forEach(item => {
        categories.push(item.category || '未分类');
        stocks.push(item.stockQuantity);
    });
    
    // 更新库存图表
    if (charts.categorystockchartChart) {
        charts.categorystockchartChart.data.labels = categories;
        charts.categorystockchartChart.data.datasets[0].data = stocks;
        charts.categorystockchartChart.update();
    }
}