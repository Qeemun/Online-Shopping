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

// 定义销售异常检测标准
const anomalyThresholds = {
    // 库存警戒线
    lowStockThreshold: 5,       // 库存低于此值视为紧急库存
    criticalStockThreshold: 2,  // 库存低于此值视为严重紧急

    // 销售额异常阈值 (相对于历史平均值的百分比变化)
    salesSpikeThreshold: 0.5,   // 销售额上升50%视为异常增长
    salesDropThreshold: 0.4,    // 销售额下降40%视为异常下降
    
    // 销量异常阈值
    quantitySpikeThreshold: 0.6,  // 销量上升60%视为异常增长
    quantityDropThreshold: 0.5,   // 销量下降50%视为异常下降
    
    // 转化率异常阈值
    conversionRateDropThreshold: 0.3,  // 转化率下降30%视为异常
    
    // 平均价格异常阈值
    priceDropThreshold: 0.2,    // 平均价格下降20%视为异常
    priceRiseThreshold: 0.25    // 平均价格上升25%视为异常
};

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
        let apiUrl;
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        // 根据角色使用不同的API端点
        if (user.role === 'admin') {
            apiUrl = 'http://localhost:3000/api/admin/categories/performance';
            logMessage('管理员模式: 使用管理员API', 'info');
        } else {
            apiUrl = 'http://localhost:3000/api/sales/categories/performance';
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
    
    // 收集所有异常
    const allAnomalies = [];
      // 填充表格并收集图表数据
    categoryData.forEach(category => {
        // 使用categoryUtils获取类别ID (如果尚未添加)
        if (!category.categoryId && categoryUtils.initialized) {
            category.categoryId = categoryUtils.getCategoryId(category.category);
        }
        
        // 检测该类别的异常 (传入历史数据, 如果存在)
        let categoryAnomalies = [];
        if (window.categoryHistoricalData && window.categoryHistoricalData[category.category]) {
            categoryAnomalies = detectCategoryAnomalies(category, window.categoryHistoricalData[category.category]);
        }
        
        // 添加到全局异常列表
        if (categoryAnomalies.length > 0) {
            allAnomalies.push(...categoryAnomalies);
        }
        
        const row = document.createElement('tr');
        
        // 计算平均客单价
        const avgOrderValue = category.orderCount > 0 
            ? (category.totalRevenue / category.orderCount).toFixed(2) 
            : 0;
            
        // 兼容两种命名格式：soldQuantity/salesQuantity 和 stockQuantity/currentStock
        const soldQty = category.soldQuantity || category.salesQuantity || 0;  
        const stockQty = category.stockQuantity || category.currentStock || 0;
        
        // 添加异常指示器
        const hasAnomalies = categoryAnomalies.length > 0;
        const anomalyIndicator = hasAnomalies ? 
            `<span class="anomaly-indicator ${categoryAnomalies.some(a => a.severity === 'high') ? 'high' : 'warning'}" 
                  data-category="${category.category}">⚠</span>` : '';
        
        row.innerHTML = `
            <td>${category.category || '未分类'} ${anomalyIndicator}</td>
            <td>¥${category.totalRevenue.toFixed(2)}</td>
            <td>${category.orderCount}</td>
            <td>${soldQty}</td>
            <td>¥${avgOrderValue}</td>
            <td>${stockQty}</td>
        `;
        
        // 如果有异常，添加点击事件查看详情
        if (hasAnomalies) {
            row.classList.add('has-anomalies');
            row.addEventListener('click', () => {
                // 显示该类别的所有异常
                displaySalesAnomalies(categoryAnomalies);
            });
        }
        
        targetTableBody.appendChild(row);
        
        // 收集图表数据
        categories.push(category.category || '未分类');
        revenues.push(parseFloat(category.totalRevenue.toFixed(2)));
        quantities.push(soldQty);
        stocks.push(stockQty);
    });
      // 更新图表
    updateCategoryCharts(categories, revenues, quantities, stocks, isStaffView);
    
    // 如果有异常，显示异常警报
    if (allAnomalies.length > 0) {
        displaySalesAnomalies(allAnomalies);
    }
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

/**
 * 检测销售异常
 * @param {Object} product - 产品数据对象
 * @param {Array} historicalData - 历史销售数据
 * @returns {Array} 检测到的异常列表
 */
function detectSalesAnomalies(product, historicalData = []) {
    const anomalies = [];
    
    // 1. 检测库存异常
    if (product.stock <= anomalyThresholds.criticalStockThreshold) {
        anomalies.push({
            type: 'critical_stock',
            severity: 'high',
            message: `严重库存警告：${product.name} 库存仅剩 ${product.stock} 件`,
            product: product
        });
    } else if (product.stock <= anomalyThresholds.lowStockThreshold) {
        anomalies.push({
            type: 'low_stock',
            severity: 'medium',
            message: `库存警告：${product.name} 库存仅剩 ${product.stock} 件`,
            product: product
        });
    }
    
    // 如果有历史数据，进行销售异常检测
    if (historicalData && historicalData.length >= 2) {
        // 获取最新两个时间段的数据进行比较
        const current = historicalData[historicalData.length - 1];
        const previous = historicalData[historicalData.length - 2];
        
        // 2. 检测销售额异常
        if (previous.revenue > 0) {
            const revenueChange = (current.revenue - previous.revenue) / previous.revenue;
            
            if (revenueChange >= anomalyThresholds.salesSpikeThreshold) {
                anomalies.push({
                    type: 'sales_spike',
                    severity: 'info',
                    message: `销售额突增：${product.name} 销售额上涨了 ${Math.round(revenueChange * 100)}%`,
                    product: product,
                    data: { current: current.revenue, previous: previous.revenue, change: revenueChange }
                });
            } else if (revenueChange <= -anomalyThresholds.salesDropThreshold) {
                anomalies.push({
                    type: 'sales_drop',
                    severity: 'warning',
                    message: `销售额下降：${product.name} 销售额下降了 ${Math.round(Math.abs(revenueChange) * 100)}%`,
                    product: product,
                    data: { current: current.revenue, previous: previous.revenue, change: revenueChange }
                });
            }
        }
        
        // 3. 检测销量异常
        if (previous.quantity > 0) {
            const quantityChange = (current.quantity - previous.quantity) / previous.quantity;
            
            if (quantityChange >= anomalyThresholds.quantitySpikeThreshold) {
                anomalies.push({
                    type: 'quantity_spike',
                    severity: 'info',
                    message: `销量激增：${product.name} 销量增加了 ${Math.round(quantityChange * 100)}%`,
                    product: product,
                    data: { current: current.quantity, previous: previous.quantity, change: quantityChange }
                });
            } else if (quantityChange <= -anomalyThresholds.quantityDropThreshold) {
                anomalies.push({
                    type: 'quantity_drop',
                    severity: 'warning',
                    message: `销量下降：${product.name} 销量下降了 ${Math.round(Math.abs(quantityChange) * 100)}%`,
                    product: product,
                    data: { current: current.quantity, previous: previous.quantity, change: quantityChange }
                });
            }
        }
        
        // 4. 检测转化率异常 (如果有浏览数据)
        if (current.views && previous.views && previous.views > 0 && previous.quantity > 0) {
            const currentConversion = current.quantity / current.views;
            const previousConversion = previous.quantity / previous.views;
            
            if (previousConversion > 0) {
                const conversionChange = (currentConversion - previousConversion) / previousConversion;
                
                if (conversionChange <= -anomalyThresholds.conversionRateDropThreshold) {
                    anomalies.push({
                        type: 'conversion_drop',
                        severity: 'warning',
                        message: `转化率下降：${product.name} 转化率下降了 ${Math.round(Math.abs(conversionChange) * 100)}%`,
                        product: product,
                        data: { current: currentConversion, previous: previousConversion, change: conversionChange }
                    });
                }
            }
        }
        
        // 5. 检测平均价格异常
        if (previous.quantity > 0 && current.quantity > 0) {
            const currentAvgPrice = current.revenue / current.quantity;
            const previousAvgPrice = previous.revenue / previous.quantity;
            
            if (previousAvgPrice > 0) {
                const priceChange = (currentAvgPrice - previousAvgPrice) / previousAvgPrice;
                
                if (priceChange <= -anomalyThresholds.priceDropThreshold) {
                    anomalies.push({
                        type: 'price_drop',
                        severity: 'warning',
                        message: `价格下降：${product.name} 平均售价下降了 ${Math.round(Math.abs(priceChange) * 100)}%`,
                        product: product,
                        data: { current: currentAvgPrice, previous: previousAvgPrice, change: priceChange }
                    });
                } else if (priceChange >= anomalyThresholds.priceRiseThreshold) {
                    anomalies.push({
                        type: 'price_rise',
                        severity: 'info',
                        message: `价格上升：${product.name} 平均售价上升了 ${Math.round(priceChange * 100)}%`,
                        product: product,
                        data: { current: currentAvgPrice, previous: previousAvgPrice, change: priceChange }
                    });
                }
            }
        }
    }
    
    return anomalies;
}

/**
 * 检测类别销售异常
 * @param {Object} categoryData - 类别销售数据
 * @param {Array} historicalData - 历史销售数据
 * @returns {Array} 检测到的异常列表
 */
function detectCategoryAnomalies(categoryData, historicalData = []) {
    const anomalies = [];
    
    // 如果没有足够的历史数据进行比较，返回空数组
    if (!historicalData || historicalData.length < 2) {
        return anomalies;
    }
    
    // 获取最新两个时间段的数据进行比较
    const current = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];
    
    // 1. 检测类别销售额异常
    if (previous.totalRevenue > 0) {
        const revenueChange = (current.totalRevenue - previous.totalRevenue) / previous.totalRevenue;
        
        if (revenueChange >= anomalyThresholds.salesSpikeThreshold) {
            anomalies.push({
                type: 'category_revenue_spike',
                severity: 'info',
                message: `类别销售额激增：${categoryData.category} 销售额上涨了 ${Math.round(revenueChange * 100)}%`,
                category: categoryData.category,
                data: { current: current.totalRevenue, previous: previous.totalRevenue, change: revenueChange }
            });
        } else if (revenueChange <= -anomalyThresholds.salesDropThreshold) {
            anomalies.push({
                type: 'category_revenue_drop',
                severity: 'warning',
                message: `类别销售额下降：${categoryData.category} 销售额下降了 ${Math.round(Math.abs(revenueChange) * 100)}%`,
                category: categoryData.category,
                data: { current: current.totalRevenue, previous: previous.totalRevenue, change: revenueChange }
            });
        }
    }
    
    // 2. 检测类别销量异常
    if (previous.soldQuantity > 0) {
        const quantityChange = (current.soldQuantity - previous.soldQuantity) / previous.soldQuantity;
        
        if (quantityChange >= anomalyThresholds.quantitySpikeThreshold) {
            anomalies.push({
                type: 'category_quantity_spike',
                severity: 'info',
                message: `类别销量激增：${categoryData.category} 销量增加了 ${Math.round(quantityChange * 100)}%`,
                category: categoryData.category,
                data: { current: current.soldQuantity, previous: previous.soldQuantity, change: quantityChange }
            });
        } else if (quantityChange <= -anomalyThresholds.quantityDropThreshold) {
            anomalies.push({
                type: 'category_quantity_drop',
                severity: 'warning',
                message: `类别销量下降：${categoryData.category} 销量下降了 ${Math.round(Math.abs(quantityChange) * 100)}%`,
                category: categoryData.category,
                data: { current: current.soldQuantity, previous: previous.soldQuantity, change: quantityChange }
            });
        }
    }
    
    // 3. 检测类别库存异常
    // 计算当前库存与销量的比例
    if (current.soldQuantity > 0) {
        const stockToSalesRatio = categoryData.stockQuantity / current.soldQuantity;
        
        if (stockToSalesRatio < 2) { // 库存不足以支撑2个时间单位的销售
            anomalies.push({
                type: 'category_low_stock',
                severity: 'high',
                message: `类别库存警告：${categoryData.category} 当前库存仅能支撑 ${stockToSalesRatio.toFixed(1)} 个周期的销售`,
                category: categoryData.category,
                data: { stock: categoryData.stockQuantity, sales: current.soldQuantity, ratio: stockToSalesRatio }
            });
        }
    }
    
    return anomalies;
}

