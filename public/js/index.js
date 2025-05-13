document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态并更新UI
    updateLoginStatus();
    
    // 创建搜索框
    const mainContent = document.querySelector('#main-content');
    const productListContainer = document.querySelector('#product-list');
    
    if (mainContent && productListContainer) {
        // 添加搜索功能
        const searchForm = document.createElement('div');
        searchForm.className = 'search-form';
        searchForm.innerHTML = `
            <input type="text" id="search-input" placeholder="按商品名称搜索...">
            <button id="search-button">搜索</button>
        `;
        mainContent.insertBefore(searchForm, productListContainer);
        
        // 创建搜索状态提示区域
        const searchStatus = document.createElement('div');
        searchStatus.className = 'search-status';
        searchStatus.id = 'search-status';
        searchStatus.style.display = 'none';
        mainContent.insertBefore(searchStatus, productListContainer);
          // 创建类别筛选区域
        const categoryFilter = document.createElement('div');
        categoryFilter.className = 'category-filter-container';
        categoryFilter.innerHTML = `
            <div class="filter-header">
                <h3>按类别筛选</h3>
            </div>
            <div class="categories-wrapper">
                <button class="category-btn active" data-category="">全部</button>
                <div id="category-buttons-container">
                    <div class="category-skeleton"></div>
                    <div class="category-skeleton"></div>
                    <div class="category-skeleton"></div>
                    <div class="category-skeleton"></div>
                </div>
            </div>
        `;
        
        // 从服务器加载类别
        fetchCategories();
        mainContent.insertBefore(categoryFilter, productListContainer);
        
        // 在产品列表容器后添加加载指示器
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'infinite-scroll-loader';
        loadingIndicator.className = 'infinite-scroll-loader';
        loadingIndicator.innerHTML = '<div class="loader-spinner"></div><p>加载更多商品...</p>';
        loadingIndicator.style.display = 'none';
        productListContainer.parentNode.insertBefore(loadingIndicator, productListContainer.nextSibling);
        
        // 全局变量存储当前搜索和筛选状态
        window.currentState = {
            searchQuery: '',
            category: '',
            allProducts: [],  // 存储所有已加载的产品
            filteredProducts: [], // 存储筛选后的结果
            pagination: {
                page: 1,
                limit: 12,
                total: 0,
                totalPages: 0,
                hasMore: true
            },
            isLoading: false // 是否正在加载产品
        };
        
        // 绑定搜索按钮事件
        document.getElementById('search-button').addEventListener('click', () => {
            performSearch();
        });
        
        // 绑定回车键搜索
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
          // 绑定"全部"类别按钮点击事件
        const allCategoryBtn = document.querySelector('.category-btn[data-category=""]');
        if (allCategoryBtn) {
            allCategoryBtn.addEventListener('click', () => {
                // 更新按钮状态
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('active');
                });
                allCategoryBtn.classList.add('active');
                
                // 应用类别筛选
                filterByCategory('');
            });
        }

        // 添加滚动事件监听，实现无限滚动
        window.addEventListener('scroll', handleInfiniteScroll);
        
        // 初始加载产品
        loadProducts();
    }
});

// 搜索功能
function performSearch() {
    const searchQuery = document.getElementById('search-input').value.trim();
    
    // 仅当搜索查询发生变化时才重新加载
    if (window.currentState.searchQuery !== searchQuery) {
        window.currentState.searchQuery = searchQuery;
        window.currentState.category = ''; // 重置类别筛选
        
        // 重置类别按钮状态
        document.querySelectorAll('.category-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index === 0); // 只激活"全部"按钮
        });
        
        // 重置产品列表和分页信息
        document.getElementById('product-list').innerHTML = '';
        window.currentState.allProducts = [];
        window.currentState.filteredProducts = [];
        window.currentState.pagination = {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasMore: true
        };
        
        // 删除之前的"已加载全部商品"提示
        const endMessage = document.getElementById('end-of-products-message');
        if (endMessage) {
            endMessage.remove();
        }
        
        // 加载搜索结果
        loadProducts(searchQuery);
    }
}

// 按类别筛选当前搜索结果
function filterByCategory(category) {
    // 只有当类别发生变化时才重新加载
    if (window.currentState.category !== category) {
        window.currentState.category = category;
        
        // 重置页面和分页信息
        document.getElementById('product-list').innerHTML = '';
        window.currentState.allProducts = [];
        window.currentState.filteredProducts = [];
        window.currentState.pagination = {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasMore: true
        };
        
        // 删除之前的"已加载全部商品"提示
        const endMessage = document.getElementById('end-of-products-message');
        if (endMessage) {
            endMessage.remove();
        }
        
        // 使用新的类别加载产品
        loadProducts(window.currentState.searchQuery);
    }
}

