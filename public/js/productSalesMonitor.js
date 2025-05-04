document.addEventListener('DOMContentLoaded', () => {
    loadSalesData();
});

// 加载销售状态数据
function loadSalesData() {
    // 获取当前销售人员负责的商品销售状态
    fetch('http://localhost:3000/products/sales-status', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderSalesStatusChart(data.salesData);
            renderProductTable(data.salesData);
        } else {
            alert('加载销售状态数据失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('加载销售状态失败:', error);
        document.getElementById('sales-status-container').innerHTML = 
            '<p class="error-message">加载数据失败，请重试</p>';
    });
}

// 渲染销售状态表格
function renderProductTable(salesData) {
    const tableBody = document.getElementById('product-status-body');
    tableBody.innerHTML = '';
    
    salesData.forEach(product => {
        // 计算警戒状态
        let stockStatus = '正常';
        let statusClass = 'status-normal';
        
        if (product.stock <= 10) {
            stockStatus = '库存不足';
            statusClass = 'status-warning';
        }
        if (product.stock <= 5) {
            stockStatus = '紧急补货';
            statusClass = 'status-danger';
        }
        
        const row = `
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.sold} 件</td>
                <td>${product.stock} 件</td>
                <td class="${statusClass}">${stockStatus}</td>
                <td>${product.lastSold ? new Date(product.lastSold).toLocaleString() : '无记录'}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// 渲染销售状态图表 (可使用图表库如Chart.js)
function renderSalesStatusChart(salesData) {
    // 这里应实现图表渲染逻辑
    // 如果使用Chart.js，需要先在页面引入该库
    const ctx = document.getElementById('sales-chart').getContext('2d');
    
    // 示例代码：
    /*
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: salesData.map(item => item.name),
            datasets: [{
                label: '销售数量',
                data: salesData.map(item => item.sold),
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
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
    */
}

// 过滤商品展示
function filterProducts() {
    const categoryFilter = document.getElementById('category-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    fetch(`http://localhost:3000/products/sales-status?category=${categoryFilter}&status=${statusFilter}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderProductTable(data.salesData);
        }
    })
    .catch(error => console.error('过滤商品失败:', error));
}