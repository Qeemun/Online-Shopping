// 加载订单历史
function loadOrderHistory() {
    const user = JSON.parse(localStorage.getItem('user'));
    const orderHistoryBody = document.getElementById('order-history-body');

    fetch(`http://localhost:3000/orders/history?userId=${user.id}`)
        .then(response => response.json())
        .then(orders => {
            orders.forEach(order => {
                const orderRow = `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.totalAmount}</td>
                        <td>${order.status}</td>
                        <td><button onclick="viewOrderDetails(${order.id})">查看详情</button></td>
                    </tr>`;
                orderHistoryBody.innerHTML += orderRow;
            });
        })
        .catch(error => console.error('加载订单历史失败', error));
}

// 查看订单详情
function viewOrderDetails(orderId) {
    window.location.href = `orderDetails.html?orderId=${orderId}`;
}

// 页面加载时，调用加载订单历史
document.addEventListener('DOMContentLoaded', () => {
    loadOrderHistory();
});
