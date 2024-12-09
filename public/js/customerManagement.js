document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
});

// 加载并显示所有客户
function loadCustomers() {
    fetch('http://localhost:3000/customers/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && Array.isArray(data.customers)) {
            const customerTableBody = document.getElementById('customer-table-body');
            customerTableBody.innerHTML = '';
            data.customers.forEach(customer => {
                const customerRow = `
                    <tr>
                        <td>${customer.username}</td>
                        <td>${customer.email}</td>
                        <td>
                            <button onclick="showEditCustomerForm(${customer.id})">编辑</button>
                            <button onclick="deleteCustomer(${customer.id})">删除</button>
                            <button onclick="viewCustomerLogs(${customer.id})">查看日志</button>
                        </td>
                    </tr>`;
                customerTableBody.innerHTML += customerRow;
            });
        } else {
            console.error('获取的客户数据不是数组');
        }
    })
    .catch(error => {
        console.error('加载客户失败:', error);
        alert('加载客户失败，请稍后重试');
    });
}

// 删除客户
function deleteCustomer(customerId) {
    fetch(`http://localhost:3000/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('客户已删除');
            loadCustomers();  // 重新加载客户列表
        } else {
            alert('删除失败');
        }
    })
    .catch(error => console.error('删除客户失败', error));
}

// 显示编辑客户表单
function showEditCustomerForm(customerId) {
    fetch(`http://localhost:3000/customers/${customerId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const customer = data.customer;
            document.getElementById('edit-customer-id').value = customer.id;
            document.getElementById('edit-customer-username').value = customer.username;
            document.getElementById('edit-customer-email').value = customer.email;
            document.getElementById('edit-customer-form').style.display = 'block';
        } else {
            alert('获取客户信息失败');
        }
    })
    .catch(error => console.error('获取客户信息失败', error));
}

// 更新客户信息
async function updateCustomer(event) {
    event.preventDefault();

    const customerId = document.getElementById('edit-customer-id').value;
    const updates = {
        username: document.getElementById('edit-customer-username').value,
        email: document.getElementById('edit-customer-email').value
    };

    try {
        const response = await fetch(`http://localhost:3000/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        const data = await response.json();
        if (data.success) {
            alert('客户更新成功');
            document.getElementById('edit-form').reset(); // 确保调用的是表单的 reset 方法
            document.getElementById('edit-customer-form').style.display = 'none';
            loadCustomers();
        } else {
            alert('更新失败: ' + data.message);
        }
    } catch (error) {
        console.error('更新客户失败:', error);
        alert('更新失败，请重试');
    }
}

// 显示添加客户表单
function showAddCustomerForm() {
    document.getElementById('add-customer-form').style.display = 'block';
}

// 添加客户
async function addCustomer(event) {
    event.preventDefault();

    const newCustomer = {
        username: document.getElementById('add-customer-username').value,
        email: document.getElementById('add-customer-email').value,
        password: document.getElementById('add-customer-password').value
    };

    try {
        const response = await fetch('http://localhost:3000/customers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newCustomer)
        });

        const data = await response.json();
        if (data.success) {
            alert('客户添加成功');
            document.getElementById('add-form').reset();
            document.getElementById('add-customer-form').style.display = 'none';
            loadCustomers();
        } else {
            alert('添加失败: ' + data.message);
        }
    } catch (error) {
        console.error('添加客户失败:', error);
        alert('添加失败，请重试');
    }
}

// 查看客户日志
function viewCustomerLogs(customerId) {
    fetch(`http://localhost:3000/customers/${customerId}/logs`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && Array.isArray(data.logs)) {
            const customerLogList = document.getElementById('customer-log-list');
            customerLogList.innerHTML = '';
            data.logs.forEach(log => {
                const logItem = `
                    <li>
                        <strong>操作:</strong> ${log.action} <br>
                        <strong>商品:</strong> ${log.product ? log.product.name : '无'} <br>
                        <strong>时间:</strong> ${new Date(log.createdAt).toLocaleString()}
                    </li>`;
                customerLogList.innerHTML += logItem;
            });
        } else {
            console.error('获取的日志数据不是数组');
        }
    })
    .catch(error => console.error('加载客户日志失败', error));
}