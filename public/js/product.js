// 获取所有产品并展示
function loadProducts(query = '') {
    fetch('http://localhost:3000/products/') 
        .then(response => response.json())
        .then(products => {
            const filteredProducts = filterProducts(products, query);
            displayProducts(filteredProducts);
        })
        .catch(error => console.error('加载产品失败', error));
}

// 过滤产品列表
function filterProducts(products, query) {
    if (!query) return products;  // 如果没有搜索条件，返回所有产品
    return products.filter(product => product.name.toLowerCase().includes(query.toLowerCase()));
}

// 显示产品列表
function displayProducts(products) {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';  // 清空产品列表
    if (products.length === 0) {
        productsContainer.innerHTML = '<p>没有找到匹配的产品。</p>';
    }
    products.forEach(product => {
        const productCard = `
            <div class="product-card">
                <img src="http://localhost:3000${item.Product.imageUrl}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price}元</p>
                <a href="productDetails.html?id=${product.id}">查看详情</a>
                <button onclick="addToCart(${product.id})">加入购物车</button>
            </div>`;
        productsContainer.innerHTML += productCard;
    });
}

// 处理搜索按钮点击事件
document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-input').value;
    loadProducts(query);
});

// 页面加载时，默认加载所有产品
document.addEventListener('DOMContentLoaded', function () {
    const productButton = document.getElementById('product-button');
    console.log(productButton);  // 确认获取到了元素

    if (productButton) {
        productButton.addEventListener('click', function () {
            console.log('按钮点击事件');
            // 其他代码逻辑
        });
    } else {
        console.error('产品按钮没有找到');
    }
});
