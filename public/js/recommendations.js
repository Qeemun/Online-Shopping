// 产品推荐组件
function createRecommendationSection(title, products) {
    if (!products || products.length === 0) return '';
    
    const productCards = products.map(product => `
        <div class="product-card">
            <a href="productDetails.html?id=${product.id}">
                <img src="${product.imageUrl || '/images/default-product.png'}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">¥${product.price.toFixed(2)}</p>
            </a>
            <button class="add-to-cart-btn" data-id="${product.id}">加入购物车</button>
        </div>
    `).join('');
    
    return `
        <section class="recommendations">
            <h2>${title}</h2>
            <div class="product-cards-container">
                ${productCards}
            </div>
        </section>
    `;
}

// 加载用户个性化推荐
async function loadUserRecommendations() {
    try {
        // 检查用户是否登录
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const data = await api.fetch(api.recommendation.userRecommendations);
        return data.recommendations;
    } catch (error) {
        console.error('获取用户推荐失败:', error);
        return null;
    }
}

// 加载相似商品推荐
async function loadSimilarProducts(productId) {
    try {
        const data = await api.fetch(api.recommendation.similarProducts(productId));
        return data.similarProducts;
    } catch (error) {
        console.error('获取相似商品失败:', error);
        return [];
    }
}

// 加载热门商品推荐
async function loadPopularProducts() {
    try {
        const data = await api.fetch(api.recommendation.popularProducts);
        return data.popularProducts;
    } catch (error) {
        console.error('获取热门商品失败:', error);
        return [];
    }
}