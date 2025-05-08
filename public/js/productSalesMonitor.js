// 全局变量
let currentProductId = null;
let salesChart = null;
let stockChart = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    checkAuth();
    
    // 加载销售人员负责的商品
    loadSalesStaffProducts();
    
    // 初始化日期筛选器
    initDateFilter();
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

// 初始化日期筛选器
function initDateFilter() {
    // 设置默认日期范围（最近30天）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('start-date').valueAsDate = startDate;
    document.getElementById('end-date').valueAsDate = endDate;
    
    // 添加日期筛选事件监听器
    document.getElementById('date-filter-form').addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (currentProductId) {
            loadProductSalesData(currentProductId);
        }
    });
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
        
        displaySalesStaffProducts(data.products);
    } catch (error) {
        console.error('加载销售人员商品出错:', error);
        showNotification('加载负责商品失败', 'error');
    }
}

// 显示销售人员的商品
function displaySalesStaffProducts(products) {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    if (products.length === 0) {
        productsList.innerHTML = '<p>您尚未负责任何商品</p>';
        return;
    }
    
    products.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <h3>${product.name}</h3>
            <p>类别: ${product.category || '未分类'}</p>
            <p>价格: ¥${product.price}</p>
            <p>库存: ${product.stock}</p>
            <button onclick="viewProductSales(${product.id})">查看销售数据</button>
            <button onclick="editProductInfo(${product.id})">修改信息</button>
        `;
        productsList.appendChild(productItem);
    });
    
    // 默认显示第一个商品的销售数据
    if (products.length > 0) {
        viewProductSales(products[0].id);
    }
}

// 查看商品销售数据
function viewProductSales(productId) {
    currentProductId = productId;
    
    // 加载商品销售数据
    loadProductSalesData(productId);
    
    // 加载商品浏览日志
    loadProductViewLogs(productId);
}

// 加载商品销售数据
async function loadProductSalesData(productId) {
    try {
        const token = localStorage.getItem('token');
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        const response = await fetch(`/sales-reports/products/${productId}/sales?startDate=${startDate}&endDate=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取商品销售数据失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品销售数据失败');
        }
        
        // 显示商品销售数据
        displayProductSalesData(data.productSales);
        
        // 显示销售趋势图表
        renderSalesChart(data.salesTrend);
        
        // 显示库存趋势图表
        renderStockChart(data.stockTrend);
    } catch (error) {
        console.error('加载商品销售数据出错:', error);
        showNotification('加载商品销售数据失败', 'error');
    }
}

// 显示商品销售数据
function displayProductSalesData(productSales) {
    const salesDataSection = document.getElementById('sales-data');
    
    // 清空旧数据
    salesDataSection.innerHTML = '';
    
    // 创建销售数据概览
    const salesOverview = document.createElement('div');
    salesOverview.className = 'sales-overview';
    salesOverview.innerHTML = `
        <div class="sales-stat">
            <h4>总销售额</h4>
            <p>¥${productSales.totalRevenue.toFixed(2)}</p>
        </div>
        <div class="sales-stat">
            <h4>总销售量</h4>
            <p>${productSales.totalQuantity} 件</p>
        </div>
        <div class="sales-stat">
            <h4>订单数</h4>
            <p>${productSales.orderCount} 笔</p>
        </div>
        <div class="sales-stat">
            <h4>平均单价</h4>
            <p>¥${(productSales.totalRevenue / productSales.totalQuantity).toFixed(2)}</p>
        </div>
        <div class="sales-stat">
            <h4>当前库存</h4>
            <p>${productSales.currentStock} 件</p>
        </div>
    `;
    
    // 添加到页面
    salesDataSection.appendChild(salesOverview);
    
    // 显示图表容器
    document.getElementById('sales-chart-container').style.display = 'block';
    document.getElementById('stock-chart-container').style.display = 'block';
}

