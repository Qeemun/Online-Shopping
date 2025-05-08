document.addEventListener('DOMContentLoaded', () => {
    // 检查用户权限
    AuthUtils.checkAuth(['admin']);
    
    // 初始化日期范围（默认最近30天）
    const dateRange = DateUtils.initializeDateRange(30);
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;
    
    // 更新自定义日期输入框的值
    document.getElementById('start-date').valueAsDate = startDate;
    document.getElementById('end-date').valueAsDate = endDate;
    
    // 加载所有商品类别
    loadAllCategories();
    
    // 加载销售概览数据
    loadSalesOverview();
    
    // 加载类别销售数据
    loadCategorySales();
    
    // 加载库存状态数据
    loadInventoryStatus();
    
    // 加载畅销商品数据
    loadTopProducts();
});

// 全局变量
let startDate;
let endDate;
let selectedCategory = '';
let salesTrendChart;
let categoryRevenueChart;
let categoryOrdersChart;
let categoryQuantityChart;
let inventoryStatusChart;

// 更新日期范围
function updateDateRange(value) {
    if (value === 'custom') {
        document.getElementById('custom-date-container').style.display = 'inline-block';
        return;
    }
    
    document.getElementById('custom-date-container').style.display = 'none';
    const dateRange = DateUtils.initializeDateRange(parseInt(value));
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;
    
    // 更新自定义日期输入框的值
    document.getElementById('start-date').valueAsDate = startDate;
    document.getElementById('end-date').valueAsDate = endDate;
    
    // 刷新所有数据
    refreshAllData();
}

// 应用自定义日期范围
function applyCustomDateRange() {
    startDate = document.getElementById('start-date').valueAsDate;
    endDate = document.getElementById('end-date').valueAsDate;
    
    if (!startDate || !endDate) {
        UIUtils.showNotification('请选择有效的日期范围', 'error');
        return;
    }
    
    if (startDate > endDate) {
        UIUtils.showNotification('开始日期不能晚于结束日期', 'error');
        return;
    }
    
    // 刷新所有数据
    refreshAllData();
}

// 按类别筛选
function filterByCategory(category) {
    selectedCategory = category;
    
    // 刷新所有数据
    refreshAllData();
}

// 刷新所有数据
function refreshAllData() {
    loadSalesOverview();
    loadCategorySales();
    loadInventoryStatus();
    loadTopProducts();
}

