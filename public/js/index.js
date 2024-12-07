// index.js

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
        .then(products => {
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';

            if (Array.isArray(products) && products.length > 0) {
                // 清空产品列表
                productList.innerHTML = '';
                products.forEach(product => {
                    const productElement = document.createElement('div');
                    productElement.classList.add('product-item');
                    productElement.innerHTML = `
                        <img src="${product.imageUrl}" alt="${product.name}" />
                        <h3>${product.name}</h3>
                        <p>${product.description}</p>
                        <p>价格: ¥${product.price}</p>
                        <p>库存: ${product.stock}</p>
                        <button class="product-button" data-id="${product.id}">添加到购物车</button>
                    `;
                    productList.appendChild(productElement);
                });

                // 绑定所有产品按钮的点击事件
                document.querySelectorAll('.product-button').forEach(button => {
                    button.addEventListener('click', function () {
                        const productId = this.getAttribute('data-id');
                        addToCart(productId);
                    });
                });
            } else {
                errorMessage.style.display = 'block';
                errorMessage.textContent = '没有找到产品，请稍后重试。';
            }
        })
        .catch(error => {
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';

            errorMessage.style.display = 'block';
            errorMessage.textContent = '加载产品失败，请稍后重试。';
            console.error('加载产品失败', error);
        });
}

// 模拟添加产品到购物车
function addToCart(productId) {
    console.log(`添加产品 ${productId} 到购物车`);
    // 此处可根据需要处理购物车的逻辑
}

// 页面加载时，自动加载产品
document.addEventListener('DOMContentLoaded', loadProducts);