// 更新搜索状态提示
function updateSearchStatus(resultCount) {
    const searchStatus = document.getElementById('search-status');
    const query = window.currentState.searchQuery;
    const category = window.currentState.category;
    
    // 显示搜索状态
    searchStatus.style.display = 'flex';
    
    if (resultCount === 0) {
        // 无结果状态
        searchStatus.className = 'search-status no-results';
        
        let message = '';
        if (query && category) {
            message = `未找到类别为"${category}"且名称包含"${query}"的商品`;
        } else if (query) {
            message = `未找到名称包含"${query}"的商品`;
        } else if (category) {
            message = `未找到类别为"${category}"的商品`;
        } else {
            message = '没有任何商品';
        }
        
        searchStatus.innerHTML = `
            <div class="status-info">
                <span class="status-icon">⚠️</span>
                <span>${message}</span>
            </div>
            <button class="clear-filters">清除筛选</button>
        `;
        
        // 绑定清除筛选按钮事件
        searchStatus.querySelector('.clear-filters').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            window.currentState.searchQuery = '';
            window.currentState.category = '';
            
            // 重置类别按钮状态
            document.querySelectorAll('.category-btn').forEach((btn, index) => {
                btn.classList.toggle('active', index === 0);
            });
            
            // 重新加载所有产品
            loadProducts();
        });
    } else {
        // 有结果状态
        searchStatus.className = 'search-status';
        
        let message = '';
        if (query && category) {
            message = `找到 ${resultCount} 个类别为"${category}"且名称包含"${query}"的商品`;
        } else if (query) {
            message = `找到 ${resultCount} 个名称包含"${query}"的商品`;
        } else if (category) {
            message = `找到 ${resultCount} 个类别为"${category}"的商品`;
        } else {
            message = `共有 ${resultCount} 个商品`;
        }
        
        searchStatus.innerHTML = `
            <div class="status-info">
                <span class="status-icon">🔍</span>
                <span>${message}</span>
            </div>
            ${(query || category) ? '<button class="clear-filters">清除筛选</button>' : ''}
        `;
        
        // 如果有清除筛选按钮，绑定事件
        const clearButton = searchStatus.querySelector('.clear-filters');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                document.getElementById('search-input').value = '';
                window.currentState.searchQuery = '';
                window.currentState.category = '';
                
                // 重置类别按钮状态
                document.querySelectorAll('.category-btn').forEach((btn, index) => {
                    btn.classList.toggle('active', index === 0);
                });
                
                // 重新加载所有产品
                loadProducts();
            });
        }
    }
}

