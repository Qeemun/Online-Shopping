// 加载订单详情
function loadOrderDetails(orderId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    fetch(`http://localhost:3000/orders/${orderId}`, {
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
            throw new Error('加载订单详情失败');
        }
        return response.json();
    })
    .then(data => {
        if (!data.success || !data.order) {
            throw new Error('订单数据无效');
        }

        const order = data.order;
        document.getElementById('order-id').textContent = order.id;
        document.getElementById('total-price').textContent = 
            `¥${order.total_amount.toFixed(2)}`;
        document.getElementById('order-status').textContent = order.status;

        const orderItemsBody = document.getElementById('order-items-body');
        orderItemsBody.innerHTML = '';

        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const row = `
                    <tr>
                        <td>${item.product.name}</td>
                        <td>${item.quantity}</td>
                        <td>¥${item.price.toFixed(2)}</td>
                        <td>¥${item.total.toFixed(2)}</td>
                    </tr>`;
                orderItemsBody.innerHTML += row;
            });
        }
    })
    .catch(error => {
        console.error('加载订单详情失败:', error);
        document.getElementById('order-info').innerHTML = 
            '<p class="error-message">加载订单详情失败，请重试</p>';
    });
}

// 订单跟踪
function trackOrder() {
    alert('此功能暂时不可用。');  // 实际应用中可以链接到订单追踪服务或展示更详细信息
}

// 获取URL中的订单ID并加载数据
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

if (orderId) {
    loadOrderDetails(orderId);  // 如果URL中包含订单ID，加载订单详情
} else {
    alert('无效的订单ID');
    window.location.href = 'orderHistory.html';  // 如果没有订单ID，跳转回订单历史页面
}
