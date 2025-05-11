// 产品详情页面专用脚本
let viewStartTime = Date.now(); // 记录页面浏览起始时间

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
    viewStartTime = Date.now();
    
    try {
        // 获取产品详情
        const response = await fetch(`http://localhost:3000/api/products/${id}`);
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

// 页面卸载时记录浏览时间
window.addEventListener('beforeunload', function() {
    recordViewDuration();
});

// 记录产品浏览时间
function recordViewDuration() {
    try {
        if (!window.productId) return;
        
        const durationSeconds = Math.floor((Date.now() - viewStartTime) / 1000);
        if (durationSeconds < 1) return; // 忽略非常短的浏览
        
        console.log('记录产品浏览时间:', window.productId, '持续时间:', durationSeconds, '秒');
        
        // 调用API记录浏览时间
        logProductViewDuration(window.productId, durationSeconds);
        
        // 重置计时器
        viewStartTime = Date.now();
    } catch (error) {
        console.error('记录浏览时间出错:', error);
    }
}

// 定期记录浏览时间（每30秒）
setInterval(recordViewDuration, 30000);

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
    
    // 生成库存状态
    let stockStatus = '';
    let stockClass = '';
    if (product.stock > 20) {
        stockStatus = '有货';
        stockClass = 'in-stock';
    } else if (product.stock > 0) {
        stockStatus = `仅剩 ${product.stock} 件`;
        stockClass = 'low-stock';
    } else {
        stockStatus = '缺货';
        stockClass = 'out-of-stock';
    }

    productInfo.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.png'">
        </div>
        <div class="product-content">
            <h1>${product.name}</h1>
            <p class="price">¥${formattedPrice}</p>
            
            <div class="product-info-table">
                <span class="info-label">类别:</span>
                <span class="info-value">${product.category || '未分类'}</span>
                
                <span class="info-label">库存:</span>
                <span class="info-value ${stockClass}">${stockStatus}</span>
            </div>
            
            <div class="description">
                <h3>商品描述</h3>
                <p>${product.description || '暂无描述'}</p>
            </div>
            
            <div class="quantity">
                <label for="quantity">数量:</label>
                <input type="number" id="quantity" value="1" min="1" max="${product.stock}" ${product.stock <= 0 ? 'disabled' : ''}>
            </div>
        </div>
    `;
}

// 添加到购物车函数
function addToCart(productId, quantity = 1) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    // 显示加载状态
    const addToCartBtn = document.getElementById('add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = '添加中...';
    }

    // 调用API添加到购物车
    fetch('http://localhost:3000/api/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            productId: parseInt(productId),
            quantity: parseInt(quantity)
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
    })
    .finally(() => {
        // 恢复按钮状态
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = '加入购物车';
        }
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
        const response = await fetch(`http://localhost:3000/api/recommendations/similar/${productId}`);
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            const similarProductsHTML = createRecommendationSection('相似商品推荐', data.products);
            similarProductsSection.innerHTML = similarProductsHTML;            // 由于移除了加购按钮，不再需要绑定事件
            // 添加点击计数或其他分析代码（可选）
            similarProductsSection.querySelectorAll('.view-btn').forEach(link => {
                link.addEventListener('click', () => {
                    console.log('用户点击了相似商品:', link.getAttribute('href'));
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
        
        console.log('开始加载个性化推荐');
        
        // 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        try {
            const response = await fetch('http://localhost:3000/api/recommendations/mine', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`服务器返回错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();            console.log('获取推荐数据成功:', data.success);
            console.log('返回的推荐数据:', JSON.stringify(data, null, 2));
            
            if (data.success && data.recommendations && data.recommendations.length > 0) {
                // 过滤掉当前产品，同时确保每个推荐项都有完整的product字段
                const filteredRecommendations = data.recommendations
                    .filter(rec => rec && rec.product && 
                           rec.product.id && 
                           rec.product.id !== parseInt(currentProductId))
                    .map(rec => rec.product);
                    
                console.log(`过滤后剩余${filteredRecommendations.length}条推荐`);
                
                if (filteredRecommendations.length > 0) {
                    const userRecsHTML = createRecommendationSection('为您推荐', filteredRecommendations);
                    personalRecommendationsSection.innerHTML = userRecsHTML;
                    personalRecommendationsSection.style.display = 'block';
                    
                    // 由于移除了加购按钮，不再需要绑定事件
                    // 添加点击计数或其他分析代码（可选）
                    personalRecommendationsSection.querySelectorAll('.view-btn').forEach(link => {
                        link.addEventListener('click', () => {
                            console.log('用户点击了推荐商品:', link.getAttribute('href'));
                        });
                    });
                } else {
                    personalRecommendationsSection.style.display = 'none';
                }
            } else {
                console.log('未找到个性化推荐数据或数据格式不正确');
                personalRecommendationsSection.style.display = 'none';
            }
        } catch (fetchError) {
            console.error('获取推荐数据时出错:', fetchError);
        }
    } catch (error) {
        console.error('加载个性化推荐失败:', error);
        personalRecommendationsSection.style.display = 'none';
        
        // 检查是否是授权或登录相关的错误
        let errorMessage = '抱歉，我们暂时无法获取为您定制的商品推荐。';
        let showLoginButton = false;
        
        if (error.message && (error.message.includes('403') || error.message.includes('401') || error.message.includes('授权'))) {
            errorMessage = '您的登录已过期，请重新登录后查看个性化推荐。';
            showLoginButton = true;
        }
        
        // 显示友好的错误信息，而不是直接隐藏推荐区域
        personalRecommendationsSection.innerHTML = `
            <div class="recommendation-error">
                <h3>无法加载个性化推荐</h3>
                <p>${errorMessage}</p>
                ${showLoginButton 
                    ? `<button onclick="window.location.href='login.html'">去登录</button>` 
                    : `<button onclick="loadUserRecommendations('${currentProductId}')">重试</button>`
                }
            </div>
        `;
        personalRecommendationsSection.style.display = 'block';
    }
}

// 加载热门产品
async function loadPopularProducts(currentProductId) {
    const popularRecommendationsSection = document.getElementById('popular-recommendations');
    if (!popularRecommendationsSection) return;
    
    try {
        const response = await fetch('http://localhost:3000/api/recommendations/popular');
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            // 过滤掉当前产品
            const filteredPopular = data.products.filter(product => 
                product.id !== parseInt(currentProductId)
            );
            
            if (filteredPopular.length > 0) {
                const popularRecsHTML = createRecommendationSection('热门商品', filteredPopular);
                popularRecommendationsSection.innerHTML = popularRecsHTML;                // 由于移除了加购按钮，不再需要绑定事件
                // 添加点击计数或其他分析代码（可选）
                popularRecommendationsSection.querySelectorAll('.view-btn').forEach(link => {
                    link.addEventListener('click', () => {
                        console.log('用户点击了热门商品:', link.getAttribute('href'));
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
        const displayName = product.name;              return `
            <div class="product-card">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.png'">
                <h3 title="${product.name}">${displayName}</h3>
                <p class="price">${formattedPrice}</p>
                <div class="product-actions">
                    <a href="productDetails.html?id=${product.id}" class="view-btn full-width">查看详情</a>
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