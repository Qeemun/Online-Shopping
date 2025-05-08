document.addEventListener('DOMContentLoaded', () => {
    // 检查用户权限 - 仅允许管理员或销售人员访问
    const user = AuthUtils.checkAuth(['admin', 'sales', 'seller', 'salesStaff'], 'login.html');
    
    if (user) {
        loadSalesSummary();
        loadProductSales();
        loadSalesByPeriod();
        loadStaffPerformance();
    }
});

// 加载销售总结
async function loadSalesSummary() {
    try {
        const data = await ApiUtils.request('http://localhost:3000/admin/sales/summary');
        
        document.getElementById('total-sales-amount').textContent = 
            `¥${data.totalSales.toFixed(2)}`;
        document.getElementById('total-orders').textContent = 
            data.totalOrders;
        document.getElementById('avg-order-value').textContent = 
            `¥${data.avgOrderValue.toFixed(2)}`;
            
    } catch (error) {
        console.error('加载销售总结失败:', error);
        document.getElementById('total-sales-amount').textContent = '加载失败';
    }
}

// 加载商品销售情况
async function loadProductSales() {
    try {
        const data = await ApiUtils.request('http://localhost:3000/admin/sales/products');
        
        if (Array.isArray(data.productSales)) {
            const tableBody = document.getElementById('product-sales-body');
            tableBody.innerHTML = '';
            
            data.productSales.forEach(product => {
                const row = `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td>${product.quantity}</td>
                        <td>¥${product.revenue.toFixed(2)}</td>
                        <td>${product.staffName || '未分配'}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
            
            // 渲染销售情况图表
            renderProductSalesChart(data.productSales);
        }
    } catch (error) {
        console.error('加载商品销售情况失败:', error);
        document.getElementById('product-sales-body').innerHTML = 
            '<tr><td colspan="5">加载失败，请重试</td></tr>';
    }
}

// 渲染商品销售图表
function renderProductSalesChart(productSales) {
    // 从产品销售数据提取图表所需数据
    const productNames = productSales.map(product => product.name);
    const quantities = productSales.map(product => product.quantity);
    const revenues = productSales.map(product => product.revenue);
    
    // 图表配置
    const config = {
        type: 'bar',
        data: {
            labels: productNames,
            datasets: [
                {
                    label: '销售数量',
                    data: quantities,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y-quantity'
                },
                {
                    label: '销售额',
                    data: revenues,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    yAxisID: 'y-revenue'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                'y-quantity': {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: '销售数量'
                    }
                },
                'y-revenue': {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: '销售额'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    };
    
    // 使用通用图表工具创建图表
    const chartCanvas = document.getElementById('product-sales-chart');
    if (chartCanvas) {
        ChartUtils.createOrUpdateChart('product-sales-chart', null, config);
    }
}

// 按时间段加载销售数据
async function loadSalesByPeriod() {
    const period = document.getElementById('period-selector').value;
    
    try {
        const data = await ApiUtils.request(`http://localhost:3000/admin/sales/by-period?period=${period}`);
        
        const resultsContainer = document.getElementById('period-sales-results');
        resultsContainer.innerHTML = '';
        
        // 根据返回的数据格式化显示
        if (data.salesByPeriod.length === 0) {
            resultsContainer.innerHTML = '<p>所选时间段内没有销售数据</p>';
            return;
        }
        
        // 创建销售数据表格
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>时间段</th>
                        <th>订单数</th>
                        <th>销售额</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.salesByPeriod.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.periodLabel}</td>
                    <td>${item.orders}</td>
                    <td>¥${item.sales.toFixed(2)}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        resultsContainer.innerHTML = tableHTML;
        
        // 渲染时间段销售图表
        renderPeriodSalesChart(data.salesByPeriod);
    } catch (error) {
        console.error('加载时间段销售数据失败:', error);
        document.getElementById('period-sales-results').innerHTML = 
            '<p class="error-message">加载失败，请重试</p>';
    }
}

// 渲染时间段销售图表
function renderPeriodSalesChart(periodSales) {
    // 从时间段销售数据提取图表所需数据
    const periodLabels = periodSales.map(item => item.periodLabel);
    const salesData = periodSales.map(item => item.sales);
    const ordersData = periodSales.map(item => item.orders);
    
    // 图表配置
    const config = {
        type: 'line',
        data: {
            labels: periodLabels,
            datasets: [
                {
                    label: '销售额',
                    data: salesData,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y-sales'
                },
                {
                    label: '订单数',
                    data: ordersData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y-orders'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                'y-sales': {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: '销售额'
                    }
                },
                'y-orders': {
                    type: 'linear',
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
    };
    
    // 使用通用图表工具创建图表
    const chartCanvas = document.getElementById('period-sales-chart');
    if (chartCanvas) {
        ChartUtils.createOrUpdateChart('period-sales-chart', null, config);
    }
}

// 加载销售人员业绩
async function loadStaffPerformance() {
    try {
        const data = await ApiUtils.request('http://localhost:3000/admin/sales/staff-performance');
        
        if (Array.isArray(data.staffPerformance)) {
            const tableBody = document.getElementById('staff-performance-body');
            if (!tableBody) return; // 如果元素不存在则返回
            
            tableBody.innerHTML = '';
            
            data.staffPerformance.forEach(staff => {
                const row = `
                    <tr>
                        <td>${staff.name}</td>
                        <td>${staff.productsCount}</td>
                        <td>${staff.ordersCount}</td>
                        <td>¥${staff.totalSales.toFixed(2)}</td>
                        <td>
                            <button onclick="viewStaffSalesDetails(${staff.id})">查看详情</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
            
            // 渲染销售人员业绩图表
            renderStaffPerformanceChart(data.staffPerformance);
        }
    } catch (error) {
        console.error('加载销售人员业绩失败:', error);
        const tableBody = document.getElementById('staff-performance-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5">加载失败，请重试</td></tr>';
        }
    }
}

// 查看销售人员销售详情
async function viewStaffSalesDetails(staffId) {
    try {
        const data = await ApiUtils.request(`http://localhost:3000/admin/sales/staff/${staffId}/details`);
        
        // 弹出模态框显示详情
        const modalBody = document.getElementById('staff-details-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = '';
        
        // 显示销售人员信息
        document.getElementById('staff-details-name').textContent = data.staff.name;
        
        // 显示商品销售明细
        if (data.productSales.length === 0) {
            modalBody.innerHTML = '<p>该销售人员暂无销售记录</p>';
        } else {
            let detailsHTML = '<table><thead><tr><th>商品</th><th>类别</th><th>数量</th><th>金额</th></tr></thead><tbody>';
            
            data.productSales.forEach(product => {
                detailsHTML += `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td>${product.quantity}</td>
                        <td>¥${product.revenue.toFixed(2)}</td>
                    </tr>
                `;
            });
            
            detailsHTML += '</tbody></table>';
            modalBody.innerHTML = detailsHTML;
        }
        
        // 显示模态框
        document.getElementById('staff-details-modal').style.display = 'block';
    } catch (error) {
        console.error('获取销售详情失败:', error);
        UIUtils.showNotification('获取销售详情失败，请重试', 'error');
    }
}

// 关闭销售详情模态框
function closeStaffDetailsModal() {
    const modal = document.getElementById('staff-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}