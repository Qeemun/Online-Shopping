/**
 * reports.js - 简化版销售报表控制脚本
 * 专注于类别销售统计和报表功能
 */

// 全局变量
const salesUtils = new SalesUtils();
let currentUserRole = null;

// 日志函数
function logMessage(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${type.toUpperCase()}] [reports.js]`;
    
    if (type === 'error') {
        console.error(`${logPrefix} ${message}`);
    } else if (type === 'warn') {
        console.warn(`${logPrefix} ${message}`);
    } else {
        console.log(`${logPrefix} ${message}`);
    }
}

/**
 * 显示错误信息
 * @param {string} message - 错误消息内容
 */
function showErrorMessage(message) {
    // 创建错误提示元素（如果不存在）
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-notification';
        document.body.appendChild(errorDiv);
    }
    
    // 显示错误消息
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 切换子选项卡
function switchTab(tabId, activeTab) {
    // 隐藏所有内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 移除所有选项卡的active类
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示选中的内容区域
    document.getElementById(tabId).classList.add('active');
    
    // 激活选中的选项卡
    activeTab.classList.add('active');
}

// 处理日期范围变更
function updateDateRange(value) {
    const customDateContainer = document.getElementById('custom-date-container');
    if (customDateContainer) {
        customDateContainer.style.display = value === 'custom' ? 'flex' : 'none';
    }
    
    if (value !== 'custom') {
        // 自动重新加载数据
        loadSalesOverview();
        loadCategorySales();
    }
}

// 应用自定义日期范围
function applyCustomDateRange() {
    loadSalesOverview();
    loadCategorySales();
}

// 按类别过滤
function filterByCategory(category) {
    loadSalesOverview(category);
    loadCategorySales(category);
}

// 加载销售数据时根据用户权限过滤
async function loadDataWithRoleFilter(apiEndpoint, params = {}) {
    try {
        logMessage(`开始加载数据: ${apiEndpoint}`, 'info');
        
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token) {
            logMessage('用户未登录或缺少token', 'error');
            showErrorMessage('您需要登录才能访问此页面');
            // 重定向到登录页
            setTimeout(() => {
                window.location.href = 'login.html?redirect=reports.html';
            }, 2000);
            return null;
        }
        
        // 构建查询参数
        const queryParams = new URLSearchParams(params).toString();
          // 构建API URL - 使用正确的路由路径
        const url = `http://localhost:3000/api/sales-reports/${apiEndpoint}${queryParams ? '?' + queryParams : ''}`;
        logMessage(`请求URL: ${url}`, 'info');
        
        // 添加超时设置
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json' // 显式请求JSON响应
            },
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        logMessage(`API响应状态: ${response.status} ${response.statusText}`, 'info');
        
        if (!response.ok) {
            logMessage(`API调用失败: ${response.status} ${response.statusText}`, 'error');
            
            // 添加更详细的错误处理
            if (response.status === 403) {
                showErrorMessage('权限不足，无法访问请求的数据');
                return { success: false, error: '权限不足' };
            } else if (response.status === 500) {
                showErrorMessage('服务器内部错误，请稍后再试');
                return { success: false, error: '服务器内部错误' };
            } else if (response.status === 404) {
                showErrorMessage('请求的资源不存在');
                return { success: false, error: '资源不存在' };
            }
            
            return { success: false, error: `请求失败(${response.status})` };
        }
        
        // 检查内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            logMessage(`响应不是JSON格式: ${contentType}`, 'error');
            const text = await response.text();
            logMessage(`非JSON响应内容: ${text.substring(0, 200)}...`, 'error');
            showErrorMessage('服务器返回了非JSON格式的数据');
            return null;
        }
        
        // 直接使用response.json()而不是先获取文本再解析
        try {
            const jsonData = await response.json();
            return jsonData;
        } catch (parseError) {
            logMessage(`JSON解析失败: ${parseError.message}`, 'error');
            const text = await response.text();
            logMessage(`原始响应内容: ${text.substring(0, 200)}...`, 'error');
            showErrorMessage('无法解析服务器返回的数据');
            return null;
        }
    } catch (error) {
        logMessage(`API请求或处理异常: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * 显示空数据信息
 * @param {string} containerId - 容器ID
 * @param {string} message - 消息内容
 */
function showEmptyDataMessage(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="empty-data">${message}</div>`;
    }
}

/**
 * 格式化数字为带千分位的格式
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 加载销售概览数据
 * @param {string} category - 可选的类别筛选
 */
