// 页面加载时，根据URL参数加载产品或产品列表
document.addEventListener('DOMContentLoaded', function () {
    // 检查是否在产品列表页面
    const productsContainer = document.getElementById('products');
    if (productsContainer) {
        // 添加类别筛选
        const categories = [
            '电子产品', '服装', '家居', '厨房用品', '图书',
            '玩具', '运动器材', '美妆', '食品', '办公用品'
        ];
        
        const categoryFilter = document.createElement('div');
        categoryFilter.className = 'category-filter';
        categoryFilter.innerHTML = `
            <h3>按类别筛选</h3>
            <div class="category-buttons">
                <button class="category-btn active" data-category="">全部</button>
                ${categories.map(category => 
                    `<button class="category-btn" data-category="${category}">${category}</button>`
                ).join('')}
            </div>
        `;
        
        // 将类别筛选插入到搜索框下方
        const searchSection = document.getElementById('search-section');
        if (searchSection) {
            searchSection.appendChild(categoryFilter);
        } else {
            productsContainer.parentElement.insertBefore(categoryFilter, productsContainer);
        }
        
        // 绑定类别按钮点击事件
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有按钮的active类
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                // 为当前按钮添加active类
                btn.classList.add('active');
                
                const category = btn.getAttribute('data-category');
                const searchInput = document.getElementById('search-input');
                const searchQuery = searchInput ? searchInput.value : '';
                
                // 加载指定类别的产品
                loadProducts(searchQuery, category);
            });
        });
        
        // 获取搜索相关元素
        const searchButton = document.getElementById('search-button');
        const searchInput = document.getElementById('search-input');
        
        // 更新搜索框提示文本
        if (searchInput) {
            searchInput.placeholder = "按商品名称搜索...";
            
            // 绑定回车键搜索
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value;
                    loadProducts(query);
                }
            });
        }
        
        // 绑定搜索按钮
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const query = searchInput ? searchInput.value : '';
                loadProducts(query);
            });
        }
        
        // 加载产品列表
        loadProducts();
    }
    
    // 检查是否在产品详情页面
    const productInfo = document.getElementById('product-info');
    if (productInfo) {
        // 从URL获取产品ID
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId) {
            loadProductDetails(productId);
        } else {
            productInfo.innerHTML = '<p class="error">未提供产品ID</p>';
        }
    }
});

// 获取所有产品并展示
function loadProducts(query = '', category = '') {
    const productsContainer = document.getElementById('products');
    if (!productsContainer) return;
    
    productsContainer.innerHTML = '<p>加载中...</p>';
    
    // 构建API URL，添加搜索参数和类别参数
    let apiUrl = 'http://localhost:3000/products';
    const params = new URLSearchParams();
    
    if (query) {
        params.append('search', query);
    }
    
    if (category) {
        params.append('category', category);
    }
    
    // 添加参数到URL
    if (params.toString()) {
        apiUrl += `?${params.toString()}`;
    }
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const products = data.products || [];
            displayProducts(products, query, category);
        })
        .catch(error => {
            console.error('加载产品失败', error);
            productsContainer.innerHTML = '<p class="error">加载产品失败，请刷新页面重试</p>';
        });
}

