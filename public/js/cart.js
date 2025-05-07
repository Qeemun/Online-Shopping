function loadCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const cartContent = document.getElementById('cart-content');
    const cartActions = document.getElementById('cart-actions');
    const emptyCartMessage = document.getElementById('empty-cart-message');

    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    cartContent.style.display = 'none';
    
    fetch('http://localhost:3000/cart/items', {
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
            throw new Error('获取购物车数据失败');
        }
        return response.json();
    })
    .then(data => {
        const cartTableBody = document.getElementById('cart-items-body');
        cartTableBody.innerHTML = '';
        
        if (!data.cartItems || data.cartItems.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartContent.style.display = 'none';
            return;
        }

        let totalPrice = 0;
        data.cartItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="商品图片"><img src="${item.product.imageUrl}" alt="${item.product.name}"></td>
                <td data-label="商品名称">${item.product.name}</td>
                <td data-label="数量">
                    <input type="number" 
                           class="quantity-input" 
                           value="${item.quantity}" 
                           min="1"
                           max="${item.product.stock}"
                           onchange="updateQuantity(${item.product.id}, this.value)">
                </td>
                <td data-label="单价">¥${item.product.price}</td>
                <td data-label="总价">¥${(item.product.price * item.quantity).toFixed(2)}</td>
                <td data-label="操作">
                    <button onclick="removeFromCart(${item.product.id})" class="btn btn-danger">删除</button>
                </td>
            `;
            cartTableBody.appendChild(row);
            totalPrice += item.product.price * item.quantity;
        });

        document.getElementById('total-price').textContent = `¥${totalPrice.toFixed(2)}`;
        cartContent.style.display = 'block';
        emptyCartMessage.style.display = 'none';
    })
    .catch(error => {
        console.error('加载购物车失败:', error);
        errorMessage.style.display = 'block';
        errorMessage.textContent = error.message;
        cartContent.style.display = 'none';
    })
    .finally(() => {
        loadingIndicator.style.display = 'none';
    });
}

function updateQuantity(productId, quantity) {
    const token = localStorage.getItem('token');
    if (!token) return;

    quantity = parseInt(quantity);
    if (quantity < 1) {
        alert('商品数量不能小于1');
        loadCart();
        return;
    }

    fetch('http://localhost:3000/cart/update', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: productId, quantity })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('更新失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadCart();
        } else {
            throw new Error(data.message || '更新失败');
        }
    })
    .catch(error => {
        console.error('更新数量失败:', error);
        alert(error.message);
        loadCart();
    });
}

function removeFromCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm('确定要删除这件商品吗？')) return;

    fetch('http://localhost:3000/cart/remove', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: productId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('删除失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadCart();
        } else {
            throw new Error(data.message || '删除失败');
        }
    })
    .catch(error => {
        console.error('删除失败:', error);
        alert(error.message);
    });
}

function checkout() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    const checkoutButton = document.getElementById('checkout-button');
    checkoutButton.disabled = true;
    checkoutButton.textContent = '正在创建订单...';

    fetch('http://localhost:3000/orders/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('创建订单失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.orderId) {
            localStorage.setItem('currentOrderId', data.orderId);
            window.location.href = `checkout.html?orderId=${data.orderId}`;
        } else {
            throw new Error(data.message || '创建订单失败');
        }
    })
    .catch(error => {
        console.error('创建订单失败:', error);
        alert(error.message);
    })
    .finally(() => {
        checkoutButton.disabled = false;
        checkoutButton.textContent = '去结算';
    });
}

document.addEventListener('DOMContentLoaded', loadCart);