async function loadSalesOverview(category = '') {
    logMessage('加载销售概览数据', 'info');
    
    try {
        // 获取日期范围
        const dateParams = getSelectedDateRange();
        
        // 添加类别过滤参数（如果有）
        if (category) {
            dateParams.category = category;
        }
        
        // 从API获取销售概览数据
        const data = await loadDataWithRoleFilter('sales-overview', dateParams);
        
        if (data && data.success) {
            logMessage('成功获取销售概览数据', 'info');
            
            // 更新统计卡片
            document.getElementById('total-revenue').textContent = `¥${formatNumber(data.totalRevenue.toFixed(2))}`;
            document.getElementById('total-orders').textContent = formatNumber(data.orderCount);
            document.getElementById('avg-order-value').textContent = `¥${formatNumber((data.totalRevenue / data.orderCount || 0).toFixed(2))}`;
            document.getElementById('total-quantity').textContent = formatNumber(data.totalQuantity);
            
            // 渲染销售趋势图表
            renderSalesTrendChart(data.salesTrend);
        } else {
            logMessage('加载销售概览数据失败: 服务器返回非成功状态', 'error');
            document.getElementById('total-revenue').textContent = `¥0.00`;
            document.getElementById('total-orders').textContent = `0`;
            document.getElementById('avg-order-value').textContent = `¥0.00`;
            document.getElementById('total-quantity').textContent = `0`;
            showEmptyDataMessage('sales-trend-chart', '暂无销售趋势数据');
        }
    } catch (error) {
        logMessage(`加载销售概览数据异常: ${error.message}`, 'error');
        document.getElementById('total-revenue').textContent = `¥0.00`;
        document.getElementById('total-orders').textContent = `0`;
        document.getElementById('avg-order-value').textContent = `¥0.00`;
        document.getElementById('total-quantity').textContent = `0`;
        showEmptyDataMessage('sales-trend-chart', '加载销售趋势数据失败');
    }
}

/**
 * 加载类别销售数据
 * @param {string} category - 可选的类别筛选
 */
async function loadCategorySales(category = '') {
    logMessage('加载类别销售数据', 'info');
    
    try {
        // 清空之前的错误消息
        document.querySelectorAll('.error-notification').forEach(el => {
            el.style.display = 'none';
        });
        
        // 显示加载指示器
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'loading-spinner';
        loadingIndicator.innerHTML = '<span>正在加载数据...</span>';
        document.body.appendChild(loadingIndicator);
        
        // 获取日期范围
        const dateParams = getSelectedDateRange();
        
        // 添加类别过滤参数（如果有）
        if (category) {
            dateParams.category = category;
        }
        
        // 从API获取类别销售数据
        try {
            const data = await loadDataWithRoleFilter('category-sales', dateParams);
            
            // 移除加载指示器
            const indicator = document.getElementById('loading-indicator');
            if (indicator) indicator.remove();
            
            if (!data) {
                logMessage('获取类别销售数据失败', 'error');
                showEmptyDataMessage('category-table-body', '无法加载数据，请稍后再试');
                // 显示空数据消息到所有图表区域
                showEmptyDataMessage('revenue-tab', '无法加载数据');
                showEmptyDataMessage('orders-tab', '无法加载数据'); 
                showEmptyDataMessage('quantity-tab', '无法加载数据');
                return;
            }
            
            if (data && data.success && data.categorySales && data.categorySales.length > 0) {
                logMessage('成功获取类别销售数据', 'info');
                
                // 准备图表数据
                const categories = [];
                const revenues = [];
                const quantities = [];
                
                data.categorySales.forEach(item => {
                    categories.push(item.category || '未分类');
                    revenues.push(parseFloat(item.revenue) || 0);
                    quantities.push(parseInt(item.quantity) || 0);
                });
                
                // 渲染图表
                renderCategoryChart('revenue-tab', categories, revenues, '销售额');
                renderCategoryChart('orders-tab', categories, quantities, '销售量');
                renderCategoryChart('quantity-tab', categories, quantities, '销售量');
                
                // 显示类别销售详细表格数据
                displayCategorySalesTable(data.categorySales);
            } else {
                logMessage('加载类别销售数据失败: 服务器返回非成功状态或无数据', 'error');                showEmptyDataMessage('revenue-tab', '暂无类别销售数据');
                showEmptyDataMessage('orders-tab', '暂无类别销售数据');
                showEmptyDataMessage('quantity-tab', '暂无类别销售数据');
                
                // 显示空表格消息
                showEmptyDataMessage('category-table-body', '暂无类别销售数据');
            }
        } catch (error) {
            logMessage(`内部API调用异常: ${error.message}`, 'error');
            showEmptyDataMessage('revenue-tab', '获取数据失败');
            showEmptyDataMessage('orders-tab', '获取数据失败');
            showEmptyDataMessage('quantity-tab', '获取数据失败');
            showEmptyDataMessage('category-table-body', '获取数据失败，请稍后再试');
            showErrorMessage(`获取销售数据失败: ${error.message}`);
        }
    } catch (error) {
        // 移除加载指示器
        const indicator = document.getElementById('loading-indicator');
        if (indicator) indicator.remove();
        
        logMessage(`加载类别销售数据异常: ${error.message}`, 'error');
        showEmptyDataMessage('revenue-tab', '加载类别销售数据失败');
        showEmptyDataMessage('orders-tab', '加载类别销售数据失败');
        showEmptyDataMessage('quantity-tab', '加载类别销售数据失败');
        showEmptyDataMessage('category-table-body', '加载类别销售数据失败');
        showErrorMessage(`加载销售数据时出错: ${error.message}`);
    }
}

