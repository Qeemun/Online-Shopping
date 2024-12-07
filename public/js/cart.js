// 加载购物车中的商品
function loadCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartTableBody = document.getElementById('cart-items-body');
    const totalPriceElement = document.getElementById('total-price');

    if (cart.length === 0) {
        document.getElementById('empty-cart-message').style.display = 'block';
    } else {
        document.getElementById('empty-cart-message').style.display = 'none';
    }

    cartTableBody.innerHTML = '';
    let totalPrice = 0;

    // 使用 Promise.all 来确保所有 fetch 请求都完成
    const productRequests = cart.map(item => {
        return fetch(`http://localhost:3000/products/${item.productId}`)
            .then(response => response.json())
            .then(product => {
                const totalItemPrice = product.price * item.quantity;
                totalPrice += totalItemPrice;

                const cartItemRow = `
                    <tr>
                        <td>${product.name}</td>
                        <td><input type="number" value="${item.quantity}" onchange="updateQuantity(${item.productId}, this.value)"></td>
                        <td>${product.price}</td>
                        <td>${totalItemPrice}</td>
                        <td><button onclick="removeFromCart(${item.productId})">删除</button></td>
                    </tr>`;
                cartTableBody.innerHTML += cartItemRow;
            })
            .catch(error => console.error('加载产品失败', error));
    });

    // 使用 Promise.all 来确保所有商品的请求都完成后再更新总金额
    Promise.all(productRequests).then(() => {
        totalPriceElement.textContent = totalPrice.toFixed(2);  // 确保显示为两位小数
    });
}

// 更新购物车商品数量
function updateQuantity(productId, quantity) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const productIndex = cart.findIndex(item => item.productId === productId);
    if (productIndex > -1) {
        cart[productIndex].quantity = quantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart(); // 更新页面
    }
}

// 从购物车中删除商品
function removeFromCart(productId) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const updatedCart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    loadCart();  // 刷新购物车
}

// 创建订单时，跳转到结账页面并传递订单ID
function checkout() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    fetch('http://localhost:3000/orders/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const orderId = data.orderId;  // 获取生成的订单ID
                localStorage.setItem('orderId', orderId);
                alert('结账成功');
                // 跳转到结账页面，并传递订单ID
                window.location.href = `checkout.html?orderId=${orderId}`;
            } else {
                alert(data.message || '结账失败');
            }
        })
        .catch(error => {
            console.error('结账失败', error);
            alert('结账失败，请重试');
        });
}

// 页面加载时，调用加载购物车
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
});