// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    checkAuth();
    
    // 初始化分页状态
    window.productsState = {
        pagination: {
            page: 1,
            limit: 10,
            hasMore: true
        },
        isLoading: false
    };
    
    // 加载所有商品（第一页）
    loadProducts();
    
    // 加载所有类别
    loadCategories();
    
    // 设置图片预览事件监听器
    setupImagePreviews();
    
    // 添加滚动事件监听，实现无限滚动
    window.addEventListener('scroll', handleInfiniteScroll);
});

// 检查用户是否已登录且为销售人员
function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(userStr);
    console.log('当前用户角色:', user.role); // 调试信息
    
    // 检查用户是否为销售人员
    if (user.role !== 'sales' ) {
        alert('您无权访问此页面');
        window.location.href = 'index.html';
        return;
    }
}

// 选项卡切换功能
function openTab(tabId) {
    // 隐藏所有选项卡内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // 取消所有选项卡按钮的活动状态
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // 显示选定的选项卡内容
    document.getElementById(tabId).classList.add('active');
    
    // 激活对应的按钮
    event.currentTarget.classList.add('active');
    
    // 如果是类别选项卡，刷新类别数据
    if (tabId === 'category-tab') {
        loadCategories();
    }
    
    // 如果是商品选项卡，刷新商品数据并重置分页
    if (tabId === 'product-tab') {
        // 重置分页状态
        window.productsState = {
            pagination: {
                page: 1,
                limit: 10,
                hasMore: true
            },
            isLoading: false
        };
        
        // 清空商品表格
        document.getElementById('product-table-body').innerHTML = '';
        
        // 加载第一页商品
        loadProducts();
    }
}

//==========================
// 商品管理功能
//==========================

// 加载并显示产品（支持分页）
function loadProducts(resetPage = true) {
    // 如果已经没有更多产品或正在加载中，则不重复加载
    if (!window.productsState.pagination.hasMore || window.productsState.isLoading) {
        return;
    }
    
    // 如果是重置页面，清空现有商品和分页信息
    if (resetPage) {
        window.productsState = {
            pagination: {
                page: 1,
                limit: 10,
                hasMore: true
            },
            isLoading: false
        };
        document.getElementById('product-table-body').innerHTML = '';
    }
    
    // 标记加载状态
    window.productsState.isLoading = true;
    
    // 显示加载指示器
    showLoadingIndicator();
    
    // 构建API URL，添加分页参数
    const { page, limit } = window.productsState.pagination;
    const apiUrl = `http://localhost:3000/products?page=${page}&limit=${limit}`;
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // 隐藏加载指示器
            hideLoadingIndicator();
            
            // 更新加载状态
            window.productsState.isLoading = false;
            
            if (data.success && Array.isArray(data.products)) {
                const productTableBody = document.getElementById('product-table-body');
                
                // 追加商品到表格
                data.products.forEach(product => {
                    const productRow = `
                        <tr>
                            <td>${product.name}</td>
                            <td>${product.category || '未分类'}</td>
                            <td>${product.price}</td>
                            <td>${product.stock}</td>
                            <td>
                                <button onclick="showEditProductForm(${product.id})">编辑</button>
                                <button class="btn-danger" onclick="deleteProduct(${product.id})">删除</button>
                            </td>
                        </tr>`;
                    productTableBody.innerHTML += productRow;
                });
                
                // 更新分页信息
                if (data.pagination) {
                    window.productsState.pagination = {
                        page: page + 1,
                        limit: limit,
                        hasMore: page < data.pagination.totalPages
                    };
                } else {
                    // 如果API未返回分页信息但返回了空数组，认为没有更多商品
                    window.productsState.pagination.hasMore = data.products.length === limit;
                }
                
                // 如果没有更多商品，显示"已加载全部"提示
                if (!window.productsState.pagination.hasMore) {
                    showEndMessage();
                }
            } else {
                console.error('获取的产品数据不是数组');
                window.productsState.pagination.hasMore = false;
            }
        })
        .catch(error => {
            console.error('加载产品失败', error);
            hideLoadingIndicator();
            window.productsState.isLoading = false;
            showNotification('加载商品数据失败，请重试', 'error');
        });
    
    // 同时加载商品种类用于下拉选择
    loadCategoriesForProducts();
}

