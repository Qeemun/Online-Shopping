// 全局变量，存储当前选中的销售员ID
let currentSalesStaffId = null;
// 创建salesUtils实例
const salesUtils = new SalesUtils();

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    checkAuth();
    
    // 加载销售人员列表
    loadSalesStaffList();
    
    // 初始化事件监听器
    initEventListeners();
});

// 检查用户是否已登录且为管理员
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
        alert('您无权访问此页面，仅管理员可访问。');
        window.location.href = 'login.html';
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 关闭窗口的事件
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 添加销售人员表单提交事件
    const addStaffForm = document.getElementById('add-staff-form');
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', addSalesStaff);
    }
    
    // 分配商品表单提交事件
    const assignProductForm = document.getElementById('assign-product-form');
    if (assignProductForm) {
        assignProductForm.addEventListener('submit', assignProductToStaff);
    }
    
    // 显示添加销售人员表单按钮事件
    const showAddStaffButton = document.getElementById('show-add-staff-form');
    if (showAddStaffButton) {
        showAddStaffButton.addEventListener('click', function() {
            document.getElementById('add-staff-modal').style.display = 'block';
        });
    }
    
    // 关闭模态窗口的事件（点击空白区域）
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // 批量分配商品按钮事件
    const batchAssignButton = document.getElementById('batch-assign-button');
    if (batchAssignButton) {
        batchAssignButton.addEventListener('click', function() {
            document.getElementById('batch-assign-modal').style.display = 'block';
        });
    }
    
    // 批量分配商品表单提交事件
    const batchAssignForm = document.getElementById('batch-assign-form');
    if (batchAssignForm) {
        batchAssignForm.addEventListener('submit', batchAssignProducts);
    }
}

// 加载销售人员列表
async function loadSalesStaffList() {
    try {
        const token = localStorage.getItem('token');
        
        // 修正API路径，添加前缀
        const response = await fetch('http://localhost:3000/api/sales-staff', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取销售人员列表失败 (状态码: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取销售人员列表失败');
        }
        
        displaySalesStaffList(data.salesStaff);
        
        // 同时加载所有可分配商品，用于批量分配
        loadAllAvailableProducts();
    } catch (error) {
        console.error('加载销售人员列表出错:', error);
        salesUtils.showNotification('加载销售人员列表失败: ' + error.message, 'error');
    }
}

// 加载所有可分配的商品
async function loadAllAvailableProducts() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:3000/api/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取商品列表失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取商品列表失败');
        }
        
        // 填充批量分配的商品多选框
        populateBatchProductsCheckboxes(data.products);
    } catch (error) {
        console.error('加载商品列表出错:', error);
    }
}

// 填充批量分配的商品选择框
function populateBatchProductsCheckboxes(products) {
    const productsContainer = document.getElementById('batch-products-container');
    if (!productsContainer) return;
    
    productsContainer.innerHTML = '';
    
    if (products.length === 0) {
        productsContainer.innerHTML = '<p>没有可分配的商品</p>';
        return;
    }
    
    // 按类别对商品进行分组
    const productsByCategory = {};
    products.forEach(product => {
        const category = product.category || '未分类';
        if (!productsByCategory[category]) {
            productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
    });
    
    // 创建分组的商品选择框
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'product-category';
        
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category;
        categoryContainer.appendChild(categoryHeader);
        
        const productsWrapper = document.createElement('div');
        productsWrapper.className = 'products-wrapper';
        
        categoryProducts.forEach(product => {
            const productCheckbox = document.createElement('div');
            productCheckbox.className = 'product-checkbox';
            productCheckbox.innerHTML = `
                <input type="checkbox" id="product-${product.id}" name="batch-products" value="${product.id}">
                <label for="product-${product.id}">${product.name} (¥${product.price})</label>
            `;
            productsWrapper.appendChild(productCheckbox);
        });
        
        categoryContainer.appendChild(productsWrapper);
        productsContainer.appendChild(categoryContainer);
    });
    
    // 添加类别全选/取消全选的功能
    const categoryHeaders = document.querySelectorAll('.product-category h4');
    categoryHeaders.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function() {
            const productsWrapper = this.nextElementSibling;
            const checkboxes = productsWrapper.querySelectorAll('input[type=checkbox]');
            
            // 检查是否全部选中
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            
            // 切换状态
            checkboxes.forEach(cb => {
                cb.checked = !allChecked;
            });
        });
    });
}

