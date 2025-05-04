document.addEventListener('DOMContentLoaded', () => {
    loadSalesSummary();
    loadProductSales();
    loadSalesByPeriod();
    loadStaffPerformance();
});

// 加载销售总结
function loadSalesSummary() {
    fetch('http://localhost:3000/admin/sales/summary', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('total-sales-amount').textContent = 
                `¥${data.totalSales.toFixed(2)}`;
            document.getElementById('total-orders').textContent = 
                data.totalOrders;
            document.getElementById('avg-order-value').textContent = 
                `¥${data.avgOrderValue.toFixed(2)}`;
        } else {
            throw new Error(data.message || '加载销售总结失败');
        }
    })
    .catch(error => {
        console.error('加载销售总结失败:', error);
        document.getElementById('total-sales-amount').textContent = '加载失败';
    });
}

// 加载商品销售情况
function loadProductSales() {
    fetch('http://localhost:3000/admin/sales/products', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && Array.isArray(data.productSales)) {
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
        } else {
            throw new Error(data.message || '加载商品销售情况失败');
        }
    })
    .catch(error => {
        console.error('加载商品销售情况失败:', error);
        document.getElementById('product-sales-body').innerHTML = 
            '<tr><td colspan="5">加载失败，请重试</td></tr>';
    });
}

// 渲染商品销售图表
function renderProductSalesChart(productSales) {
    // 实现图表渲染逻辑
    // 如使用Chart.js, 此处省略具体实现
}

// 按时间段加载销售数据
function loadSalesByPeriod() {
    const period = document.getElementById('period-selector').value;
    
    fetch(`http://localhost:3000/admin/sales/by-period?period=${period}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
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
        } else {
            throw new Error(data.message || '加载时间段销售数据失败');
        }
    })
    .catch(error => {
        console.error('加载时间段销售数据失败:', error);
        document.getElementById('period-sales-results').innerHTML = 
            '<p class="error-message">加载失败，请重试</p>';
    });
}

// 渲染时间段销售图表
function renderPeriodSalesChart(periodSales) {
    // 实现图表渲染逻辑
    // 如使用Chart.js, 此处省略具体实现
}

// 加载销售人员业绩
function loadStaffPerformance() {
    fetch('http://localhost:3000/admin/sales/staff-performance', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && Array.isArray(data.staffPerformance)) {
            const tableBody = document.getElementById('staff-performance-body');
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
        } else {
            throw new Error(data.message || '加载销售人员业绩失败');
        }
    })
    .catch(error => {
        console.error('加载销售人员业绩失败:', error);
        document.getElementById('staff-performance-body').innerHTML = 
            '<tr><td colspan="5">加载失败，请重试</td></tr>';
    });
}

// 查看销售人员销售详情
function viewStaffSalesDetails(staffId) {
    fetch(`http://localhost:3000/admin/sales/staff/${staffId}/details`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 弹出模态框显示详情
            const modalBody = document.getElementById('staff-details-body');
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
        } else {
            alert('获取销售详情失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('获取销售详情失败:', error);
        alert('获取销售详情失败，请重试');
    });
}

// 关闭销售详情模态框
function closeStaffDetailsModal() {
    document.getElementById('staff-details-modal').style.display = 'none';
}