/**
 * 显示类别销售表格数据
 * @param {Array} categorySales - 类别销售数据数组
 */
function displayCategorySalesTable(categorySales) {
    // 获取表格容器
    const tableBody = document.querySelector('#category-sales-body');
    if (!tableBody) {
        logMessage('未找到类别销售表格容器', 'error');
        return;
    }
    
    // 清空现有内容
    tableBody.innerHTML = '';
    
    if (!categorySales || categorySales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">暂无类别销售数据</td>
            </tr>
        `;
        return;
    }
    
    try {
        categorySales.forEach(item => {
            const tr = document.createElement('tr');
            // 使用默认值处理可能不存在的属性
            const revenue = item.revenue || 0;
            const orderCount = item.orderCount || 0;
            const quantity = item.quantity || 0;
            const viewCount = item.viewCount || 0;
              // 使用后端提供的转化率，如果没有则在前端计算
            let conversionRate;
            if (item.conversionRate !== undefined) {
                conversionRate = `${parseFloat(item.conversionRate).toFixed(2)}%`;
            } else {
                conversionRate = viewCount > 0 ? `${((orderCount / viewCount) * 100).toFixed(2)}%` : 'N/A';
            }
            
            // 增长率处理，确保显示格式正确
            const growthRate = item.growthRate != null 
                ? `${parseFloat(item.growthRate) > 0 ? '+' : ''}${parseFloat(item.growthRate).toFixed(2)}%` 
                : 'N/A';
            
            tr.innerHTML = `
                <td>${item.category || '未分类'}</td>
                <td>¥${revenue.toFixed(2)}</td>
                <td>${orderCount}</td>
                <td>${quantity}</td>
                <td>${conversionRate}</td>
                <td>${growthRate}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        logMessage(`显示类别销售表格数据出错: ${error.message}`, 'error');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">处理数据时出错</td>
            </tr>
        `;
    }
}

/**
 * 获取用户选择的日期范围
 * @returns {Object} 日期范围参数
 */
function getSelectedDateRange() {
    const dateRange = document.getElementById('date-range').value;
    const params = {};
    
    if (dateRange === 'custom') {
        // 使用自定义日期
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
    } else {
        // 计算预设日期范围
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange || 30)); // 默认30天
        
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
    }
    
    logMessage(`选择的日期范围: ${JSON.stringify(params)}`, 'info');
    return params;
}

/**
 * 渲染销售趋势图表
 * @param {Array} salesTrend - 销售趋势数据
 */
function renderSalesTrendChart(salesTrend) {
    logMessage('渲染销售趋势图表', 'info');
    
    const ctx = document.getElementById('sales-trend-chart');
    if (!ctx) {
        logMessage('未找到销售趋势图表画布', 'error');
        return;
    }
    
    // 如果已经存在图表，先销毁它
    if (window.salesTrendChart) {
        window.salesTrendChart.destroy();
    }
    
    // 准备数据
    const labels = salesTrend.map(item => item.period);
    const revenueData = salesTrend.map(item => item.revenue);
    const orderCountData = salesTrend.map(item => item.orderCount);
    
    // 创建图表
    window.salesTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '销售额',
                    data: revenueData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: '订单数',
                    data: orderCountData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y1',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '销售额 (¥)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '订单数'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

/**
 * 渲染类别销售图表
 * @param {string} containerId - 容器ID
 * @param {Array} labels - 类别标签
 * @param {Array} data - 数据值
 * @param {string} dataLabel - 数据标签
 */
function renderCategoryChart(containerId, labels, data, dataLabel) {
    logMessage(`渲染类别图表 - ${containerId}`, 'info');
    
    const container = document.getElementById(containerId);
    if (!container) {
        logMessage(`未找到图表容器: ${containerId}`, 'error');
        return;
    }
    
    const ctx = container.querySelector('canvas');
    if (!ctx) {
        logMessage(`在容器 ${containerId} 中未找到画布`, 'error');
        return;
    }
    
    // 检查数据是否有效
    if (!labels || !data || labels.length === 0 || data.length === 0) {
        logMessage(`图表数据无效: ${containerId}`, 'error');
        showEmptyDataMessage(containerId, '暂无图表数据');
        return;
    }
    
    try {
        // 如果已经存在图表，先销毁它
        if (window[`chart_${containerId}`]) {
            window[`chart_${containerId}`].destroy();
        }
          // 生成随机颜色
        const backgroundColors = labels.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
    
        // 创建图表
        window[`chart_${containerId}`] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: dataLabel,
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `${dataLabel}: ${dataLabel === '销售额' ? '¥' + value.toLocaleString() : value.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: dataLabel
                        }
                    }
                }
            }
        });
    } catch (error) {
        logMessage(`渲染图表出错 - ${containerId}: ${error.message}`, 'error');
        showEmptyDataMessage(containerId, '图表渲染失败，请刷新页面重试');
    }
}

