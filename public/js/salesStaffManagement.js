document.addEventListener('DOMContentLoaded', () => {
    loadSalesStaff();
});

// 加载销售人员列表
function loadSalesStaff() {
    fetch('http://localhost:3000/admin/sales-staff', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && Array.isArray(data.salesStaff)) {
            const staffTableBody = document.getElementById('sales-staff-body');
            staffTableBody.innerHTML = '';
            
            data.salesStaff.forEach(staff => {
                const row = `
                    <tr>
                        <td>${staff.username}</td>
                        <td>${staff.email}</td>
                        <td>${staff.lastLogin ? new Date(staff.lastLogin).toLocaleString() : '从未登录'}</td>
                        <td>
                            <button onclick="viewStaffProducts(${staff.id})">查看负责商品</button>
                            <button onclick="resetPassword(${staff.id})">重置密码</button>
                            <button onclick="deleteStaff(${staff.id})">删除</button>
                        </td>
                    </tr>
                `;
                staffTableBody.innerHTML += row;
            });
        } else {
            console.error('获取的销售人员数据无效');
            document.getElementById('sales-staff-body').innerHTML = 
                '<tr><td colspan="4">加载销售人员数据失败</td></tr>';
        }
    })
    .catch(error => {
        console.error('加载销售人员失败:', error);
        document.getElementById('sales-staff-body').innerHTML = 
            '<tr><td colspan="4">加载失败，请重试</td></tr>';
    });
}

// 添加销售人员
function addSalesStaff(event) {
    event.preventDefault();
    
    const newStaff = {
        username: document.getElementById('staff-username').value,
        email: document.getElementById('staff-email').value,
        password: document.getElementById('staff-password').value
    };
    
    fetch('http://localhost:3000/admin/sales-staff', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStaff)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('销售人员添加成功');
            document.getElementById('add-staff-form').reset();
            loadSalesStaff();
        } else {
            alert('添加失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('添加销售人员失败:', error);
        alert('添加失败，请重试');
    });
}

// 删除销售人员
function deleteStaff(staffId) {
    if (confirm('确定要删除此销售人员吗？')) {
        fetch(`http://localhost:3000/admin/sales-staff/${staffId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('销售人员已删除');
                loadSalesStaff();
            } else {
                alert('删除失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('删除销售人员失败:', error);
            alert('删除失败，请重试');
        });
    }
}

// 重置销售人员密码
function resetPassword(staffId) {
    if (confirm('确定要重置此销售人员的密码吗？')) {
        fetch(`http://localhost:3000/admin/sales-staff/${staffId}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`密码已重置为: ${data.temporaryPassword}`);
            } else {
                alert('重置密码失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('重置密码失败:', error);
            alert('重置失败，请重试');
        });
    }
}

// 查看销售人员负责的商品
function viewStaffProducts(staffId) {
    fetch(`http://localhost:3000/admin/sales-staff/${staffId}/products`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 显示该销售人员负责的商品
            const productsList = document.getElementById('staff-products-list');
            productsList.innerHTML = '';
            
            if (data.products.length === 0) {
                productsList.innerHTML = '<p>该销售人员暂未负责任何商品</p>';
            } else {
                data.products.forEach(product => {
                    const item = `
                        <div class="product-item">
                            <h4>${product.name}</h4>
                            <p>类别: ${product.category}</p>
                            <p>价格: ${product.price}</p>
                            <p>库存: ${product.stock}</p>
                            <p>销量: ${product.sold}</p>
                        </div>
                    `;
                    productsList.innerHTML += item;
                });
            }
            
            // 显示分配商品表单
            document.getElementById('staff-id-for-assignment').value = staffId;
            document.getElementById('staff-products-container').style.display = 'block';
        } else {
            alert('获取商品信息失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('获取商品信息失败:', error);
        alert('获取失败，请重试');
    });
}

// 分配商品给销售人员
function assignProductToStaff(event) {
    event.preventDefault();
    
    const staffId = document.getElementById('staff-id-for-assignment').value;
    const productId = document.getElementById('product-to-assign').value;
    
    fetch(`http://localhost:3000/admin/sales-staff/${staffId}/assign-product`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('商品分配成功');
            viewStaffProducts(staffId); // 刷新商品列表
        } else {
            alert('分配失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('分配商品失败:', error);
        alert('分配失败，请重试');
    });
}

