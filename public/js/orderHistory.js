// 加载订单历史
function loadOrderHistory() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    const orderHistoryBody = document.getElementById('order-history-body');
    
    fetch('http://localhost:3000/api/orders/history', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                throw new Error('请重新登录');
            }
            throw new Error('加载订单历史失败');
        }
        return response.json();
    })
    .then(data => {
        if (!data.orders || data.orders.length === 0) {
            orderHistoryBody.innerHTML = '<tr><td colspan="4">暂无订单</td></tr>';
            return;
        }

        // 订单状态转换为中文的映射
        const statusMap = {
            'pending': '待支付',
            'paid': '已支付',
            'shipped': '已发货',
            'completed': '已完成',
            'cancelled': '已取消'
        };

        orderHistoryBody.innerHTML = '';
        data.orders.forEach(order => {
            const orderRow = `
                <tr>
                    <td>${order.id}</td>
                    <td>¥${order.totalAmount.toFixed(2)}</td>
                    <td>${statusMap[order.status] || order.status}</td>
                    <td>
                        <button onclick="viewOrderDetails(${order.id})" class="btn btn-primary">
                            查看详情
                        </button>
                    </td>
                </tr>`;
            orderHistoryBody.innerHTML += orderRow;
        });
    })
    .catch(error => {
        console.error('加载订单历史失败:', error);
        orderHistoryBody.innerHTML = 
            '<tr><td colspan="4">加载失败，请重试</td></tr>';
    });
}

// 查看订单详情
function viewOrderDetails(orderId) {
    window.location.href = `orderDetails.html?orderId=${orderId}`;
}

// 页面加载时，调用加载订单历史
document.addEventListener('DOMContentLoaded', () => {
    loadOrderHistory();
});
