// 获取订单信息并加载
function loadOrderSummary(orderId) {
    const token = localStorage.getItem('token');
    if (!token || !orderId) {
        alert('订单信息无效');
        window.location.href = 'cart.html';
        return;
    }

    fetch(`http://localhost:3000/api/orders/${orderId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('收到的订单数据:', data);

        if (!data.success || !data.order) {
            throw new Error('订单数据无效');
        }

        const { order } = data;
        const orderSummaryBody = document.getElementById('order-summary-body');
        const totalPriceElement = document.getElementById('total-price');
        
        orderSummaryBody.innerHTML = '';

        if (!Array.isArray(order.items)) {
            console.error('订单项数据无效:', order);
            throw new Error('订单数据格式错误');
        }

        order.items.forEach(item => {
            if (!item || !item.product) {
                console.warn('跳过无效订单项:', item);
                return;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.product.name || '未知商品'}</td>
                <td>${item.quantity || 0}</td>
                <td>¥${(Number(item.price) || 0).toFixed(2)}</td>
                <td>¥${(item.total || 0).toFixed(2)}</td>
            `;
            orderSummaryBody.appendChild(row);
        });

        totalPriceElement.textContent = (Number(order.totalAmount) || 0).toFixed(2);
        
        // 转换订单状态为中文
        const statusMap = {
            'pending': '待支付',
            'paid': '已支付',
            'shipped': '已发货',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        document.getElementById('payment-status').textContent = 
            `订单状态: ${statusMap[order.status] || order.status || '未知'}`;
    })
    .catch(error => {
        console.error('加载订单失败:', error);
        alert('加载订单失败，请重试');
    });
}

// 初始化地址选择器
function initAddressSelectors() {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    
    // 使用基于element-china-area-data的数据
    
    // 初始化省份选择器
    areaCodeData.provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.value;
        option.textContent = province.label;
        provinceSelect.appendChild(option);
    });
    
    // 省份变化时更新城市
    provinceSelect.addEventListener('change', function() {
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        const provinceCode = this.value;
        if (!provinceCode) return;
        
        const cities = areaCodeData.cities[provinceCode] || [];
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.value;
            option.textContent = city.label;
            citySelect.appendChild(option);
        });
    });
    
    // 城市变化时更新区县
    citySelect.addEventListener('change', function() {
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        const cityCode = this.value;
        if (!cityCode) return;
        
        const districts = areaCodeData.areas[cityCode] || [];
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.value;
            option.textContent = district.label;
            districtSelect.appendChild(option);
        });
    });
}

// 获取完整地址信息
function getAddressInfo() {
    const province = document.getElementById('province');
    const city = document.getElementById('city');
    const district = document.getElementById('district');
    const detailAddress = document.getElementById('detail-address');
    const contactName = document.getElementById('contact-name');
    const contactPhone = document.getElementById('contact-phone');
    
    // 获取选中的省市区名称
    const provinceName = province.options[province.selectedIndex]?.text || '';
    const cityName = city.options[city.selectedIndex]?.text || '';
    const districtName = district.options[district.selectedIndex]?.text || '';
    
    return {
        province: provinceName,
        city: cityName,
        district: districtName,
        detailAddress: detailAddress.value.trim(),
        contactName: contactName.value.trim(),
        contactPhone: contactPhone.value.trim(),
        fullAddress: `${provinceName} ${cityName} ${districtName} ${detailAddress.value.trim()}`
    };
}

// 验证地址信息
function validateAddressInfo() {
    const province = document.getElementById('province');
    const city = document.getElementById('city');
    const district = document.getElementById('district');
    const detailAddress = document.getElementById('detail-address');
    const contactName = document.getElementById('contact-name');
    const contactPhone = document.getElementById('contact-phone');
    
    if (!province.value) {
        alert('请选择省份');
        province.focus();
        return false;
    }
    
    if (!city.value) {
        alert('请选择城市');
        city.focus();
        return false;
    }
    
    if (!district.value) {
        alert('请选择区县');
        district.focus();
        return false;
    }
    
    if (!detailAddress.value.trim()) {
        alert('请输入详细地址');
        detailAddress.focus();
        return false;
    }
    
    if (!contactName.value.trim()) {
        alert('请输入收货人姓名');
        contactName.focus();
        return false;
    }
    
    if (!contactPhone.value.trim()) {
        alert('请输入联系电话');
        contactPhone.focus();
        return false;
    }
    
    // 简单的手机号验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(contactPhone.value.trim())) {
        alert('请输入有效的手机号码');
        contactPhone.focus();
        return false;
    }
    
    return true;
}

// 处理支付请求
function handlePayment(orderId) {
    if (!orderId) {
        alert('订单ID无效');
        return;
    }
    
    // 验证地址信息
    if (!validateAddressInfo()) {
        return;
    }
    
    // 获取地址信息和备注信息
    const addressInfo = getAddressInfo();
    const noteText = document.getElementById('note').value.trim();
    
    // 显示支付中提示
    document.getElementById('payment-status').textContent = "正在处理支付...";
    document.getElementById('payment-status').style.color = "orange";

    // 模拟向后端发送支付请求
    fetch('http://localhost:3000/api/pay', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
            orderId,
            address: addressInfo.fullAddress,
            contactName: addressInfo.contactName,
            contactPhone: addressInfo.contactPhone,
            note: noteText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('payment-status').textContent = "支付成功，订单已确认！";
            document.getElementById('payment-status').style.color = "green";
            
            // 禁用输入和按钮，防止重复提交
            disableInputs();
            
            // 保存成功的提示
            setTimeout(() => {
                alert('支付成功！即将跳转到订单历史页面');
                window.location.href = 'orderHistory.html';
            }, 2000);
        } else {
            document.getElementById('payment-status').textContent = "支付失败，请重试。";
            document.getElementById('payment-status').style.color = "red";
            alert(data.message || '支付处理失败，请稍后重试');
        }
    })
    .catch(error => {
        console.error('支付请求失败', error);
        document.getElementById('payment-status').textContent = "支付失败，请稍后重试。";
        document.getElementById('payment-status').style.color = "red";
        alert('网络错误，请检查网络连接后重试');
    });
}

// 禁用输入和按钮，防止重复提交
function disableInputs() {
    document.getElementById('province').disabled = true;
    document.getElementById('city').disabled = true;
    document.getElementById('district').disabled = true;
    document.getElementById('detail-address').disabled = true;
    document.getElementById('contact-name').disabled = true;
    document.getElementById('contact-phone').disabled = true;
    document.getElementById('note').disabled = true;
    document.getElementById('pay-button').disabled = true;
}

// 在结账页面点击支付按钮时触发支付处理
document.getElementById('pay-button').addEventListener('click', () => {
    const orderId = getOrderIdFromUrl();  // 从URL获取订单ID
    handlePayment(orderId);
});

// 页面加载时，获取订单ID并加载订单摘要
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId') || localStorage.getItem('currentOrderId');
    
    if (!orderId) {
        alert('未找到订单信息');
        window.location.href = 'cart.html';
        return;
    }
    
    // 加载订单摘要
    loadOrderSummary(orderId);
    
    // 初始化地址选择器
    initAddressSelectors();
});

// 从URL获取订单ID（假设订单ID作为查询参数传递）
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');  // 获取URL中的orderId参数
    return orderId || localStorage.getItem('currentOrderId');
}