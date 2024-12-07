document.addEventListener('DOMContentLoaded', () => {
    // 从 localStorage 获取用户信息
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    console.log(user);

    // 只有当用户信息存在且格式正确时才解析
    if (user && token) {
        try {
            const userData = JSON.parse(user);
            
            // 处理用户登录状态
            if (userData) {
                // 显示用户名
                const usernameElement = document.getElementById('username');
                if (usernameElement) {
                    usernameElement.textContent = `欢迎，${userData.username}`;
                }
                
                // 显示注销按钮
                const logoutButton = document.getElementById('logout-button');
                if (logoutButton) {
                    logoutButton.style.display = 'inline-block';
                }
                
                // 隐藏登录、注册链接
                document.getElementById('login-link').style.display = 'none';
                document.getElementById('register-link').style.display = 'none';

                // 确保购物车链接存在并显示
                const cartLink = document.getElementById('cart-link');
                if (cartLink) {
                    cartLink.style.display = 'inline-block'; // 显示购物车链接
                }
                
                // 根据角色判断是否显示销售管理链接
                if (userData.role === 'sales') {
                    document.getElementById('admin-link').style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('解析 user 数据时出错', error);
            // 如果解析失败，则不显示用户信息
            localStorage.removeItem('user');
        }
    } else {
        console.log('用户未登录');
        // 如果没有用户信息，隐藏用户信息和管理链接
        const usernameElement = document.getElementById('username');
        if (usernameElement) {
            usernameElement.textContent = '';
        }
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
        document.getElementById('admin-link').style.display = 'none';

        // 确保购物车链接默认隐藏
        const cartLink = document.getElementById('cart-link');
        if (cartLink) {
            cartLink.style.display = 'none';
        }
    }

    // 获取产品列表并渲染到页面
    loadProducts();
});


// 登出功能
function logout() {
    localStorage.removeItem('user'); // 清除用户信息
    window.location.href = 'login.html'; // 跳转到登录页面
}

// 加载并展示产品列表
function loadProducts() {
    const productList = document.getElementById('product-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    // 显示加载指示器
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';

    fetch('http://localhost:3000/products')
        .then(response => response.json())
        .then(products => {
            loadingIndicator.style.display = 'none';

            if (Array.isArray(products) && products.length > 0) {
                let productsHTML = '';
                products.forEach(product => {
                    productsHTML += `
                        <div class="product-card">
                            <img src="${product.imageUrl}" alt="${product.name}">
                            <h3>${product.name}</h3>
                            <p>${product.price}元</p>
                            <a href="productDetails.html?id=${product.id}">查看详情</a>
                            <button onclick="addToCart(${product.id})">加入购物车</button>
                        </div>
                    `;
                });
                productList.innerHTML = productsHTML;
            } else {
                errorMessage.style.display = 'block';
                errorMessage.textContent = '没有找到产品，稍后再试';
            }
        })
        .catch(error => {
            loadingIndicator.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.textContent = '加载产品失败，请稍后重试';
            console.error('获取产品数据失败', error);
        });
}

// 加入购物车功能
function addToCart(productId) {
    const user = JSON.parse(localStorage.getItem('user')); // 获取用户信息
    if (!user) {
        alert('请先登录再添加商品到购物车');
        window.location.href = 'login.html';  // 跳转到登录页面
        return;
    }

    const token = localStorage.getItem('token'); // 获取存储的 JWT token
    const quantity = 1;  // 假设每次加入一个商品

    // 发送请求到后端，检查用户是否登录并添加商品
    fetch('http://localhost:3000/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('商品已添加到购物车');
            } else {
                alert(data.message || '添加到购物车失败');
            }
        })
        .catch(error => {
            console.error('添加到购物车失败', error);
            alert('添加到购物车失败，请重试');
        });
}