// 显示产品列表
function displayProducts(products, query = '', category = '') {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';  // 清空产品列表
    
    if (products.length === 0) {
        let message = '暂无商品';
        if (category) {
            message = `在"${category}"类别下没有找到商品`;
        }
        if (query) {
            message += query ? ` 包含"${query}"的商品` : '';
        }
        
        productsContainer.innerHTML = `<p>${message}</p>`;
        return;
    }
    
    // 如果有类别筛选，显示筛选信息
    if (category) {
        const filterInfo = document.createElement('div');
        filterInfo.className = 'filter-info';
        filterInfo.innerHTML = `<p>类别: ${category} ${query ? `  关键词: ${query}` : ''}</p>`;
        productsContainer.appendChild(filterInfo);
    }
    
    products.forEach(product => {
        // 确保图片URL是可用的
        const imageUrl = product.imageUrl || 'http://localhost:3000/images/default-product.jpg';
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='http://localhost:3000/images/default-product.jpg'">
            <h3>${product.name}</h3>
            <p class="price">¥${product.price}</p>
            <div class="product-actions">
                <a href="productDetails.html?id=${product.id}" class="details-button">查看详情</a>
                <button class="cart-button" data-id="${product.id}">加入购物车</button>
            </div>
        `;
        
        productsContainer.appendChild(productCard);
    });
    
    // 绑定加入购物车按钮事件
    document.querySelectorAll('.cart-button').forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.getAttribute('data-id');
            addToCart(productId);
        });
    });
}

// 加载产品详情
function loadProductDetails(productId) {
    const productInfo = document.getElementById('product-info');
    productInfo.innerHTML = '<p>加载中...</p>';
    
    fetch(`http://localhost:3000/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.product) {
                displayProductDetails(data.product);
                
                // 保存产品ID到添加购物车按钮
                const addToCartButton = document.getElementById('add-to-cart');
                if (addToCartButton) {
                    addToCartButton.setAttribute('data-id', productId);
                    // 移除旧的事件监听器
                    addToCartButton.replaceWith(addToCartButton.cloneNode(true));
                    // 添加新的事件监听器
                    document.getElementById('add-to-cart').addEventListener('click', () => {
                        addToCart(productId);
                    });
                }
            } else {
                productInfo.innerHTML = '<p class="error">未找到该产品</p>';
            }
        })
        .catch(error => {
            console.error('加载产品详情失败', error);
            productInfo.innerHTML = '<p class="error">加载产品详情失败，请刷新页面重试</p>';
        });
}

// 显示产品详情
function displayProductDetails(product) {
    const productInfo = document.getElementById('product-info');
    
    // 确保图片URL是可用的
    const imageUrl = product.imageUrl || 'http://localhost:3000/images/default-product.jpg';
    
    productInfo.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='http://localhost:3000/images/default-product.jpg'">
        </div>
        <div class="product-content">
            <h1>${product.name}</h1>
            <p class="price">¥${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</p>
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

// 产品详情页面脚本
document.addEventListener('DOMContentLoaded', async function () {
    // 验证用户登录状态
    checkLoginStatus();
    
    // 获取URL中的产品ID
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) {
        document.getElementById('product-info').innerHTML = '<p>产品ID不存在</p>';
        return;
    }
    
    // 设置全局变量，用于记录停留时间
    productId = id;
    
    try {
        // 获取产品详情
        const response = await api.fetch(api.product.details(id));
        const product = response.product;
        
        // 显示产品详情
        displayProductDetails(product);
        
        // 绑定加入购物车按钮事件
        document.getElementById('add-to-cart').addEventListener('click', () => addToCart(product.id));
        
        // 加载相似商品推荐
        const similarProducts = await loadSimilarProducts(id);
        if (similarProducts && similarProducts.length > 0) {
            const similarProductsHtml = createRecommendationSection('相似商品推荐', similarProducts);
            document.getElementById('similar-products').innerHTML = similarProductsHtml;
            
            // 绑定相似商品的加入购物车按钮事件
            document.querySelectorAll('#similar-products .add-to-cart-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.id;
                    addToCart(productId);
                });
            });
        }
        
        // 如果用户已登录，加载个性化推荐
        if (localStorage.getItem('token')) {
            const userRecommendations = await loadUserRecommendations();
            if (userRecommendations && userRecommendations.length > 0) {
                // 过滤掉当前产品
                const filteredRecommendations = userRecommendations.filter(rec => 
                    rec.product && rec.product.id !== parseInt(id)
                ).map(rec => rec.product);
                
                if (filteredRecommendations.length > 0) {
                    const userRecsHtml = createRecommendationSection('为您推荐', filteredRecommendations);
                    document.getElementById('personal-recommendations').innerHTML = userRecsHtml;
                    document.getElementById('personal-recommendations').style.display = 'block';
                    
                    // 绑定个性化推荐的加入购物车按钮事件
                    document.querySelectorAll('#personal-recommendations .add-to-cart-btn').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const productId = e.target.dataset.id;
                            addToCart(productId);
                        });
                    });
                }
            }
        }
        
        // 加载热门商品推荐
        const popularProducts = await loadPopularProducts();
        if (popularProducts && popularProducts.length > 0) {
            // 过滤掉当前产品和已经在相似推荐中出现的产品
            const shownProductIds = new Set([parseInt(id)]);
            document.querySelectorAll('#similar-products .product-card').forEach(card => {
                const link = card.querySelector('a');
                const productId = new URLSearchParams(link.href.split('?')[1]).get('id');
                shownProductIds.add(parseInt(productId));
            });
            
            const filteredPopular = popularProducts.filter(product => 
                !shownProductIds.has(product.id)
            );
            
            if (filteredPopular.length > 0) {
                const popularRecsHtml = createRecommendationSection('热门商品', filteredPopular);
                document.getElementById('popular-recommendations').innerHTML = popularRecsHtml;
                
                // 绑定热门推荐的加入购物车按钮事件
                document.querySelectorAll('#popular-recommendations .add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productId = e.target.dataset.id;
                        addToCart(productId);
                    });
                });
            }
        }
        
    } catch (error) {
        console.error('获取产品详情失败:', error);
        document.getElementById('product-info').innerHTML = '<p>获取产品详情失败</p>';
    }
});