// 切换标签页
function switchTab(tabId, tabButton) {
    // 移除所有标签页的active类
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有内容区的active类
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 为当前标签页添加active类
    tabButton.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// 加载所有商品类别
async function loadAllCategories() {
    try {
        const data = await ApiUtils.request('http://localhost:3000/products/categories');
        
        if (data.categories) {
            const categoryFilter = document.getElementById('category-filter');
            
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载商品类别失败:', error);
    }
}

// 加载销售概览数据
async function loadSalesOverview() {
    try {
        const params = DateUtils.getDateRangeParams(startDate, endDate);
        if (selectedCategory) {
            params.category = selectedCategory;
        }
        
        const data = await ApiUtils.request(`http://localhost:3000/sales-reports/sales-trend?${new URLSearchParams(params)}`);
        
        // 更新销售概览卡片
        updateSalesOverviewCards(data);
        
        // 更新销售趋势图表
        updateSalesTrendChart(data.salesTrend);
    } catch (error) {
        console.error('获取销售概览失败:', error);
    }
}

// 更新销售概览卡片
function updateSalesOverviewCards(data) {
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalQuantity = 0;
    
    // 计算总销售额、总订单数和总销售数量
    data.salesTrend.forEach(item => {
        totalRevenue += parseFloat(item.revenue || 0);
        totalOrders += parseInt(item.orderCount || 0);
    });
    
    // 从类别销售数据中获取总销售数量
    if (data.categorySales) {
        data.categorySales.forEach(category => {
            totalQuantity += parseInt(category.quantity || 0);
        });
    }
    
    // 计算平均订单金额
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // 更新卡片显示
    document.getElementById('total-revenue').textContent = `¥${totalRevenue.toFixed(2)}`;
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('avg-order-value').textContent = `¥${avgOrderValue.toFixed(2)}`;
    document.getElementById('total-quantity').textContent = totalQuantity;
}

// 更新销售趋势图表
function updateSalesTrendChart(salesTrend) {
    const config = {
        type: 'line',
        data: {
            labels: salesTrend.map(item => item.period),
            datasets: [
                {
                    label: '销售额',
                    data: salesTrend.map(item => parseFloat(item.revenue || 0)),
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '订单数',
                    data: salesTrend.map(item => parseInt(item.orderCount || 0)),
                    borderColor: '#db4437',
                    backgroundColor: 'rgba(219, 68, 55, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '销售额'
                    },
                    position: 'left'
                },
                y1: {
                    title: {
                        display: true,
                        text: '订单数'
                    },
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: '销售趋势'
                }
            }
        }
    };
    
    salesTrendChart = ChartUtils.createOrUpdateChart('sales-trend-chart', salesTrendChart, config);
}

// 加载类别销售数据
async function loadCategorySales() {
    try {
        const params = DateUtils.getDateRangeParams(startDate, endDate);
        
        const data = await ApiUtils.request(`http://localhost:3000/sales-reports/category-sales?${new URLSearchParams(params)}`);
        
        // 更新类别销售表格
        updateCategorySalesTable(data.categorySales);
        
        // 更新类别销售图表
        updateCategorySalesCharts(data.categorySales);
    } catch (error) {
        console.error('获取类别销售数据失败:', error);
    }
}

// 更新类别销售表格
function updateCategorySalesTable(categorySales) {
    const tableBody = document.getElementById('category-sales-body');
    tableBody.innerHTML = '';
    
    if (categorySales.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">暂无数据</td></tr>';
        return;
    }
    
    categorySales.forEach(category => {
        const row = document.createElement('tr');
        
        // 计算转化率（假设每个类别有页面浏览数据）
        const conversionRate = category.viewCount ? (category.orderCount / category.viewCount * 100).toFixed(2) : '-';
        
        // 环比增长（假设有上一期数据）
        const growthRate = category.previousRevenue ? 
            ((category.revenue - category.previousRevenue) / category.previousRevenue * 100).toFixed(2) : '-';
        
        const growthClass = growthRate > 0 ? 'text-success' : (growthRate < 0 ? 'text-danger' : '');
        const growthPrefix = growthRate > 0 ? '+' : '';
        
        row.innerHTML = `
            <td>${category.category}</td>
            <td>¥${parseFloat(category.revenue).toFixed(2)}</td>
            <td>${category.orderCount}</td>
            <td>${category.quantity}</td>
            <td>${conversionRate}%</td>
            <td class="${growthClass}">${growthRate !== '-' ? `${growthPrefix}${growthRate}%` : '-'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 更新类别销售图表
function updateCategorySalesCharts(categorySales) {
    // 提取数据
    const categories = categorySales.map(item => item.category);
    const revenueData = categorySales.map(item => parseFloat(item.revenue));
    const orderCountData = categorySales.map(item => parseInt(item.orderCount));
    const quantityData = categorySales.map(item => parseInt(item.quantity));
    
    // 销售额图表
    updateCategoryChart('category-revenue-chart', categoryRevenueChart, '类别销售额', categories, revenueData, '#1a73e8');
    
    // 订单数图表
    updateCategoryChart('category-orders-chart', categoryOrdersChart, '类别订单数', categories, orderCountData, '#db4437');
    
    // 销售量图表
    updateCategoryChart('category-quantity-chart', categoryQuantityChart, '类别销售量', categories, quantityData, '#0f9d58');
}

// 更新类别图表
function updateCategoryChart(chartId, chartInstance, title, labels, data, color) {
    const ctx = document.getElementById(chartId).getContext('2d');
    
    // 销毁旧图表（如果存在）
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // 创建新图表
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}

// 加载库存状态数据
function loadInventoryStatus() {
    fetch('http://localhost:3000/sales-reports/inventory-status', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新库存状态表格
            updateInventoryStatusTable(data.stockStatus);
            
            // 更新库存状态图表
            updateInventoryStatusChart(data.stockStatus);
        } else {
            console.error('获取库存状态失败:', data.message);
        }
    })
    .catch(error => console.error('加载库存状态失败:', error));
}

// 更新库存状态表格
function updateInventoryStatusTable(stockStatus) {
    const tableBody = document.getElementById('inventory-status-body');
    tableBody.innerHTML = '';
    
    // 计算总商品数和总价值
    let totalProducts = 0;
    let totalValue = 0;
    
    Object.entries(stockStatus).forEach(([status, products]) => {
        totalProducts += products.length;
        totalValue += products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    });
    
    // 添加每种状态的行
    const statusMapping = {
        'outOfStock': {
            name: '缺货',
            class: 'status-danger',
            action: '补货'
        },
        'lowStock': {
            name: '库存紧张',
            class: 'status-warning',
            action: '补货'
        },
        'normal': {
            name: '库存正常',
            class: 'status-good',
            action: '监控'
        },
        'excess': {
            name: '库存过多',
            class: 'status-warning',
            action: '促销'
        }
    };
    
    Object.entries(stockStatus).forEach(([status, products]) => {
        const statusInfo = statusMapping[status];
        if (!statusInfo) return;
        
        const row = document.createElement('tr');
        
        // 计算该状态下的商品总价值
        const statusValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
        
        // 计算占比
        const percentage = totalProducts > 0 ? (products.length / totalProducts * 100).toFixed(2) : '0.00';
        
        row.innerHTML = `
            <td>
                <span class="status-indicator ${statusInfo.class}"></span>
                ${statusInfo.name}
            </td>
            <td>${products.length}</td>
            <td>${percentage}%</td>
            <td>¥${statusValue.toFixed(2)}</td>
            <td>
                <button onclick="handleInventoryAction('${status}')">${statusInfo.action}</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 更新库存状态图表
function updateInventoryStatusChart(stockStatus) {
    const ctx = document.getElementById('inventory-status-chart').getContext('2d');
    
    // 提取数据
    const statusLabels = {
        'outOfStock': '缺货',
        'lowStock': '库存紧张',
        'normal': '库存正常',
        'excess': '库存过多'
    };
    
    const labels = Object.keys(stockStatus).map(key => statusLabels[key] || key);
    const data = Object.values(stockStatus).map(products => products.length);
    const colors = [
        '#db4437', // 红色 - 缺货
        '#f4b400', // 黄色 - 库存紧张
        '#0f9d58', // 绿色 - 库存正常
        '#4285f4'  // 蓝色 - 库存过多
    ];
    
    // 销毁旧图表（如果存在）
    if (inventoryStatusChart) {
        inventoryStatusChart.destroy();
    }
    
    // 创建新图表
    inventoryStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: '库存状态分布'
                }
            }
        }
    });
}