// 渲染销售趋势图表
function renderSalesChart(salesTrend) {
    const ctx = document.getElementById('sales-chart').getContext('2d');
    
    // 销毁旧图表
    if (salesChart) {
        salesChart.destroy();
    }
    
    // 准备图表数据
    const dates = salesTrend.map(item => item.date);
    const revenues = salesTrend.map(item => item.revenue);
    const quantities = salesTrend.map(item => item.quantity);
    
    // 创建新图表
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '销售额 (¥)',
                    data: revenues,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: '销售量 (件)',
                    data: quantities,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
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
                        text: '销售量 (件)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 渲染库存趋势图表
function renderStockChart(stockTrend) {
    const ctx = document.getElementById('stock-chart').getContext('2d');
    
    // 销毁旧图表
    if (stockChart) {
        stockChart.destroy();
    }
    
    // 准备图表数据
    const dates = stockTrend.map(item => item.date);
    const stocks = stockTrend.map(item => item.stock);
    
    // 创建新图表
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '库存量 (件)',
                    data: stocks,
                    borderColor: 'rgba(255, 159, 64, 1)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '库存量 (件)'
                    }
                }
            }
        }
    });
}

// 加载商品浏览日志
async function loadProductViewLogs(productId) {
    try {
        const token = localStorage.getItem('token');
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        const response = await fetch(`/activity-logs/products/${productId}/views?startDate=${startDate}&endDate=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取商品浏览日志失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品浏览日志失败');
        }
        
        // 显示商品浏览日志
        displayProductViewLogs(data.logs);
    } catch (error) {
        console.error('加载商品浏览日志出错:', error);
        showNotification('加载商品浏览日志失败', 'error');
    }
}

// 显示商品浏览日志
function displayProductViewLogs(logs) {
    const logsContainer = document.getElementById('view-logs');
    logsContainer.innerHTML = '';
    
    if (logs.length === 0) {
        logsContainer.innerHTML = '<p>该时间段内没有浏览记录</p>';
        return;
    }
    
    // 创建日志表格
    const table = document.createElement('table');
    table.className = 'logs-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>用户</th>
            <th>动作</th>
            <th>时间</th>
            <th>来源页面</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.user ? log.user.username : '访客'}</td>
            <td>${log.action}</td>
            <td>${formatDateTime(log.createdAt)}</td>
            <td>${log.referrer || '直接访问'}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    // 添加到页面
    logsContainer.appendChild(table);
}

// 编辑商品信息
function editProductInfo(productId) {
    // 获取商品详情
    fetchProductDetails(productId);
}

// 获取商品详情
async function fetchProductDetails(productId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/products/${productId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取商品详情失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品详情失败');
        }
        
        // 显示编辑表单
        displayEditForm(data.product);
    } catch (error) {
        console.error('获取商品详情出错:', error);
        showNotification('获取商品详情失败', 'error');
    }
}

// 显示编辑表单
function displayEditForm(product) {
    // 获取编辑表单容器
    const editFormContainer = document.getElementById('edit-product-form');
    
    // 填充表单数据
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-stock').value = product.stock;
    
    // 显示表单
    editFormContainer.style.display = 'block';
    
    // 滚动到表单位置
    editFormContainer.scrollIntoView({ behavior: 'smooth' });
}

// 更新商品信息
async function updateProductInfo(event) {
    event.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    const price = document.getElementById('edit-product-price').value;
    const stock = document.getElementById('edit-product-stock').value;
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/products/${productId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price,
                stock
            })
        });
        
        if (!response.ok) {
            throw new Error('更新商品信息失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '更新商品信息失败');
        }
        
        // 隐藏表单
        document.getElementById('edit-product-form').style.display = 'none';
        
        // 重新加载商品列表
        loadSalesStaffProducts();
        
        showNotification('商品信息更新成功', 'success');
    } catch (error) {
        console.error('更新商品信息出错:', error);
        showNotification(error.message, 'error');
    }
}

// 取消编辑
function cancelEdit() {
    document.getElementById('edit-product-form').style.display = 'none';
}

// 显示通知
function showNotification(message, type = 'info') {
    // 如果页面上没有通知容器，则创建一个
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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

// 格式化日期时间
function formatDateTime(dateString) {
    if (!dateString) return '未知';
    
    const date = new Date(dateString);
    
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}