// 产品详情页面专用脚本
document.addEventListener('DOMContentLoaded', async function () {
    // 检查用户登录状态
    updateLoginStatus();
    
    // 获取URL中的产品ID
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    const productInfo = document.getElementById('product-info');
    if (!productInfo) {
        console.error('找不到product-info元素');
        return;
    }
    
    if (!id) {
        productInfo.innerHTML = '<p class="error">未提供产品ID</p>';
        return;
    }
    
    // 设置全局变量，用于记录停留时间
    window.productId = id;
    
    try {
        // 获取产品详情
        const response = await fetch(`http://localhost:3000/products/${id}`);
        const data = await response.json();
        
        if (!data.success || !data.product) {
            throw new Error('获取产品详情失败');
        }
        
        const product = data.product;
        
        // 显示产品详情
        displayProductDetails(product);
        
        // 绑定加入购物车按钮事件
        const addToCartButton = document.getElementById('add-to-cart');
        if (addToCartButton) {
            addToCartButton.setAttribute('data-id', product.id);
            addToCartButton.addEventListener('click', () => addToCart(product.id));
        }
        
        // 加载推荐产品
        await loadRecommendations(id);
        
    } catch (error) {
        console.error('获取产品详情失败:', error);
        if (productInfo) {
            productInfo.innerHTML = '<p class="error">获取产品详情失败，请稍后重试</p>';
        }
    }
});

// 更新登录状态
function updateLoginStatus() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const cartLink = document.getElementById('cart-link');
    const adminLink = document.getElementById('admin-link');
    const usernameDiv = document.getElementById('username');
    const logoutButton = document.getElementById('logout-button');
    
    if (user && token) {
        // 已登录状态
        const userData = JSON.parse(user);
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (cartLink) cartLink.style.display = 'inline';
        if (logoutButton) logoutButton.style.display = 'inline';
        if (usernameDiv) usernameDiv.textContent = `欢迎, ${userData.username}`;
        
        // 如果是销售人员，显示产品管理链接
        if (userData.role === 'sales' && adminLink) {
            adminLink.style.display = 'inline';
        }
    } else {
        // 未登录状态
        if (loginLink) loginLink.style.display = 'inline';
        if (registerLink) registerLink.style.display = 'inline';
        if (cartLink) cartLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
        if (usernameDiv) usernameDiv.textContent = '';
    }
    
    // 如果存在注销按钮，绑定事件
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }
}

// 显示产品详情
function displayProductDetails(product) {
    const productInfo = document.getElementById('product-info');
    if (!productInfo) return;
    
    // 确保图片URL是可用的
    let imageUrl = product.imageUrl || '/images/default-product.png';
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = '/' + imageUrl;
    }
    
    // 将价格转换为数字并格式化（如果是字符串）
    let price = product.price;
    if (typeof price === 'string') {
        price = parseFloat(price);
    }
    
    const formattedPrice = isNaN(price) ? product.price : price.toFixed(2);
    
    productInfo.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.png'">
        </div>
        <div class="product-content">
            <h1>${product.name}</h1>
            <p class="price">¥${formattedPrice}</p>
            <p class="stock">库存: ${product.stock}</p>
            <p class="category">类别: ${product.category || '未分类'}</p>
            <div class="description">
                <h3>商品描述</h3>
                <p>${product.description || '暂无描述'}</p>
            </div>
            <div class="quantity">
                <label for="quantity">数量:</label>
                <input type="number" id="quantity" value="1" min="1" max="${product.stock}">
            </div>
        </div>
    `;
}

// 添加到购物车函数
function addToCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    // 获取数量
    let quantity = 1;
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantity = parseInt(quantityInput.value, 10);
        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
        }
    }

    fetch('http://localhost:3000/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            productId: parseInt(productId),
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const goToCart = confirm('添加成功！是否立即查看购物车？');
            if (goToCart) {
                window.location.href = 'cart.html';
            }
        } else {
            alert(data.message || '添加失败，请重试');
        }
    })
    .catch(error => {
        console.error('添加到购物车失败:', error);
        alert('添加失败，请重试');
    });
}

// 加载所有推荐
async function loadRecommendations(productId) {
    try {
        // 加载相似商品推荐
        await loadSimilarProducts(productId);
        
        // 如果用户已登录，加载个性化推荐
        if (localStorage.getItem('token')) {
            await loadUserRecommendations(productId);
        }
        
        // 加载热门商品推荐
        await loadPopularProducts(productId);
        
    } catch (error) {
        console.error('加载推荐失败:', error);
    }
}

// 加载相似产品推荐
async function loadSimilarProducts(productId) {
    const similarProductsSection = document.getElementById('similar-products');
    if (!similarProductsSection) return;
    
    try {
        const response = await fetch(`http://localhost:3000/recommendations/similar/${productId}`);
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            const similarProductsHTML = createRecommendationSection('相似商品推荐', data.products);
            similarProductsSection.innerHTML = similarProductsHTML;
            
            // 绑定加入购物车按钮事件
            similarProductsSection.querySelectorAll('.add-to-cart-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const id = button.getAttribute('data-id');
                    addToCart(id);
                });
            });
        } else {
            similarProductsSection.innerHTML = '';
        }
    } catch (error) {
        console.error('加载相似产品推荐失败:', error);
        similarProductsSection.innerHTML = '';
    }
}

