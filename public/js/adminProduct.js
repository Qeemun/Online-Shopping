// 加载并显示所有产品
function loadProducts() {
    fetch('http://localhost:3000/products/')
        .then(response => response.json())
        .then(products => {
            console.log(products);

            const productTableBody = document.getElementById('product-table-body');
            productTableBody.innerHTML = '';
            if (Array.isArray(products)) {
                products.forEach(product => {
                    const productRow = `
                        <tr>
                            <td>${product.name}</td>
                            <td>${product.price}</td>
                            <td>${product.stock}</td>
                            <td>
                                <button onclick="editProduct(${product.id})">编辑</button>
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

// 编辑产品
function editProduct(productId) {
    // 跳转到编辑页面或显示编辑表单
    window.location.href = `editProduct.html?id=${productId}`;
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

// 页面加载时，调用加载产品
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
