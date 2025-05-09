// 全局变量，存储当前选中的销售员ID
let currentSalesStaffId = null;

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
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'admin') {
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
}

// 加载销售人员列表
async function loadSalesStaffList() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/sales-staff', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取销售人员列表失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取销售人员列表失败');
        }
        
        displaySalesStaffList(data.salesStaff);
    } catch (error) {
        console.error('加载销售人员列表出错:', error);
        showNotification('加载销售人员列表失败', 'error');
    }
}

// 显示销售人员列表
function displaySalesStaffList(staffList) {
    const staffTableBody = document.getElementById('sales-staff-body');
    staffTableBody.innerHTML = '';
    
    if (staffList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4">暂无销售人员</td>';
        staffTableBody.appendChild(row);
        return;
    }
    
    staffList.forEach(staff => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${staff.username}</td>
            <td>${staff.email}</td>
            <td>${formatDateTime(staff.lastLogin || staff.createdAt)}</td>
            <td>
                <button onclick="viewSalesStaffProducts(${staff.id})">查看负责商品</button>
                <button onclick="resetSalesStaffPassword(${staff.id})">重置密码</button>
                <button onclick="deleteSalesStaff(${staff.id})">删除</button>
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
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/sales-staff', {
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
            throw new Error('添加销售人员失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '添加销售人员失败');
        }
        
        // 重置表单并隐藏
        document.getElementById('staff-username').value = '';
        document.getElementById('staff-email').value = '';
        document.getElementById('staff-password').value = '';
        document.getElementById('add-staff-form').style.display = 'none';
        
        // 重新加载销售人员列表
        loadSalesStaffList();
        
        showNotification('销售人员添加成功', 'success');
    } catch (error) {
        console.error('添加销售人员出错:', error);
        showNotification(error.message, 'error');
    }
}

// 删除销售人员
async function deleteSalesStaff(staffId) {
    if (!confirm('确定要删除此销售人员吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/sales-staff/${staffId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('删除销售人员失败');
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
        
        showNotification('销售人员删除成功', 'success');
    } catch (error) {
        console.error('删除销售人员出错:', error);
        showNotification(error.message, 'error');
    }
}

// 重置销售人员密码
async function resetSalesStaffPassword(staffId) {
    const newPassword = prompt('请输入新密码');
    
    if (!newPassword) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/sales-staff/${staffId}/reset-password`, {
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
            throw new Error('重置密码失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '重置密码失败');
        }
        
        showNotification('密码重置成功', 'success');
    } catch (error) {
        console.error('重置密码出错:', error);
        showNotification(error.message, 'error');
    }
}

// 查看销售人员负责的商品
async function viewSalesStaffProducts(staffId) {
    currentSalesStaffId = staffId;
    
    try {
        const token = localStorage.getItem('token');
        
        // 获取销售人员的商品
        const productsResponse = await fetch(`/sales-staff/${staffId}/products`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!productsResponse.ok) {
            throw new Error('获取销售人员商品失败');
        }
        
        const productsData = await productsResponse.json();
        
        if (!productsData.success) {
            throw new Error(productsData.message || '获取销售人员商品失败');
        }
        
        // 获取可分配的商品
        const availableProductsResponse = await fetch('/sales-staff/available-products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!availableProductsResponse.ok) {
            throw new Error('获取可分配商品失败');
        }
        
        const availableProductsData = await availableProductsResponse.json();
        
        if (!availableProductsData.success) {
            throw new Error(availableProductsData.message || '获取可分配商品失败');
        }
        
        // 显示商品分配界面
        displaySalesStaffProducts(staffId, productsData.products, availableProductsData.products);
    } catch (error) {
        console.error('查看销售人员商品出错:', error);
        showNotification(error.message, 'error');
    }
}

// 显示销售人员的商品和可分配商品
function displaySalesStaffProducts(staffId, assignedProducts, availableProducts) {
    const productsList = document.getElementById('staff-products-list');
    const productSelect = document.getElementById('product-to-assign');
    
    // 设置当前选中的销售人员ID
    document.getElementById('staff-id-for-assignment').value = staffId;
    
    // 显示销售人员的商品
    productsList.innerHTML = '';
    
    if (assignedProducts.length === 0) {
        productsList.innerHTML = '<p>该销售人员尚未负责任何商品</p>';
    } else {
        assignedProducts.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <h4>${product.name}</h4>
                <p>类别: ${product.category || '未分类'}</p>
                <p>价格: ¥${product.price}</p>
                <p>库存: ${product.stock}</p>
                <button onclick="unassignProduct(${staffId}, ${product.id})">取消分配</button>
            `;
            productsList.appendChild(productItem);
        });
    }
    
    // 填充可分配商品下拉菜单
    productSelect.innerHTML = '';
    
    if (availableProducts.length === 0) {
        productSelect.innerHTML = '<option value="">没有可分配的商品</option>';
        document.querySelector('button[type="submit"]').disabled = true;
    } else {
        availableProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.category || '未分类'})`;
            productSelect.appendChild(option);
        });
        document.querySelector('button[type="submit"]').disabled = false;
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
        showNotification('请选择销售人员和商品', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/sales-staff/${staffId}/products`, {
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
            throw new Error('分配商品失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '分配商品失败');
        }
        
        // 重新加载销售人员的商品
        viewSalesStaffProducts(staffId);
        
        showNotification('商品分配成功', 'success');
    } catch (error) {
        console.error('分配商品出错:', error);
        showNotification(error.message, 'error');
    }
}

// 取消商品分配
async function unassignProduct(staffId, productId) {
    if (!confirm('确定要取消此商品的分配吗？')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/sales-staff/${staffId}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('取消商品分配失败');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '取消商品分配失败');
        }
        
        // 重新加载销售人员的商品
        viewSalesStaffProducts(staffId);
        
        showNotification('商品分配已取消', 'success');
    } catch (error) {
        console.error('取消商品分配出错:', error);
        showNotification(error.message, 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 如果页面上没有通知容器，则创建一个
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

// 格式化日期时间
function formatDateTime(dateString) {
    if (!dateString) return '未知';
    
    const date = new Date(dateString);
    
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

