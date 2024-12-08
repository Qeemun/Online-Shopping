document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态并更新UI
    updateLoginStatus();
    // 加载产品列表
    loadProducts();
});

// 添加更新登录状态的函数
function updateLoginStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const cartLink = document.getElementById('cart-link');
    const adminLink = document.getElementById('admin-link');
    const usernameDiv = document.getElementById('username');
    const logoutButton = document.getElementById('logout-button');

    if (user && token) {
        // 已登录状态
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        cartLink.style.display = 'inline';
        logoutButton.style.display = 'inline';
        usernameDiv.textContent = `欢迎, ${user.username}`;
        
        // 如果是销售人员，显示产品管理链接
        if (user.role === 'sales') {
            adminLink.style.display = 'inline';
        }
    } else {
        // 未登录状态
        loginLink.style.display = 'inline';
        registerLink.style.display = 'inline';
        cartLink.style.display = 'none';
        adminLink.style.display = 'none';
        logoutButton.style.display = 'none';
        usernameDiv.textContent = '';
    }
}

// 加载产品列表
function loadProducts() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const productList = document.getElementById('product-list');

    // 显示加载指示器
    loadingIndicator.style.display = 'block';

    // 清空之前的错误信息
    errorMessage.style.display = 'none';

    // 请求产品数据
    fetch('http://localhost:3000/products')
        .then(response => response.json())
        .then(data => {
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';

            // 确保从响应中正确获取products数组
            const products = data.products || [];

            if (products.length > 0) {
                // 清空产品列表
                productList.innerHTML = '';
                products.forEach(product => {
                    const productElement = document.createElement('div');
                    productElement.classList.add('product-item');
                    productElement.innerHTML = `
                        <img src="${product.imageUrl}" alt="${product.name}" />
                        <h3>${product.name}</h3>
                        <p class="price">¥${product.price}</p>
                        <p class="stock">库存: ${product.stock}</p>
                        <button class="add-to-cart" data-id="${product.id}">
                            添加到购物车
                        </button>
                    `;
                    productList.appendChild(productElement);
                });

                // 绑定添加到购物车按钮事件
                document.querySelectorAll('.add-to-cart').forEach(button => {
                    button.addEventListener('click', () => {
                        const productId = button.getAttribute('data-id');
                        addToCart(productId);
                    });
                });
            } else {
                errorMessage.textContent = '暂无商品';
                errorMessage.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('加载产品失败:', error);
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';

            errorMessage.textContent = '加载失败，请稍后重试';
            errorMessage.style.display = 'block';
        });
}

function addToCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    // 显示加载状态
    const button = document.querySelector(`button[data-id="${productId}"]`);
    button.disabled = true;
    button.textContent = '添加中...';

    fetch('http://localhost:3000/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: 1
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const goToCart = confirm('添加成功！是否立即查看购物车？');
            if (goToCart) {
                window.location.href = 'cart.html';
            }
        }
    })
    .catch(error => {
        console.error('添加到购物车失败:', error);
        alert('添加失败，请重试');
    })
    .finally(() => {
        // 恢复按钮状态
        button.disabled = false;
        button.textContent = '添加到购物车';
    });
}