// 加载产品列表
function loadProducts(searchQuery = '', resetPage = true) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const searchStatus = document.getElementById('search-status');
    const infiniteScrollLoader = document.getElementById('infinite-scroll-loader');

    // 如果是重置页面，清空现有商品和分页信息
    if (resetPage) {
        window.currentState.allProducts = [];
        window.currentState.filteredProducts = [];
        window.currentState.pagination = {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasMore: true
        };
        document.getElementById('product-list').innerHTML = '';
    }

    // 如果已经没有更多产品可加载，直接返回
    if (!window.currentState.pagination.hasMore) {
        return;
    }

    // 如果正在加载中，则不重复加载
    if (window.currentState.isLoading) {
        return;
    }

    // 更新当前搜索查询
    if (resetPage) {
        window.currentState.searchQuery = searchQuery;
        // 注意：不再在这里重置类别，让filterByCategory函数专门处理类别变更
    }
    
    // 标记加载状态
    window.currentState.isLoading = true;
    
    // 显示加载指示器
    if (resetPage && loadingIndicator) {
        loadingIndicator.style.display = 'block';
    } else if (!resetPage) {
        infiniteScrollLoader.style.display = 'block';
    }
    
    // 隐藏搜索状态(仅在重置页面时)
    if (resetPage && searchStatus) {
        searchStatus.style.display = 'none';
    }

    // 清空之前的错误信息
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }    // 构建API URL，添加搜索参数和分页参数
    const params = new URLSearchParams();
    const { page, limit } = window.currentState.pagination;
    
    if (searchQuery) {
        params.append('search', searchQuery);
    }
    
    if (window.currentState.category) {
        params.append('category', window.currentState.category);
    }
    
    // 添加已加载的产品ID到排除列表，避免重复获取
    if (!resetPage && window.currentState.allProducts.length > 0) {
        const loadedIds = window.currentState.allProducts.map(p => p.id);
        params.append('excludeIds', loadedIds.join(','));
    }
    
    params.append('page', page);
    params.append('limit', limit);
    
    // 修正API URL，添加/api前缀
    const apiUrl = `http://localhost:3000/api/products?${params.toString()}`;

    // 请求产品数据
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // 隐藏加载指示器
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            infiniteScrollLoader.style.display = 'none';
            
            // 更新加载状态
            window.currentState.isLoading = false;

            // 确保从响应中正确获取products数组和分页信息
            const products = data.products || [];
            
            // 将新加载的产品添加到已有产品列表中，避免重复添加
            // 使用Map根据产品ID去重
            const productsMap = new Map();
            
            // 将已有产品添加到Map中
            window.currentState.allProducts.forEach(product => {
                productsMap.set(product.id, product);
            });
            
            // 添加新产品，如果ID已存在则跳过
            products.forEach(product => {
                if (!productsMap.has(product.id)) {
                    productsMap.set(product.id, product);
                }
            });
            
            // 将Map转换回数组
            window.currentState.allProducts = Array.from(productsMap.values());
            window.currentState.filteredProducts = window.currentState.allProducts;
            
            // 更新分页信息
            if (data.pagination) {
                window.currentState.pagination = {
                    ...data.pagination,
                    page: page + 1 // 更新为下一页
                };
            }
            
            // 更新搜索状态提示(仅在重置页面或第一页时)
            if (resetPage) {
                updateSearchStatus(data.pagination.total || products.length);
            }
            
            // 追加显示产品
            appendProducts(products);
        })
        .catch(error => {
            console.error('加载产品失败:', error);
            // 隐藏加载指示器
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            infiniteScrollLoader.style.display = 'none';
            
            // 更新加载状态
            window.currentState.isLoading = false;

            if (errorMessage) {
                errorMessage.textContent = '加载失败，请稍后重试';
                errorMessage.style.display = 'block';
            }
        });
}

