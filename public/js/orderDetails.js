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
            `¥${order.totalAmount.toFixed(2)}`;
        
        // 转换订单状态为中文
        const statusMap = {
            'pending': '待支付',
            'paid': '已支付',
            'shipped': '已发货',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        document.getElementById('order-status').textContent = statusMap[order.status] || order.status;

        // 显示收货信息
        document.getElementById('recipient-name').textContent = order.recipientName || '未提供';
        document.getElementById('recipient-phone').textContent = order.recipientPhone || '未提供';
        document.getElementById('shipping-address').textContent = order.shippingAddress || '未提供';

        // 检查是否为待支付状态，如果是则显示支付按钮
        if (order.status === 'pending') {
            document.getElementById('payment-action').style.display = 'block';
            document.getElementById('continue-payment-btn').addEventListener('click', () => {
                // 保存订单ID到本地存储，以便结账页面使用
                localStorage.setItem('currentOrderId', order.id);
                // 跳转到结账页面
                window.location.href = `checkout.html?orderId=${order.id}`;
            });
        } else {
            document.getElementById('payment-action').style.display = 'none';
        }

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

// 获取URL中的订单ID并加载数据
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

if (orderId) {
    loadOrderDetails(orderId);  // 如果URL中包含订单ID，加载订单详情
} else {
    alert('无效的订单ID');
    window.location.href = 'orderHistory.html';  // 如果没有订单ID，跳转回订单历史页面
}
