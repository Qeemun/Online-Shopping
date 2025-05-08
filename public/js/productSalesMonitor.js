// 全局变量
let currentProductId = null;
let salesChart = null;
let stockChart = null;
// 分页状态
let pagination = {
    page: 1,
    limit: 20,
    hasMore: true
};
// 加载状态
let isLoading = false;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    checkAuth();
    
    // 加载销售人员负责的商品
    loadProducts();
    
    // 初始化筛选器
    initFilters();
    
    // 添加滚动事件监听器
    window.addEventListener('scroll', handleScroll);
});

// 检查用户是否已登录且为销售人员
function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        alert('请先登录');
        window.location.href = 'login.html';
        return false;
    }
    
    const user = JSON.parse(userStr);
    console.log('当前用户角色:', user.role); // 调试信息
    
    // 检查用户是否为销售人员
    if (user.role !== 'sales' && user.role !== 'seller' && user.role !== 'salesStaff' && user.role !== 'admin') {
        alert('您无权访问此页面');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// 初始化筛选器
function initFilters() {
    // 加载所有类别
    loadCategories();
    
    // 添加筛选事件监听器
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('status-filter').addEventListener('change', filterProducts);
}

// 加载所有类别
async function loadCategories() {
    try {
        const response = await fetch('http://localhost:3000/products/categories/all');
        
        if (!response.ok) {
            throw new Error('获取商品类别失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品类别失败');
        }
        
        // 填充类别筛选器
        const categoryFilter = document.getElementById('category-filter');
        data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('加载类别失败:', error);
        showNotification('加载商品类别失败', 'error');
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
        if (!checkAuth()) return;
        
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
        showNotification('加载商品失败: ' + error.message, 'error');
    }
}

// 加载更多商品 (无限滚动)
async function loadMoreProducts(isInitialLoad = false) {
    if (isLoading || !pagination.hasMore) return;
    
    isLoading = true;
    
    try {
        const token = localStorage.getItem('token');
        
        // 显示加载指示器
        if (!isInitialLoad) {
            showLoadingIndicator();
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
        
        // 发送请求
        const response = await fetch(`http://localhost:3000/products?${params}`, {
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
            hideLoadingIndicator();
        }
        
        // 更新分页信息
        if (data.pagination) {
            pagination = {
                page: pagination.page + 1,
                limit: pagination.limit,
                hasMore: data.pagination.hasMore
            };
        } else {
            pagination.hasMore = false;
        }
        
        // 保存所有商品数据
        if (isInitialLoad) {
            window.allProducts = data.products;
        } else {
            window.allProducts = [...(window.allProducts || []), ...data.products];
        }
        
        // 显示商品数据
        displayProducts(data.products, isInitialLoad);
        
        // 仅在初次加载时渲染图表
        if (isInitialLoad) {
            renderSalesChart(window.allProducts);
        }
        
        // 如果没有更多数据，显示结束提示
        if (!pagination.hasMore) {
            showEndMessage();
        }
        
    } catch (error) {
        console.error('加载更多商品失败:', error);
        showNotification('加载更多商品失败: ' + error.message, 'error');
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

// 显示加载指示器
function showLoadingIndicator() {
    // 查找是否已有加载指示器
    let loadingIndicator = document.getElementById('loading-indicator');
    
    // 如果没有，创建一个
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('tr');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.innerHTML = `
            <td colspan="6" class="text-center">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>加载更多商品...</p>
                </div>
            </td>
        `;
        document.getElementById('product-status-body').appendChild(loadingIndicator);
    } else {
        loadingIndicator.style.display = '';
    }
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// 显示结束信息
function showEndMessage() {
    // 查找是否已有结束信息
    let endMessage = document.getElementById('end-message');
    
    // 如果没有，创建一个
    if (!endMessage) {
        endMessage = document.createElement('tr');
        endMessage.id = 'end-message';
        endMessage.innerHTML = `
            <td colspan="6" class="text-center">
                <div class="end-message">
                    已加载全部商品
                </div>
            </td>
        `;
        document.getElementById('product-status-body').appendChild(endMessage);
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
    if (window.salesChart) {
        window.salesChart.destroy();
    }
    
    window.salesChart = new Chart(chartCanvas, {
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