// 追加显示产品
function appendProducts(products) {
    const productList = document.getElementById('product-list');
    
    if (products.length === 0 && productList.children.length === 0) {
        // 无结果时显示空状态
        productList.innerHTML = `
            <div class="empty-results">
                <div class="icon">📭</div>
                <h3>未找到符合条件的商品</h3>
                <p>尝试使用其他关键词或清除筛选条件</p>
            </div>
        `;
        return;
    }
    
    // 获取当前页面上已存在的产品ID集合
    const existingProductIds = new Set();
    document.querySelectorAll('.product-item .view-details').forEach(button => {
        existingProductIds.add(button.getAttribute('data-id'));
    });
    
    // 向产品列表追加产品项，避免重复添加
    products.forEach(product => {
        // 检查产品是否已经存在于页面中
        if (existingProductIds.has(product.id.toString())) {
            return; // 跳过已存在的产品
        }
        
        const productElement = document.createElement('div');
        productElement.classList.add('product-item');
        productElement.setAttribute('data-product-id', product.id);
        
        // 处理图片URL
        let imageUrl = product.imageUrl || '/images/default-product.jpg';
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
            imageUrl = `/${imageUrl}`;
        }
        
        // 修改产品卡片内容，移除直接加入购物车按钮，仅保留"查看详情"按钮
        productElement.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.jpg'"/>
            <h3 title="${product.name}">${product.name}</h3>
            <p class="price">¥${product.price}</p>
            <div class="button-group">
                <button class="view-details" data-id="${product.id}">查看详情</button>
            </div>
        `;
        
        productList.appendChild(productElement);
    });
    
    // 绑定查看详情按钮事件
    document.querySelectorAll('.view-details:not([data-bound])').forEach(button => {
        button.setAttribute('data-bound', 'true');
        button.addEventListener('click', () => {
            const productId = button.getAttribute('data-id');
            
            // 记录商品浏览事件
            logProductView(productId);
            
            // 跳转到商品详情页
            window.location.href = `productDetails.html?id=${productId}`;
        });
    });
    
    // 添加卡片整体点击事件，点击卡片任何位置都跳转到详情页
    document.querySelectorAll('.product-item:not([data-bound])').forEach(card => {
        card.setAttribute('data-bound', 'true');
        card.addEventListener('click', (e) => {
            const detailsBtn = card.querySelector('.view-details');
            const productId = detailsBtn.getAttribute('data-id');
            
            // 记录商品浏览事件
            logProductView(productId);
            
            // 跳转到商品详情页
            window.location.href = `productDetails.html?id=${productId}`;
        });
    });
}

// 记录商品浏览事件
function logProductView(productId) {
    const token = localStorage.getItem('token');
    
    // 即使未登录也记录浏览数据
    fetch('http://localhost:3000/api/activity/log-view', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
            productId: parseInt(productId)
        })
    })
    .catch(error => {
        console.error('记录浏览数据失败:', error);
        // 静默失败，不影响用户体验
    });
}

// 滚动事件处理函数
function handleInfiniteScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.body.offsetHeight;
    const productList = document.getElementById('product-list');
    
    // 防抖处理，避免频繁触发滚动事件
    if (window.scrollTimeout) {
        clearTimeout(window.scrollTimeout);
    }
    
    window.scrollTimeout = setTimeout(() => {
        // 添加产品加载完毕的提示
        if (!window.currentState.pagination.hasMore && 
            !document.getElementById('end-of-products-message') && 
            productList.children.length > 0) {
            
            // 创建"所有产品加载完毕"的提示元素
            const endMessage = document.createElement('div');
            endMessage.id = 'end-of-products-message';
            endMessage.className = 'end-of-products';
            endMessage.innerHTML = '已加载全部商品';
            
            // 在产品列表后添加提示信息
            const infiniteScrollLoader = document.getElementById('infinite-scroll-loader');
            infiniteScrollLoader.parentNode.insertBefore(endMessage, infiniteScrollLoader.nextSibling);
            
            return; // 如果已经显示了提示，直接返回
        }
        
        // 当页面滚动到距离底部200px时，加载更多产品
        if (scrollPosition >= documentHeight - 200 && 
            window.currentState.pagination.hasMore && 
            !window.currentState.isLoading) {
            
            // 加载下一页产品
            loadProducts(window.currentState.searchQuery, false);
        }
    }, 100); // 100ms的防抖延迟
}

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
        
        // 如果是销售人员或管理员，显示管理界面链接
        if (user.role === 'sales' || user.role === 'admin') {
            adminLink.style.display = 'inline';
            adminLink.href = 'dashboard.html'; // 统一指向管理控制面板
            adminLink.textContent = user.role === 'admin' ? '管理控制面板' : '销售管理';
        } else {
            adminLink.style.display = 'none';
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

function addToCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    // 显示加载状态
    const button = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
    if (button) {
        button.disabled = true;
        button.textContent = '添加中...';
    }

    // 修正API URL，添加/api前缀
    fetch('http://localhost:3000/api/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            productId: parseInt(productId),
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
        if (button) {
            button.disabled = false;
            button.textContent = '加购';
        }
    });
}

// 从服务器获取类别并渲染类别筛选按钮
async function fetchCategories() {
    try {
        const response = await fetch('http://localhost:3000/api/products/categories/all');
        if (!response.ok) {
            throw new Error(`获取类别失败: ${response.status}`);
        }
        const data = await response.json();
        
        // 清空类别骨架屏
        const categoryButtonsContainer = document.getElementById('category-buttons-container');
        categoryButtonsContainer.innerHTML = '';
        
        if (data.success) {
            let categoryNames = [];
            
            // 优先使用完整的类别数据
            if (data.categoriesData && Array.isArray(data.categoriesData)) {
                categoryNames = data.categoriesData.map(category => category.name);
            } 
            // 兼容旧格式
            else if (data.categories && Array.isArray(data.categories)) {
                categoryNames = data.categories;
            }
            
            // 渲染类别按钮
            categoryNames.forEach(categoryName => {
                const categoryBtn = document.createElement('button');
                categoryBtn.className = 'category-btn';
                categoryBtn.setAttribute('data-category', categoryName);
                categoryBtn.textContent = categoryName;
                
                // 绑定点击事件
                categoryBtn.addEventListener('click', () => {
                    // 更新按钮状态
                    document.querySelectorAll('.category-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    categoryBtn.classList.add('active');
                    
                    // 应用类别筛选
                    filterByCategory(categoryName);
                });
                
                categoryButtonsContainer.appendChild(categoryBtn);
            });
        }
    } catch (error) {
        console.error('加载类别失败:', error);
        document.getElementById('category-buttons-container').innerHTML = `
            <div class="category-error">
                <p>加载类别失败</p>
                <button id="retry-categories">重试</button>
            </div>
        `;
        
        // 绑定重试按钮
        document.getElementById('retry-categories').addEventListener('click', () => {
            fetchCategories();
        });
    }
}