// 加载类别选项
async function loadCategoryOptions() {
    try {
        logMessage('开始加载商品类别选项', 'info');
        
        // 从token获取认证信息
        const token = localStorage.getItem('token');
        if (!token) {
            logMessage('用户未登录，无法获取类别选项', 'error');
            throw new Error('用户未登录，无法获取类别选项');
        }
        
        // 使用我们自己创建的路由获取所有类别
        const response = await fetch('http://localhost:3000/sales-reports/category-list', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取类别失败: ${response.status} ${response.statusText}`);
        }
        
        // 检查内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            logMessage(`类别API响应不是JSON格式: ${contentType}`, 'error');
            throw new Error('返回的类别数据不是JSON格式');
        }
        
        const data = await response.json();
        logMessage(`获取到类别数据: ${JSON.stringify(data)}`, 'info');
        
        if (data.success && data.categories) {
            const categoryFilter = document.getElementById('category-filter');
            if (categoryFilter) {
                // 清空现有选项（除了第一个"所有类别"选项）
                while (categoryFilter.options.length > 1) {
                    categoryFilter.remove(1);
                }
                
                // 添加新选项
                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;  // 直接使用类别名称，因为API返回的是字符串数组
                    option.textContent = category;
                    categoryFilter.appendChild(option);
                });
                
                logMessage(`成功添加 ${data.categories.length} 个类别选项`, 'info');
            }
            return data.categories; // 返回类别列表以便其他函数使用
        } else {
            logMessage('类别数据格式不正确或为空', 'warn');
            return [];
        }
    } catch (error) {
        logMessage(`加载类别选项异常: ${error.message}`, 'error');
        
        // 如果发生错误，尝试从后端请求已有的类别
        try {
            // 获取销售类别数据
            const categoryData = await loadDataWithRoleFilter('category-list', {});
            if (categoryData && categoryData.categories) {
                const categoryFilter = document.getElementById('category-filter');
                if (categoryFilter) {
                    // 添加类别选项
                    categoryData.categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        categoryFilter.appendChild(option);
                    });
                }
            }
        } catch (fallbackError) {
            logMessage(`无法加载类别数据: ${fallbackError.message}`, 'error');
            // 不阻止应用继续运行
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 检查用户是否登录
        const token = localStorage.getItem('token');
        if (!token) {
            showErrorMessage('您需要登录才能访问此页面');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=reports.html';
            }, 2000);
            return;
        }
        
        // 设置当前日期为日期选择器的默认值
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        if (startDateInput) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        
        if (endDateInput) {
            endDateInput.value = today;
        }
        
        // 先加载类别选项
        loadCategoryOptions()
            .then(() => {
                // 等类别加载完毕后再加载报表数据
                loadSalesOverview();
                loadCategorySales();
            })
            .catch(err => {
                console.error('初始化报表失败:', err);
                showErrorMessage('初始化报表失败，请刷新页面重试');
            });
    } catch (error) {
        console.error('页面初始化异常:', error);
        showErrorMessage('页面初始化异常，请刷新页面重试');
    }
});