// 获取订单信息并加载
function loadOrderSummary(orderId) {
    // 从后端获取订单信息
    fetch(`http://localhost:3000/orders/${orderId}`)
        .then(response => response.json())
        .then(order => {
            // 更新订单摘要
            const orderSummaryBody = document.getElementById('order-summary-body');
            const totalPriceElement = document.getElementById('total-price');
            const shippingFeeElement = document.getElementById('shipping-fee');
            let totalAmount = 0;

            // 加载商品项
            order.items.forEach(item => {
                const row = `
                    <tr>
                        <td>${item.product.name}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price} 元</td>
                        <td>${(item.price * item.quantity).toFixed(2)} 元</td>
                    </tr>
                `;
                orderSummaryBody.innerHTML += row;
                totalAmount += item.price * item.quantity;
            });

            // 显示运费和总金额
            shippingFeeElement.textContent = order.shippingFee.toFixed(2);
            totalPriceElement.textContent = (totalAmount + order.shippingFee).toFixed(2);
        })
        .catch(error => {
            console.error('获取订单信息失败:', error);
            alert('加载订单信息失败，请稍后重试。');
        });
}

// 处理支付请求
function handlePayment(orderId) {
    if (!orderId) {
        alert('订单ID无效');
        return;
    }

    // 显示支付中提示
    document.getElementById('payment-status').textContent = "正在处理支付...";
    document.getElementById('payment-status').style.color = "orange";

    // 模拟向后端发送支付请求
    fetch('http://localhost:3000/pay', {  // 确保支付的URL正确
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })  // 发送订单ID到后端
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            document.getElementById('payment-status').textContent = "支付成功，订单已确认并发货！";
            document.getElementById('payment-status').style.color = "green";
        } else {
            document.getElementById('payment-status').textContent = "支付失败，请重试。";
            document.getElementById('payment-status').style.color = "red";
        }
    })
    .catch(error => {
        console.error('支付请求失败', error);
        document.getElementById('payment-status').textContent = "支付失败，请稍后重试。";
        document.getElementById('payment-status').style.color = "red";
    });
}

// 在结账页面点击支付按钮时触发支付处理
document.getElementById('pay-button').addEventListener('click', () => {
    const orderId = document.getElementById('order-id').textContent;  // 获取订单ID
    handlePayment(orderId);
});

// 页面加载时，获取订单ID并加载订单摘要
document.addEventListener('DOMContentLoaded', () => {
    const orderId = getOrderIdFromUrl();  // 从URL获取订单ID
    console.log('获取的订单ID:', orderId);  // 打印日志检查订单ID
    if (orderId) {
        loadOrderSummary(orderId);  // 加载订单摘要
    } else {
        alert('订单ID无效');
    }
});

// 从URL获取订单ID（假设订单ID作为查询参数传递）
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');  // 获取URL中的orderId参数
    console.log('从URL获取的订单ID:', orderId);  // 调试日志输出
    return orderId;
}