/**
 * 显示销售异常警报
 * @param {Array} anomalies - 检测到的异常列表
 */
function displaySalesAnomalies(anomalies) {
    // 获取或创建异常警报容器
    let anomalyContainer = document.getElementById('anomaly-alerts');
    if (!anomalyContainer) {
        anomalyContainer = document.createElement('div');
        anomalyContainer.id = 'anomaly-alerts';
        anomalyContainer.className = 'anomaly-alerts-container';
        
        // 添加标题
        const title = document.createElement('h3');
        title.textContent = '销售异常监控';
        anomalyContainer.appendChild(title);
        
        // 将容器添加到页面
        const mainContent = document.querySelector('main') || document.body;
        mainContent.insertBefore(anomalyContainer, mainContent.firstChild);
    }
    
    // 清除旧的警报
    const alertList = anomalyContainer.querySelector('.anomaly-list') || document.createElement('div');
    alertList.className = 'anomaly-list';
    alertList.innerHTML = '';
    
    // 如果没有异常，显示正常状态
    if (anomalies.length === 0) {
        const normalItem = document.createElement('div');
        normalItem.className = 'anomaly-item normal';
        normalItem.innerHTML = '<span class="status">✓</span> 所有指标正常';
        alertList.appendChild(normalItem);
    } else {
        // 按严重程度排序
        const severityOrder = { high: 0, warning: 1, medium: 2, info: 3 };
        anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        
        // 添加异常警报
        anomalies.forEach(anomaly => {
            const anomalyItem = document.createElement('div');
            anomalyItem.className = `anomaly-item ${anomaly.severity}`;
            
            // 设置图标
            let icon;
            switch (anomaly.severity) {
                case 'high': icon = '⚠️'; break;
                case 'warning': icon = '⚠'; break;
                case 'medium': icon = '⚠'; break;
                case 'info': icon = 'ℹ️'; break;
                default: icon = '•';
            }
            
            anomalyItem.innerHTML = `<span class="status">${icon}</span> ${anomaly.message}`;
            
            // 添加详情按钮
            if (anomaly.data) {
                const detailsBtn = document.createElement('button');
                detailsBtn.className = 'details-btn';
                detailsBtn.textContent = '详情';
                detailsBtn.onclick = () => showAnomalyDetails(anomaly);
                anomalyItem.appendChild(detailsBtn);
            }
            
            alertList.appendChild(anomalyItem);
        });
    }
    
    // 确保警报列表在容器中
    if (!anomalyContainer.contains(alertList)) {
        anomalyContainer.appendChild(alertList);
    }
    
    // 显示异常数量
    const countBadge = document.querySelector('.anomaly-count') || document.createElement('div');
    countBadge.className = 'anomaly-count';
    
    const highSeverity = anomalies.filter(a => a.severity === 'high').length;
    if (highSeverity > 0) {
        countBadge.textContent = highSeverity;
        countBadge.classList.add('critical');
    } else if (anomalies.length > 0) {
        countBadge.textContent = anomalies.length;
        countBadge.classList.remove('critical');
    } else {
        countBadge.textContent = '0';
        countBadge.classList.remove('critical');
    }
    
    // 确保计数徽章在容器中
    if (!anomalyContainer.contains(countBadge)) {
        anomalyContainer.insertBefore(countBadge, anomalyContainer.firstChild);
    }
}