// 显示产品详情
function displayProductDetails(product) {
    const productInfoHtml = `
        <div class="product-image">
            <img src="${product.imageUrl || '/images/default-product.png'}" alt="${product.name}">
        </div>
        <div class="product-content">
            <h1>${product.name}</h1>
            <p class="price">¥${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</p>
            <p class="stock">库存: ${product.stock}</p>
            <div class="description">
                <h3>商品描述:</h3>
                <p>${product.description || '暂无描述'}</p>
            </div>
            <div class="category">
                <p>分类: ${product.category || '未分类'}</p>
            </div>
        </div>
    `;
    
    document.getElementById('product-info').innerHTML = productInfoHtml;
}

// 加入购物车
async function addToCart(productId) {
    // 检查用户是否登录
    if (!localStorage.getItem('token')) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await api.fetch(api.cart.add, {
            method: 'POST',
            body: JSON.stringify({
                productId: parseInt(productId),
                quantity: 1
            })
        });
        
        alert(response.message || '加入购物车成功');
    } catch (error) {
        console.error('加入购物车失败:', error);
        alert('加入购物车失败: ' + error.message);
    }
}

// 检查用户登录状态
function checkLoginStatus() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const cartLink = document.getElementById('cart-link');
    const adminLink = document.getElementById('admin-link');
    const usernameDiv = document.getElementById('username');
    const logoutButton = document.getElementById('logout-button');

    if (!loginLink || !registerLink || !usernameDiv) {
        // 如果元素不存在，直接返回
        return;
    }

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
}

// 加载相似产品推荐
async function loadSimilarProducts(productId) {
    try {
        const response = await fetch(`http://localhost:3000/recommendations/similar/${productId}`);
        const data = await response.json();
        return data.success ? data.products : [];
    } catch (error) {
        console.error('加载相似产品推荐失败:', error);
        return [];
    }
}

// 加载用户个性化推荐
async function loadUserRecommendations() {
    if (!localStorage.getItem('token')) return [];
    
    try {
        const response = await fetch('http://localhost:3000/recommendations/mine', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        return data.success ? data.recommendations : [];
    } catch (error) {
        console.error('加载个性化推荐失败:', error);
        return [];
    }
}

// 加载热门产品
async function loadPopularProducts() {
    try {
        const response = await fetch('http://localhost:3000/recommendations/popular');
        const data = await response.json();
        return data.success ? data.products : [];
    } catch (error) {
        console.error('加载热门产品失败:', error);
        return [];
    }
}

// 创建推荐区块HTML
function createRecommendationSection(title, products) {
    if (!products || products.length === 0) return '';
    
    const productsHtml = products.map(product => {
        const imageUrl = product.imageUrl || '/images/default-product.png';
        return `
            <div class="product-card">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.png'">
                <h3>${product.name}</h3>
                <p class="price">¥${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</p>
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