// 加载畅销商品数据
function loadTopProducts() {
    const params = DateUtils.getDateRangeParams(startDate, endDate);
    if (selectedCategory) {
        params.category = selectedCategory;
    }
    
    fetch(`http://localhost:3000/sales-reports/top-products?${new URLSearchParams(params)}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateTopProductsTable(data.products);
        } else {
            console.error('获取畅销商品失败:', data.message);
        }
    })
    .catch(error => console.error('加载畅销商品失败:', error));
}

// 更新畅销商品表格
function updateTopProductsTable(products) {
    const tableBody = document.getElementById('top-products-body');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">暂无数据</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        // 确定库存状态样式
        let stockStatusClass = 'status-good';
        let stockStatusText = '库存充足';
        
        if (product.stock <= 0) {
            stockStatusClass = 'status-danger';
            stockStatusText = '缺货';
        } else if (product.stock < 5) {
            stockStatusClass = 'status-warning';
            stockStatusText = '库存紧张';
        }
        
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category || '未分类'}</td>
            <td>¥${parseFloat(product.revenue).toFixed(2)}</td>
            <td>${product.soldQuantity}</td>
            <td>
                <span class="status-indicator ${stockStatusClass}"></span>
                ${stockStatusText} (${product.stock})
            </td>
            <td>${product.salesStaff ? product.salesStaff.username : '未分配'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 获取日期范围参数
function getDateRangeParams() {
    return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    };
}

// 格式化日期为YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 库存操作处理（示例）
function handleInventoryAction(status) {
    switch(status) {
        case 'outOfStock':
        case 'lowStock':
            alert('将为您生成补货建议清单');
            // 这里可以跳转到补货页面或打开补货建议弹窗
            break;
        case 'excess':
            alert('将为您生成促销建议');
            // 这里可以跳转到促销页面或打开促销建议弹窗
            break;
        default:
            alert('将继续监控库存状态');
    }
}