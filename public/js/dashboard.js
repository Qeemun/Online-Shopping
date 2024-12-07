// 页面加载时显示销售面板内容
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.role === 'sales') {
        document.getElementById('sales-dashboard').style.display = 'block';
    } else {
        window.location.href = 'index.html';  // 非销售用户跳转到首页
    }
});
