// 加载并显示所有产品
function loadProducts() {
    fetch('http://localhost:3000/products/')
        .then(response => response.json())
        .then(data => {
            if (data.success && Array.isArray(data.products)) {
                const productTableBody = document.getElementById('product-table-body');
                productTableBody.innerHTML = '';
                data.products.forEach(product => {
                    const productRow = `
                        <tr>
                            <td>${product.name}</td>
                            <td>${product.price}</td>
                            <td>${product.stock}</td>
                            <td>
                                <button onclick="showEditProductForm(${product.id})">编辑</button>
                                <button onclick="deleteProduct(${product.id})">删除</button>
                            </td>
                        </tr>`;
                    productTableBody.innerHTML += productRow;
                });
            } else {
                console.error('获取的产品数据不是数组');
            }
        })
        .catch(error => console.error('加载产品失败', error));
}

// 删除产品
function deleteProduct(productId) {
    fetch(`http://localhost:3000/products/${productId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('产品已删除');
                loadProducts();  // 重新加载产品列表
            } else {
                alert('删除失败');
            }
        })
        .catch(error => console.error('删除产品失败', error));
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
                document.getElementById('edit-product-price').value = product.price;
                document.getElementById('edit-product-stock').value = product.stock;
                document.getElementById('edit-image-preview').src = `http://localhost:3000${product.imageUrl}`;
                document.getElementById('edit-image-preview').style.display = 'block';
                document.getElementById('edit-product-form').style.display = 'block';
            } else {
                alert('获取产品信息失败');
            }
        })
        .catch(error => console.error('获取产品信息失败', error));
}

// 更新产品信息
async function updateProduct(event) {
    event.preventDefault();

    const productId = document.getElementById('edit-product-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('edit-product-name').value);
    formData.append('price', document.getElementById('edit-product-price').value);
    formData.append('stock', document.getElementById('edit-product-stock').value);
    
    const imageFile = document.getElementById('edit-product-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`http://localhost:3000/products/${productId}`, {
            method: 'PUT',
            body: formData //浏览器会自动设置
        });

        const data = await response.json();
        if (data.success) {
            alert('商品更新成功');
            document.getElementById('edit-form').reset(); // 确保调用的是表单的 reset 方法
            document.getElementById('edit-product-form').style.display = 'none';
            loadProducts();
        } else {
            alert('更新失败: ' + data.message);
        }
    } catch (error) {
        console.error('更新商品失败:', error);
        alert('更新失败，请重试');
    }
}

// 图片预览功能
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

// 修改添加商品函数
async function addProduct(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('product-name').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('stock', document.getElementById('product-stock').value);
    
    const imageFile = document.getElementById('product-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('http://localhost:3000/products', {
            method: 'POST',
            body: formData // 不需要设置 Content-Type，浏览器会自动设置
        });

        const data = await response.json();
        if (data.success) {
            alert('商品添加成功');
            document.getElementById('product-form').reset();
            document.getElementById('image-preview').style.display = 'none';
            loadProducts();
        } else {
            alert('添加失败: ' + data.message);
        }
    } catch (error) {
        console.error('添加商品失败:', error);
        alert('添加失败，请重试');
    }
}

// 显示添加产品表单
function showAddProductForm() {
    document.getElementById('add-product-form').style.display = 'block';
}

// 页面加载时，调用加载产品
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
