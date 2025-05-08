// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    checkAuth();
    
    // 加载所有类别
    loadCategories();
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
    if (user.role !== 'sales' && user.role !== 'seller' && user.role !== 'salesStaff') {
        alert('您无权访问此页面');
        window.location.href = 'index.html';
        return;
    }
}

// 加载所有类别
async function loadCategories() {
    try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        const response = await fetch(`/sales-staff/${userId}/categories`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取类别失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取类别失败');
        }
        
        // 显示类别数据
        displayCategories(data.categories);
        
        // 更新添加类别表单的父类别选项
        updateParentCategoryOptions(data.categories);
    } catch (error) {
        console.error('加载类别出错:', error);
        showNotification(error.message, 'error');
        document.getElementById('categories-container').innerHTML = '<p>无法加载类别数据</p>';
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
            <button onclick="showCategoryProducts(${category.id})">查看商品</button>
            <button onclick="showEditCategoryForm(${category.id})">编辑</button>
            <button class="btn-danger" onclick="deleteCategory(${category.id})">删除</button>
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
        const userId = localStorage.getItem('userId');
        
        const categoryName = document.getElementById('category-name').value;
        const categoryDescription = document.getElementById('category-description').value;
        const parentCategoryId = document.getElementById('parent-category').value;
        
        const response = await fetch(`/sales-staff/${userId}/categories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: categoryName,
                description: categoryDescription,
                parentId: parentCategoryId || null
            })
        });
        
        if (!response.ok) {
            throw new Error('添加类别失败');
        }
        
        const data = await response.json();
        
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
        
        const response = await fetch(`/categories/${categoryId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取类别详情失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取类别详情失败');
        }
        
        return data.category;
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
        
        const response = await fetch(`/categories/${categoryId}`, {
            method: 'PUT',
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
            throw new Error('更新类别失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '更新类别失败');
        }
        
        // 隐藏编辑模态框
        document.getElementById('edit-category-modal').style.display = 'none';
        
        // 重新加载类别列表
        loadCategories();
        
        showNotification('类别更新成功', 'success');
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
        
        const response = await fetch(`/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('删除类别失败');
        }
        
        const data = await response.json();
        
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
async function showCategoryProducts(categoryId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/categories/${categoryId}/products`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取类别商品失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取类别商品失败');
        }
        
        // 创建一个临时的商品列表模态框
        createProductsModal(data.categoryName, data.products);
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
                        <th>操作</th>
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
                    <td>
                        <button onclick="showEditProductForm(${product.id})">编辑</button>
                    </td>
                </tr>
            `;
        });
        
        productsHtml += '</tbody></table>';
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="document.getElementById('products-modal').style.display='none'">&times;</span>
            <h3>${categoryName} - 商品列表</h3>
            <div class="products-list">
                ${productsHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 显示编辑商品表单
function showEditProductForm(productId) {
    fetchProductDetails(productId)
        .then(product => {
            // 填充编辑表单
            document.getElementById('edit-product-id').value = product.id;
            document.getElementById('edit-product-name').value = product.name;
            document.getElementById('edit-product-price').value = product.price;
            document.getElementById('edit-product-stock').value = product.stock;
            
            // 显示编辑模态框
            document.getElementById('edit-product-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('获取商品详情出错:', error);
            showNotification(error.message, 'error');
        });
}

// 获取商品详情
async function fetchProductDetails(productId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/products/${productId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取商品详情失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品详情失败');
        }
        
        return data.product;
    } catch (error) {
        throw error;
    }
}

// 更新商品信息
async function updateProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    const productPrice = document.getElementById('edit-product-price').value;
    const productStock = document.getElementById('edit-product-stock').value;
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/products/${productId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price: productPrice,
                stock: productStock
            })
        });
        
        if (!response.ok) {
            throw new Error('更新商品失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '更新商品失败');
        }
        
        // 隐藏编辑模态框
        document.getElementById('edit-product-modal').style.display = 'none';
        
        // 如果产品列表模态框存在，重新加载它
        if (document.getElementById('products-modal')) {
            const categoryId = data.product.categoryId;
            if (categoryId) {
                showCategoryProducts(categoryId);
            }
        }
        
        showNotification('商品信息更新成功', 'success');
    } catch (error) {
        console.error('更新商品出错:', error);
        showNotification(error.message, 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知容器（如果不存在）
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3';
    notification.style.color = 'white';
    notification.style.padding = '15px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.transition = 'opacity 0.5s';
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

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}