// 加载用户个性化推荐
async function loadUserRecommendations(currentProductId) {
    const personalRecommendationsSection = document.getElementById('personal-recommendations');
    if (!personalRecommendationsSection) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            personalRecommendationsSection.style.display = 'none';
            return;
        }
        
        const response = await fetch('http://localhost:3000/recommendations/mine', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
            // 过滤掉当前产品
            const filteredRecommendations = data.recommendations.filter(rec => 
                rec.product && rec.product.id !== parseInt(currentProductId)
            ).map(rec => rec.product);
            
            if (filteredRecommendations.length > 0) {
                const userRecsHTML = createRecommendationSection('为您推荐', filteredRecommendations);
                personalRecommendationsSection.innerHTML = userRecsHTML;
                personalRecommendationsSection.style.display = 'block';
                
                // 绑定加入购物车按钮事件
                personalRecommendationsSection.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const id = button.getAttribute('data-id');
                        addToCart(id);
                    });
                });
            } else {
                personalRecommendationsSection.style.display = 'none';
            }
        } else {
            personalRecommendationsSection.style.display = 'none';
        }
    } catch (error) {
        console.error('加载个性化推荐失败:', error);
        personalRecommendationsSection.style.display = 'none';
    }
}

// 加载热门产品
async function loadPopularProducts(currentProductId) {
    const popularRecommendationsSection = document.getElementById('popular-recommendations');
    if (!popularRecommendationsSection) return;
    
    try {
        const response = await fetch('http://localhost:3000/recommendations/popular');
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            // 过滤掉当前产品
            const filteredPopular = data.products.filter(product => 
                product.id !== parseInt(currentProductId)
            );
            
            if (filteredPopular.length > 0) {
                const popularRecsHTML = createRecommendationSection('热门商品', filteredPopular);
                popularRecommendationsSection.innerHTML = popularRecsHTML;
                
                // 绑定加入购物车按钮事件
                popularRecommendationsSection.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const id = button.getAttribute('data-id');
                        addToCart(id);
                    });
                });
            } else {
                popularRecommendationsSection.innerHTML = '';
            }
        } else {
            popularRecommendationsSection.innerHTML = '';
        }
    } catch (error) {
        console.error('加载热门产品失败:', error);
        popularRecommendationsSection.innerHTML = '';
    }
}

// 创建推荐区块HTML
function createRecommendationSection(title, products) {
    if (!products || products.length === 0) return '';
    
    const productsHtml = products.map(product => {
        // 确保图片URL是可用的
        let imageUrl = product.imageUrl || '/images/default-product.png';
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
        }
        
        // 将价格转换为数字并格式化（如果是字符串）
        let price = product.price;
        if (typeof price === 'string') {
            price = parseFloat(price);
        }
        
        const formattedPrice = isNaN(price) ? product.price : price.toFixed(2);
        
        return `
            <div class="product-card">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.png'">
                <h3>${product.name}</h3>
                <p class="price">¥${formattedPrice}</p>
                <div class="product-actions">
                    <a href="productDetails.html?id=${product.id}" class="view-btn">查看详情</a>
                    <button class="add-to-cart-btn" data-id="${product.id}">加购</button>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="recommendation-section">
            <h2>${title}</h2>
            <div class="product-grid">
                ${productsHtml}
            </div>
        </div>
    `;
}