// 显示销售人员列表
function displaySalesStaffList(staffList) {
    const staffTableBody = document.getElementById('sales-staff-body');
    staffTableBody.innerHTML = '';
    
    if (!staffList || staffList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">暂无销售人员</td>';
        staffTableBody.appendChild(row);
        return;
    }
    
    staffList.forEach(staff => {
        const row = document.createElement('tr');
        
        // 计算已分配商品数量
        const assignedCount = staff.products ? staff.products.length : 0;
        
        row.innerHTML = `
            <td>${staff.username}</td>
            <td>${staff.email}</td>
            <td>${formatDateTime(staff.lastLogin || staff.createdAt)}</td>
            <td>${assignedCount}</td>
            <td class="actions">
                <button class="view-button" onclick="viewSalesStaffProducts(${staff.id})">查看负责商品</button>
                <button class="reset-button" onclick="resetSalesStaffPassword(${staff.id})">重置密码</button>
                <button class="delete-button" onclick="deleteSalesStaff(${staff.id})">删除</button>
            </td>
        `;
        staffTableBody.appendChild(row);
    });
}

// 添加销售人员
async function addSalesStaff(event) {
    event.preventDefault();
    
    const username = document.getElementById('staff-username').value;
    const email = document.getElementById('staff-email').value;
    const password = document.getElementById('staff-password').value;
    
    if (!username || !email || !password) {
        salesUtils.showNotification('请填写所有必填字段', 'error');
        return;
    }
    
    // 验证电子邮件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        salesUtils.showNotification('请输入有效的电子邮件地址', 'error');
        return;
    }
    
    // 验证密码长度
    if (password.length < 6) {
        salesUtils.showNotification('密码长度必须至少为6个字符', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:3000/api/sales-staff', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });
        
        if (!response.ok) {
            throw new Error(`添加销售人员失败 (状态码: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '添加销售人员失败');
        }
        
        // 重置表单并隐藏
        document.getElementById('staff-username').value = '';
        document.getElementById('staff-email').value = '';
        document.getElementById('staff-password').value = '';
        document.getElementById('add-staff-modal').style.display = 'none';
        
        // 重新加载销售人员列表
        loadSalesStaffList();
        
        salesUtils.showNotification('销售人员添加成功', 'success');
    } catch (error) {
        console.error('添加销售人员出错:', error);
        salesUtils.showNotification(error.message, 'error');
    }
}

// 删除销售人员
async function deleteSalesStaff(staffId) {
    if (!confirm('确定要删除此销售人员吗？此操作不可撤销，将同时移除其负责的所有商品。')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:3000/api/sales-staff/${staffId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`删除销售人员失败 (状态码: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '删除销售人员失败');
        }
        
        // 重新加载销售人员列表
        loadSalesStaffList();
        
        // 如果正在查看该销售人员的产品，则隐藏产品容器
        if (currentSalesStaffId === staffId) {
            document.getElementById('staff-products-container').style.display = 'none';
            currentSalesStaffId = null;
        }
        
        salesUtils.showNotification('销售人员删除成功', 'success');
    } catch (error) {
        console.error('删除销售人员出错:', error);
        salesUtils.showNotification(error.message, 'error');
    }
}

// 重置销售人员密码
async function resetSalesStaffPassword(staffId) {
    // 显示密码重置对话框
    document.getElementById('reset-password-modal').style.display = 'block';
    document.getElementById('reset-staff-id').value = staffId;
    
    // 重置表单
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // 绑定提交事件
    document.getElementById('reset-password-form').onsubmit = async function(event) {
        event.preventDefault();
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!newPassword || !confirmPassword) {
            salesUtils.showNotification('请填写所有密码字段', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            salesUtils.showNotification('两次输入的密码不一致', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            salesUtils.showNotification('密码长度必须至少为6个字符', 'error');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`http://localhost:3000/api/sales-staff/${staffId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newPassword
                })
            });
            
            if (!response.ok) {
                throw new Error(`重置密码失败 (状态码: ${response.status})`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '重置密码失败');
            }
            
            // 隐藏密码重置对话框
            document.getElementById('reset-password-modal').style.display = 'none';
            
            salesUtils.showNotification('密码重置成功', 'success');
        } catch (error) {
            console.error('重置密码出错:', error);
            salesUtils.showNotification(error.message, 'error');
        }
    };
}

// 查看销售人员负责的商品
async function viewSalesStaffProducts(staffId) {
    currentSalesStaffId = staffId;
    
    try {
        const token = localStorage.getItem('token');
        
        // 获取销售人员详细信息包括商品
        const staffResponse = await fetch(`http://localhost:3000/api/sales-staff/${staffId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!staffResponse.ok) {
            throw new Error(`获取销售人员信息失败 (状态码: ${staffResponse.status})`);
        }
        
        const staffData = await staffResponse.json();
        
        if (!staffData.success) {
            throw new Error(staffData.message || '获取销售人员信息失败');
        }
        
        // 获取所有商品
        const productsResponse = await fetch('http://localhost:3000/api/products?limit=100', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!productsResponse.ok) {
            throw new Error('获取商品列表失败');
        }
        
        const productsData = await productsResponse.json();
        
        if (!productsData.success) {
            throw new Error(productsData.message || '获取商品列表失败');
        }
        
        // 找出未分配给该销售人员的商品
        const assignedProductIds = new Set(staffData.salesStaff.products.map(p => p.id));
        const availableProducts = productsData.products.filter(p => !assignedProductIds.has(p.id));
        
        // 显示商品分配界面
        displaySalesStaffProducts(staffId, staffData.salesStaff.username, staffData.salesStaff.products, availableProducts);
    } catch (error) {
        console.error('查看销售人员商品出错:', error);
        salesUtils.showNotification(error.message, 'error');
    }
}

// 显示销售人员的商品和可分配商品
function displaySalesStaffProducts(staffId, staffName, assignedProducts, availableProducts) {
    const productsList = document.getElementById('staff-products-list');
    const productSelect = document.getElementById('product-to-assign');
    const staffProductsTitle = document.getElementById('staff-products-title');
    
    // 设置页面标题
    staffProductsTitle.textContent = `${staffName} 负责的商品`;
    
    // 设置当前选中的销售人员ID
    document.getElementById('staff-id-for-assignment').value = staffId;
    
    // 显示销售人员的商品
    productsList.innerHTML = '';
    
    if (!assignedProducts || assignedProducts.length === 0) {
        productsList.innerHTML = '<p class="no-products">该销售人员尚未负责任何商品</p>';
    } else {
        // 按类别对商品进行分组
        const productsByCategory = {};
        assignedProducts.forEach(product => {
            const category = product.category || '未分类';
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
            productsByCategory[category].push(product);
        });
        
        // 创建分组的商品显示
        Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'product-category';
            
            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category;
            categoryContainer.appendChild(categoryHeader);
            
            const productsGrid = document.createElement('div');
            productsGrid.className = 'products-grid';
            
            categoryProducts.forEach(product => {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                
                // 判断商品图片是否存在
                let imageUrl = product.imageUrl || '/images/default-product.jpg';
                
                productItem.innerHTML = `
                    <div class="product-image">
                        <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/default-product.jpg'">
                    </div>
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p>价格: ¥${product.price}</p>
                        <p>库存: ${product.stock}</p>
                        <button class="unassign-button" onclick="unassignProduct(${staffId}, ${product.id})">取消分配</button>
                    </div>
                `;
                
                productsGrid.appendChild(productItem);
            });
            
            categoryContainer.appendChild(productsGrid);
            productsList.appendChild(categoryContainer);
        });
    }
    
    // 填充可分配商品下拉菜单
    productSelect.innerHTML = '<option value="">-- 选择商品 --</option>';
    
    if (!availableProducts || availableProducts.length === 0) {
        productSelect.innerHTML += '<option value="" disabled>没有可分配的商品</option>';
        document.getElementById('assign-product-button').disabled = true;
    } else {
        // 按类别对可分配商品进行分组
        const availableByCategory = {};
        availableProducts.forEach(product => {
            const category = product.category || '未分类';
            if (!availableByCategory[category]) {
                availableByCategory[category] = [];
            }
            availableByCategory[category].push(product);
        });
        
        // 创建分组的下拉选项
        Object.entries(availableByCategory).forEach(([category, products]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (¥${product.price})`;
                optgroup.appendChild(option);
            });
            
            productSelect.appendChild(optgroup);
        });
        
        document.getElementById('assign-product-button').disabled = false;
    }
    
    // 显示商品容器
    document.getElementById('staff-products-container').style.display = 'block';
}

// 分配商品给销售人员
async function assignProductToStaff(event) {
    event.preventDefault();
    
    const staffId = document.getElementById('staff-id-for-assignment').value;
    const productId = document.getElementById('product-to-assign').value;
    
    if (!staffId || !productId) {
        salesUtils.showNotification('请选择要分配的商品', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:3000/api/sales-staff/${staffId}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId
            })
        });
        
        if (!response.ok) {
            throw new Error(`分配商品失败 (状态码: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '分配商品失败');
        }
        
        // 重新加载销售人员的商品
        viewSalesStaffProducts(staffId);
        
        salesUtils.showNotification('商品分配成功', 'success');
    } catch (error) {
        console.error('分配商品出错:', error);
        salesUtils.showNotification(error.message, 'error');
    }
}

// 批量分配商品
async function batchAssignProducts(event) {
    event.preventDefault();
    
    const staffId = document.getElementById('batch-staff-selector').value;
    const selectedProducts = Array.from(document.querySelectorAll('input[name="batch-products"]:checked')).map(cb => cb.value);
    
    if (!staffId) {
        salesUtils.showNotification('请选择销售人员', 'error');
        return;
    }
    
    if (selectedProducts.length === 0) {
        salesUtils.showNotification('请选择至少一个商品', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:3000/api/sales-staff/${staffId}/products/batch`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productIds: selectedProducts
            })
        });
        
        if (!response.ok) {
            throw new Error(`批量分配商品失败 (状态码: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '批量分配商品失败');
        }
        
        // 隐藏批量分配窗口
        document.getElementById('batch-assign-modal').style.display = 'none';
        
        // 重新加载销售人员列表
        loadSalesStaffList();
        
        // 如果当前正在查看该销售人员的商品，则刷新显示
        if (currentSalesStaffId === parseInt(staffId)) {
            viewSalesStaffProducts(staffId);
        }
        
        salesUtils.showNotification(`成功分配 ${data.assignedCount || selectedProducts.length} 个商品`, 'success');
    } catch (error) {
        console.error('批量分配商品出错:', error);
        salesUtils.showNotification(error.message, 'error');
    }
}

// 取消商品分配
async function unassignProduct(staffId, productId) {
    if (!confirm('确定要取消此商品的分配吗？')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:3000/api/sales-staff/${staffId}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`取消商品分配失败 (状态码: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '取消商品分配失败');
        }
        
        // 重新加载销售人员的商品
        viewSalesStaffProducts(staffId);
        
        salesUtils.showNotification('商品分配已取消', 'success');
    } catch (error) {
        console.error('取消商品分配出错:', error);
        salesUtils.showNotification(error.message, 'error');
    }
}

// 格式化日期时间 - 使用salesUtils中的方法
function formatDateTime(dateString) {
    if (!dateString) return '未知';
    return salesUtils.formatDateTime(dateString);
}

