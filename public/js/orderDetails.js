// 加载订单详情
function loadOrderDetails(orderId) {
    fetch(`http://localhost:3000/orders/${orderId}`)
        .then(response => response.json())
        .then(order => {
            // 设置订单信息
            document.getElementById('order-id').textContent = order.id;
            document.getElementById('total-price').textContent = order.totalAmount;
            document.getElementById('order-status').textContent = order.status;

            // 渲染产品列表
            const orderItemsBody = document.getElementById('order-items-body');
            order.items.forEach(item => {
                const row = `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price}</td>
                        <td>${item.total}</td>
                    </tr>`;
                orderItemsBody.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('加载订单详情失败', error);
            document.getElementById('order-info').innerHTML = '<p>无法加载订单详情。</p>';
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
