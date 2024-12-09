document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});

// 加载订单列表
function loadOrders() {
    const orderTableBody = document.getElementById('order-table-body');
    orderTableBody.innerHTML = ''; // 清空表格内容

    fetch('http://localhost:3000/orders/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            data.orders.forEach(order => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${order.user.username}</td>
                    <td>¥<input type="number" value="${Number(order.total_amount).toFixed(2)}" onchange="updateOrderInfo(${order.id}, 'total_amount', this.value)"></td>
                    <td>
                        <select onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="待支付" ${order.status === '待支付' ? 'selected' : ''}>待支付</option>
                            <option value="已支付" ${order.status === '已支付' ? 'selected' : ''}>已支付</option>
                            <option value="已发货" ${order.status === '已发货' ? 'selected' : ''}>已发货</option>
                            <option value="已完成" ${order.status === '已完成' ? 'selected' : ''}>已完成</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="deleteOrder(${order.id})">删除</button>
                    </td>
                `;
                orderTableBody.appendChild(row);
            });
        } else {
            alert('加载订单失败');
        }
    })
    .catch(error => {
        console.error('加载订单失败:', error);
        alert('加载订单失败，请稍后重试');
    });
}

// 更新订单状态
function updateOrderStatus(orderId, status) {
    fetch(`http://localhost:3000/orders/update/${orderId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('订单状态更新成功');
        } else {
            alert('订单状态更新失败');
        }
    })
    .catch(error => {
        console.error('更新订单状态失败:', error);
        alert('更新订单状态失败，请稍后重试');
    });
}

// 更新订单信息
function updateOrderInfo(orderId, field, value) {
    fetch(`http://localhost:3000/orders/update/${orderId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('订单信息更新成功');
        } else {
            alert('订单信息更新失败');
        }
    })
    .catch(error => {
        console.error('更新订单信息失败:', error);
        alert('更新订单信息失败，请稍后重试');
    });
}

// 删除订单
function deleteOrder(orderId) {
    if (confirm('确定要删除此订单吗？')) {
        fetch(`http://localhost:3000/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('订单删除成功');
                loadOrders(); // 重新加载订单列表
            } else {
                alert('订单删除失败');
            }
        })
        .catch(error => {
            console.error('删除订单失败:', error);
            alert('删除订单失败，请稍后重试');
        });
    }
}