/**
 * 显示异常详情
 * @param {Object} anomaly - 异常对象
 */
function showAnomalyDetails(anomaly) {
    // 使用模板创建模态对话框
    const template = document.getElementById('anomaly-modal-template');
    if (!template) {
        console.error('异常详情模板不存在');
        return;
    }

    // 复制模板
    const modal = template.cloneNode(true);
    modal.id = '';
    modal.style.display = 'block';
    
    // 获取模态内容元素
    const modalContent = modal.querySelector('.anomaly-modal-content');
    const closeBtn = modal.querySelector('.close-btn');
    const title = modal.querySelector('#anomaly-title');
    
    // 设置关闭按钮事件
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    // 设置标题
    title.textContent = getAnomalyTitle(anomaly.type);
    
    // 添加内容
    const content = document.createElement('div');
    content.className = 'anomaly-details';
    
    // 根据异常类型生成详细信息
    let detailsHTML = `<p>${anomaly.message}</p>`;
    
    if (anomaly.data) {
        detailsHTML += `<div class="data-comparison">
            <div class="data-item">
                <span class="data-label">当前值:</span>
                <span class="data-value">${formatValue(anomaly.data.current, anomaly.type)}</span>
            </div>
            <div class="data-item">
                <span class="data-label">上一周期:</span>
                <span class="data-value">${formatValue(anomaly.data.previous, anomaly.type)}</span>
            </div>
            <div class="data-item ${anomaly.data.change >= 0 ? 'increase' : 'decrease'}">
                <span class="data-label">变化率:</span>
                <span class="data-value">${(anomaly.data.change * 100).toFixed(2)}%</span>
            </div>
        </div>`;
        
        // 添加图表容器
        detailsHTML += '<div class="chart-container"><canvas id="anomaly-chart"></canvas></div>';
    }
    
    // 添加建议
    detailsHTML += `<div class="recommendations">
        <h4>建议操作:</h4>
        <ul>
            ${getAnomalyRecommendations(anomaly).map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>`;
    
    content.innerHTML = detailsHTML;
    
    // 组装模态框
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    
    // 添加到页面
    document.body.appendChild(modal);
    
    // 如果有数据，绘制图表
    if (anomaly.data) {
        setTimeout(() => {
            const ctx = document.getElementById('anomaly-chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['上一周期', '当前周期'],
                    datasets: [{
                        label: getAnomalyMetricLabel(anomaly.type),
                        data: [anomaly.data.previous, anomaly.data.current],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.5)',
                            anomaly.data.change >= 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            anomaly.data.change >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }, 100);
    }
}

// 辅助函数：根据异常类型获取标题
function getAnomalyTitle(type) {
    const titles = {
        'critical_stock': '严重库存不足警告',
        'low_stock': '库存不足警告',
        'sales_spike': '销售额异常增长',
        'sales_drop': '销售额异常下降',
        'quantity_spike': '销量异常增长',
        'quantity_drop': '销量异常下降',
        'conversion_drop': '转化率下降',
        'price_drop': '价格下跌',
        'price_rise': '价格上涨',
        'category_revenue_spike': '类别销售额激增',
        'category_revenue_drop': '类别销售额下降',
        'category_quantity_spike': '类别销量激增',
        'category_quantity_drop': '类别销量下降',
        'category_low_stock': '类别库存不足'
    };
    
    return titles[type] || '销售异常警报';
}

// 辅助函数：根据异常类型获取度量标签
function getAnomalyMetricLabel(type) {
    if (type.includes('revenue')) return '销售额';
    if (type.includes('quantity')) return '销量';
    if (type.includes('price')) return '价格';
    if (type.includes('conversion')) return '转化率';
    if (type.includes('stock')) return '库存';
    return '数值';
}

// 辅助函数：格式化数值
function formatValue(value, type) {
    if (type.includes('revenue') || type.includes('price')) {
        return `¥${value.toFixed(2)}`;
    }
    if (type.includes('conversion')) {
        return `${(value * 100).toFixed(2)}%`;
    }
    return value.toString();
}

// 辅助函数：根据异常类型获取建议
function getAnomalyRecommendations(anomaly) {
    const recommendations = {
        'critical_stock': [
            '紧急补充库存，立即联系供应商',
            '考虑调高价格以减缓销售速度',
            '为顾客提供替代产品建议'
        ],
        'low_stock': [
            '检查供应链，补充库存',
            '调整库存预警水平',
            '分析产品需求预测，提前备货'
        ],
        'sales_spike': [
            '分析销售激增原因（促销、季节性、外部事件等）',
            '评估是否需要增加库存以满足需求',
            '考虑是否调整价格策略以最大化利润'
        ],
        'sales_drop': [
            '分析销售下降原因（竞争、季节性、产品问题等）',
            '考虑促销活动以刺激销售',
            '检查产品质量和客户反馈',
            '评估是否需要调整价格或产品定位'
        ],
        'quantity_spike': [
            '确保有足够库存满足增长的需求',
            '分析是什么因素导致销量激增',
            '考虑相似产品是否也应该增加库存'
        ],
        'quantity_drop': [
            '检查产品是否存在问题或负面评价',
            '考虑产品促销或捆绑销售',
            '评估产品的市场定位是否需要调整'
        ],
        'conversion_drop': [
            '检查产品页面是否存在技术问题',
            '分析用户行为，找出转化障碍',
            '考虑改进产品展示或描述',
            '评估价格竞争力'
        ],
        'price_drop': [
            '分析价格下降对销量的影响',
            '评估是否需要调整定价策略',
            '检查是否有竞争对手降价'
        ],
        'price_rise': [
            '分析价格上升对销量的影响',
            '评估客户接受度',
            '监控转化率变化'
        ],
        'category_revenue_spike': [
            '分析类别销售增长的主要贡献产品',
            '评估是否需要增加该类别的库存',
            '考虑扩大该类别的产品线'
        ],
        'category_revenue_drop': [
            '识别类别销售下降的主要问题产品',
            '分析竞争情况和市场趋势',
            '考虑类别促销活动或产品更新'
        ],
        'category_quantity_spike': [
            '确保类别内所有产品有足够库存',
            '分析热销产品特点，应用到其他产品',
            '评估是否扩大该类别的营销预算'
        ],
        'category_quantity_drop': [
            '检查类别产品是否存在共性问题',
            '评估类别市场需求变化',
            '考虑调整产品组合或促销策略'
        ],
        'category_low_stock': [
            '紧急补充类别内关键产品库存',
            '评估供应链效率',
            '调整类别库存管理策略'
        ]
    };
    
    return recommendations[anomaly.type] || ['分析异常原因', '制定相应的调整策略'];
}

/**
 * 加载类别历史销售数据
 * @param {string} categoryId - 类别ID
 * @param {number} days - 天数
 * @returns {Promise} - 返回Promise对象
 */
async function loadHistoricalCategoryData(categoryId, days = 30) {
    try {
        const url = `/api/sales/category/${categoryId}/history?days=${days}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 确保全局历史数据对象存在
        if (!window.categoryHistoricalData) {
            window.categoryHistoricalData = {};
        }
        
        // 按类别名称存储历史数据
        if (data.category && data.historyData) {
            window.categoryHistoricalData[data.category] = data.historyData;
        }
        
        return data;
    } catch (error) {
        logMessage(`加载类别历史数据失败: ${error.message}`, 'error');
        return null;
    }
}

/**
 * 批量加载所有类别的历史销售数据
 * @param {Array} categories - 类别列表
 * @param {number} days - 天数
 */
async function loadAllCategoriesHistoricalData(categories, days = 30) {
    if (!categories || categories.length === 0) return;
    
    // 创建全局历史数据对象（如果不存在）
    if (!window.categoryHistoricalData) {
        window.categoryHistoricalData = {};
    }
    
    // 批量请求所有类别的历史数据
    try {
        const categoryIds = categories.map(c => c.categoryId).filter(id => id);
        const url = `/api/sales/categories/history?ids=${categoryIds.join(',')}&days=${days}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 处理返回的数据
        if (data && Array.isArray(data)) {
            data.forEach(item => {
                if (item.category && item.historyData) {
                    window.categoryHistoricalData[item.category] = item.historyData;
                }
            });
            
            logMessage(`已加载 ${data.length} 个类别的历史数据`, 'info');
        }
    } catch (error) {
        logMessage(`批量加载类别历史数据失败: ${error.message}`, 'error');
    }
}