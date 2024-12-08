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

// 添加新产品
function addProduct(event) {
    event.preventDefault();

    const name = document.getElementById('product-name').value;
    const price = document.getElementById('product-price').value;
    const stock = document.getElementById('product-stock').value;
    const imageUrl = document.getElementById('product-image').value;

    const productData = { name, price, stock, imageUrl };

    fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('新产品已添加');
                loadProducts();
            } else {
                alert('添加失败');
            }
        })
        .catch(error => console.error('添加产品失败', error));
}

// 页面加载时，调用加载产品
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