// 显示加载指示器
function showLoadingIndicator() {
    // 检查是否已存在加载指示器
    let loadingIndicator = document.getElementById('products-loading-indicator');
    
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'products-loading-indicator';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="loader-spinner"></div><p>加载更多商品...</p>';
        
        // 添加到产品列表后面
        const productsList = document.getElementById('products-list');
        productsList.appendChild(loadingIndicator);
    } else {
        loadingIndicator.style.display = 'flex';
    }
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('products-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// 显示"已加载全部"提示
function showEndMessage() {
    // 检查是否已存在结束提示
    let endMessage = document.getElementById('end-of-products-message');
    
    if (!endMessage) {
        endMessage = document.createElement('div');
        endMessage.id = 'end-of-products-message';
        endMessage.className = 'end-of-products';
        endMessage.textContent = '已加载全部商品';
        
        // 添加到产品列表后面
        const productsList = document.getElementById('products-list');
        productsList.appendChild(endMessage);
    } else {
        endMessage.style.display = 'block';
    }
}

// 滚动事件处理函数
function handleInfiniteScroll() {
    // 只有在商品管理选项卡激活时才处理滚动
    if (!document.getElementById('product-tab').classList.contains('active')) {
        return;
    }
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.body.offsetHeight;
    
    // 当页面滚动到距离底部200px时，加载更多商品
    if (scrollPosition >= documentHeight - 200 && 
        window.productsState.pagination.hasMore && 
        !window.productsState.isLoading) {
        
        // 加载下一页商品
        loadProducts(false);
    }
}

// 专门为商品选择加载类别
function loadCategoriesForProducts() {
    fetch('http://localhost:3000/products/categories/all')
        .then(response => response.json())
        .then(data => {
            if (data.success && Array.isArray(data.categories)) {
                const addCategorySelect = document.getElementById('product-category');
                const editCategorySelect = document.getElementById('edit-product-category');
                
                // 清空现有选项（保留默认选项）
                addCategorySelect.innerHTML = '<option value="">-- 选择种类 --</option>';
                editCategorySelect.innerHTML = '<option value="">-- 选择种类 --</option>';
                
                // 添加所有类别
                data.categories.forEach(category => {
                    const option = `<option value="${category}">${category}</option>`;
                    addCategorySelect.innerHTML += option;
                    editCategorySelect.innerHTML += option;
                });
            }
        })
        .catch(error => console.error('加载商品类别失败', error));
}

// 图片预览功能
function setupImagePreviews() {
    document.getElementById('product-image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('image-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('edit-product-image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('edit-image-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });
}

// 删除产品
function deleteProduct(productId) {
    if (!confirm('确定要删除此商品吗？此操作不可逆。')) {
        return;
    }
    
    fetch(`http://localhost:3000/products/${productId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('产品已删除', 'success');
                loadProducts();  // 重新加载产品列表
            } else {
                showNotification('删除失败: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('删除产品失败', error);
            showNotification('删除失败，请重试', 'error');
        });
}

// 显示添加产品表单
function showAddProductForm() {
    document.getElementById('add-product-form').style.display = 'block';
}

// 隐藏添加产品表单
function hideAddProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('add-product-form').style.display = 'none';
}

// 显示编辑产品表单
function showEditProductForm(productId) {
    fetch(`http://localhost:3000/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                document.getElementById('edit-product-id').value = product.id;
                document.getElementById('edit-product-name').value = product.name;
                document.getElementById('edit-product-description').value = product.description || '';
                
                const categorySelect = document.getElementById('edit-product-category');
                if (product.category) {
                    // 寻找匹配的选项
                    for (let i = 0; i < categorySelect.options.length; i++) {
                        if (categorySelect.options[i].value === product.category) {
                            categorySelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                document.getElementById('edit-product-price').value = product.price;
                document.getElementById('edit-product-stock').value = product.stock;
                
                if (product.imageUrl) {
                    document.getElementById('edit-image-preview').src = `http://localhost:3000${product.imageUrl}`;
                    document.getElementById('edit-image-preview').style.display = 'block';
                } else {
                    document.getElementById('edit-image-preview').style.display = 'none';
                }
                
                document.getElementById('edit-product-form').style.display = 'block';
            } else {
                showNotification('获取产品信息失败', 'error');
            }
        })
        .catch(error => {
            console.error('获取产品信息失败', error);
            showNotification('获取产品信息失败，请重试', 'error');
        });
}

// 隐藏编辑产品表单
function hideEditProductForm() {
    document.getElementById('edit-form').reset();
    document.getElementById('edit-image-preview').style.display = 'none';
    document.getElementById('edit-product-form').style.display = 'none';
}

// 添加新产品
async function addProduct(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('product-name').value);
    formData.append('description', document.getElementById('product-description').value);
    formData.append('category', document.getElementById('product-category').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('stock', document.getElementById('product-stock').value);
    
    const imageFile = document.getElementById('product-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('http://localhost:3000/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData // 不需要设置 Content-Type，浏览器会自动设置
        });

        const data = await response.json();
        if (data.success) {
            showNotification('商品添加成功', 'success');
            document.getElementById('product-form').reset();
            document.getElementById('image-preview').style.display = 'none';
            hideAddProductForm();
            loadProducts();
        } else {
            showNotification('添加失败: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('添加商品失败:', error);
        showNotification('添加失败，请重试', 'error');
    }
}

// 更新产品信息
async function updateProduct(event) {
    event.preventDefault();

    const productId = document.getElementById('edit-product-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('edit-product-name').value);
    formData.append('description', document.getElementById('edit-product-description').value);
    formData.append('category', document.getElementById('edit-product-category').value);
    formData.append('price', document.getElementById('edit-product-price').value);
    formData.append('stock', document.getElementById('edit-product-stock').value);
    
    const imageFile = document.getElementById('edit-product-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`http://localhost:3000/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            showNotification('商品更新成功', 'success');
            hideEditProductForm();
            loadProducts();
        } else {
            showNotification('更新失败: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('更新商品失败:', error);
        showNotification('更新失败，请重试', 'error');
    }
}

//==========================
// 类别管理功能
//==========================

// 加载所有类别
async function loadCategories() {
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
            throw new Error('用户未登录');
        }
        
        const user = JSON.parse(userStr);
        
        console.log('开始加载类别数据, 用户角色:', user.role); // 调试信息
        
        // 使用正确的API路径
        const response = await fetch(`http://localhost:3000/products/categories/all`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取类别失败, 状态码: ' + response.status);
        }
        
        const data = await response.json();
        console.log('获取到的类别数据:', data); // 调试信息
        
        if (!data.success) {
            throw new Error(data.message || '获取类别失败');
        }
        
        // 获取每个类别的商品数量
        const categoriesWithCount = await Promise.all(data.categories.map(async (categoryName) => {
            try {
                const countResponse = await fetch(`http://localhost:3000/products/category/${categoryName}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!countResponse.ok) {
                    return {
                        id: categoryName,
                        name: categoryName,
                        description: '',
                        productCount: 0
                    };
                }
                
                const countData = await countResponse.json();
                return {
                    id: categoryName,
                    name: categoryName,
                    description: '',
                    productCount: countData.success ? countData.products.length : 0
                };
            } catch (error) {
                console.error(`获取类别 ${categoryName} 的商品数量失败:`, error);
                return {
                    id: categoryName,
                    name: categoryName,
                    description: '',
                    productCount: 0
                };
            }
        }));
        
        console.log('处理后的类别数据:', categoriesWithCount);
        
        // 显示类别数据
        displayCategories(categoriesWithCount);
        
        // 更新添加类别表单的父类别选项
        updateParentCategoryOptions(categoriesWithCount);
    } catch (error) {
        console.error('加载类别出错:', error);
        showNotification(error.message, 'error');
        document.getElementById('categories-container').innerHTML = `
            <p>无法加载类别数据</p>
            <p class="error-details">${error.message}</p>
        `;
    }
}

// 显示类别数据
function displayCategories(categories) {
    const categoriesContainer = document.getElementById('categories-container');
    
    if (!categories || categories.length === 0) {
        categoriesContainer.innerHTML = '<p class="no-categories">暂无类别数据</p>';
        return;
    }
    
    categoriesContainer.innerHTML = '';
    
    // 过滤出顶级类别（没有父类别的类别）
    const topLevelCategories = categories.filter(category => !category.parentId);
    
    // 按层级显示类别
    topLevelCategories.forEach(category => {
        const categoryElement = createCategoryElement(category, categories);
        categoriesContainer.appendChild(categoryElement);
    });
}

// 创建单个类别元素
function createCategoryElement(category, allCategories) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-item';
    categoryDiv.innerHTML = `
        <div class="category-info">
            <div class="category-name">${category.name}</div>
            <div class="category-meta">
                ${category.description || ''}
                <span>${category.productCount || 0} 个商品</span>
            </div>
        </div>
        <div class="category-actions">
            <button onclick="showCategoryProducts('${category.name}')">查看商品</button>
            <button onclick="showEditCategoryForm('${category.name}')">编辑</button>
            <button class="btn-danger" onclick="deleteCategory('${category.name}')">删除</button>
        </div>
    `;
    
    // 查找该类别的子类别
    const childCategories = allCategories.filter(child => child.parentId === category.id);
    
    if (childCategories.length > 0) {
        const subcategoriesDiv = document.createElement('div');
        subcategoriesDiv.className = 'subcategory-container';
        
        childCategories.forEach(childCategory => {
            const childElement = createCategoryElement(childCategory, allCategories);
            subcategoriesDiv.appendChild(childElement);
        });
        
        const categoryWrapper = document.createElement('div');
        categoryWrapper.appendChild(categoryDiv);
        categoryWrapper.appendChild(subcategoriesDiv);
        
        return categoryWrapper;
    }
    
    return categoryDiv;
}

// 更新父类别下拉选项
function updateParentCategoryOptions(categories) {
    const parentCategorySelect = document.getElementById('parent-category');
    
    // 清空现有选项（保留默认选项）
    parentCategorySelect.innerHTML = '<option value="">-- 顶级类别 --</option>';
    
    if (!categories || categories.length === 0) {
        return;
    }
    
    // 添加所有可能的父类别
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        parentCategorySelect.appendChild(option);
    });
}

// 添加新类别
async function addCategory(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        
        const categoryName = document.getElementById('category-name').value;
        const categoryDescription = document.getElementById('category-description').value;
        
        // 使用正确的API路径
        const response = await fetch(`http://localhost:3000/products/categories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: categoryName,
                description: categoryDescription
            })
        });
        
        if (!response.ok) {
            throw new Error('添加类别失败，状态码: ' + response.status);
        }
        
        const data = await response.json();
        console.log('添加类别响应:', data); // 调试信息
        
        if (!data.success) {
            throw new Error(data.message || '添加类别失败');
        }
        
        // 重置表单
        document.getElementById('add-category-form').reset();
        
        // 重新加载类别列表
        loadCategories();
        
        showNotification('类别添加成功', 'success');
    } catch (error) {
        console.error('添加类别出错:', error);
        showNotification(error.message, 'error');
    }
}

// 显示编辑类别表单
function showEditCategoryForm(categoryId) {
    fetchCategoryDetails(categoryId)
        .then(category => {
            // 填充编辑表单
            document.getElementById('edit-category-id').value = category.id;
            document.getElementById('edit-category-name').value = category.name;
            document.getElementById('edit-category-description').value = category.description || '';
            
            // 显示编辑模态框
            document.getElementById('edit-category-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('获取类别详情出错:', error);
            showNotification(error.message, 'error');
        });
}

// 获取类别详情
async function fetchCategoryDetails(categoryId) {
    try {
        const token = localStorage.getItem('token');
        
        // 获取指定类别的商品，从中提取类别信息
        const response = await fetch(`http://localhost:3000/products/category/${categoryId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取类别详情失败，状态码: ' + response.status);
        }
        
        const data = await response.json();
        console.log('获取类别详情响应:', data); // 调试信息
        
        if (!data.success) {
            throw new Error(data.message || '获取类别详情失败');
        }
        
        // 返回构造的类别对象
        return {
            id: data.category,
            name: data.category,
            description: ''
        };
    } catch (error) {
        throw error;
    }
}

// 更新类别
async function updateCategory(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('edit-category-id').value;
    const categoryName = document.getElementById('edit-category-name').value;
    const categoryDescription = document.getElementById('edit-category-description').value;
    
    try {
        const token = localStorage.getItem('token');
        
        // 暂时无法直接更新类别名称，可以考虑添加新类别并删除旧类别
        showNotification('类别更新功能暂未实现，请手动删除并重新添加类别', 'info');
        
        // 隐藏编辑模态框
        document.getElementById('edit-category-modal').style.display = 'none';
        
        // 重新加载类别列表
        loadCategories();
    } catch (error) {
        console.error('更新类别出错:', error);
        showNotification(error.message, 'error');
    }
}

// 删除类别
async function deleteCategory(categoryId) {
    if (!confirm('确定要删除此类别吗？此操作不可逆，且可能影响相关商品。')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // 使用正确的API路径
        const response = await fetch(`http://localhost:3000/products/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('删除类别失败，状态码: ' + response.status);
        }
        
        const data = await response.json();
        console.log('删除类别响应:', data); // 调试信息
        
        if (!data.success) {
            throw new Error(data.message || '删除类别失败');
        }
        
        // 重新加载类别列表
        loadCategories();
        
        showNotification('类别删除成功', 'success');
    } catch (error) {
        console.error('删除类别出错:', error);
        showNotification(error.message, 'error');
    }
}

// 显示类别下的商品
async function showCategoryProducts(categoryName) {
    try {
        const token = localStorage.getItem('token');
        
        // 使用正确的API路径
        const response = await fetch(`http://localhost:3000/products/category/${categoryName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取类别商品失败，状态码: ' + response.status);
        }
        
        const data = await response.json();
        console.log('获取类别商品响应:', data); // 调试信息
        
        if (!data.success) {
            throw new Error(data.message || '获取类别商品失败');
        }
        
        // 创建一个临时的商品列表模态框
        createProductsModal(data.category, data.products);
    } catch (error) {
        console.error('获取类别商品出错:', error);
        showNotification(error.message, 'error');
    }
}

// 创建商品列表模态框
function createProductsModal(categoryName, products) {
    // 检查是否已存在模态框，如果存在则移除
    let existingModal = document.getElementById('products-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 创建新的模态框
    const modal = document.createElement('div');
    modal.id = 'products-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let productsHtml = '';
    
    if (!products || products.length === 0) {
        productsHtml = '<p>此类别下暂无商品</p>';
    } else {
        productsHtml = `
            <table>
                <thead>
                    <tr>
                        <th>商品名称</th>
                        <th>价格</th>
                        <th>库存</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        products.forEach(product => {
            productsHtml += `
                <tr>
                    <td>${product.name}</td>
                    <td>¥${product.price}</td>
                    <td>${product.stock}</td>
                </tr>
            `;
        });
        
        productsHtml += '</tbody></table>';
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('products-modal')">&times;</span>
            <h3>${categoryName} - 商品列表 (共${products ? products.length : 0}件)</h3>
            <div class="products-list">
                ${productsHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加ESC键关闭模态框
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal('products-modal');
        }
    });
    
    // 点击模态框外部关闭模态框
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal('products-modal');
        }
    });
}

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知容器（如果不存在）
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 添加到容器
    notificationContainer.appendChild(notification);
    
    // 3秒后移除通知
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}