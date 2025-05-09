document.addEventListener('DOMContentLoaded', () => {
    // 获取当前页面的路径
    const currentPath = window.location.pathname;
    
    // 如果当前在登录页面，初始化登录页面元素
    if (currentPath.includes('login.html')) {
        const errorElement = document.getElementById('error-message');
        const loadingElement = document.getElementById('loading-indicator');
        if (errorElement) errorElement.style.display = 'none';
        if (loadingElement) loadingElement.style.display = 'none';
    }
    // 如果当前在注册页面，初始化注册页面元素
    else if (currentPath.includes('register.html')) {
        const errorElement = document.getElementById('error-message');
        const loadingElement = document.getElementById('loading-indicator');
        if (errorElement) errorElement.style.display = 'none';
        if (loadingElement) loadingElement.style.display = 'none';
    }

    // 检查登录状态
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (user && token) {
        // 已登录状态下，如果在登录页面则跳转到首页
        if (currentPath.includes('login.html')) {
            window.location.href = 'index.html';
        }
    } else if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
        // 未登录状态下，如果访问需要登录的页面，重定向到登录页
        const restrictedPages = ['dashboard.html', 'cart.html', 'checkout.html', 'orderHistory.html'];
        if (restrictedPages.some(page => currentPath.includes(page))) {
            window.location.href = 'login.html';
        }
    }
});

// 登录功能
function loginUser(event) {
    event.preventDefault(); // 防止表单默认提交行为

    // 获取输入的用户名和密码
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // 验证输入是否为空
    if (!email || !password) {
        showError("邮箱和密码不能为空");
        return;
    }

    // 显示正在加载提示
    showLoading(true);

    // 发送请求到后端验证用户
    fetch('http://localhost:3000/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),  // 确保这里传递了 email
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);

        if (data.success && data.token && data.user) {
            // 存储完整的用户信息，包括角色
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                username: data.user.username,
                role: data.user.role // 确保保存用户角色
            }));
            localStorage.setItem('token', data.token);
            window.location.href = 'index.html';
        } else {
            throw new Error(data.message || "登录失败");
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('登录失败:', error);
        showError(error.message || "登录失败，请重试");
    });
}

// 注册功能
function registerUser(event) {
    event.preventDefault(); // 防止表单默认提交行为

    // 获取用户输入的内容
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    // 验证表单输入
    if (!username || !email || !password || !confirmPassword) {
        showError("所有字段都是必填项");
        return;
    }
    if (password !== confirmPassword) {
        showError("两次密码输入不一致");
        return;
    }
    if (password.length < 6) {
        showError("密码必须至少包含6个字符");
        return;
    }

    // 显示正在加载提示
    showLoading(true);

    // 发送请求到后端注册用户
    fetch('http://localhost:3000/api/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);  // 隐藏加载提示

        if (data.success) {
            window.location.href = 'login.html'; // 注册成功后跳转到登录页面
        } else {
            showError(data.message || "注册失败，请重试"); // 显示错误信息
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('注册失败', error);
        showError("注册失败，请重试");
    });
}

// 显示错误信息
function showError(message) {
    const errorMessageElement = document.getElementById('error-message');
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block'; // 显示错误信息
    } else {
        console.error('错误:', message);
    }
}

// 显示加载状态
function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        if (isLoading) {
            loadingIndicator.style.display = 'block'; // 显示加载提示
        } else {
            loadingIndicator.style.display = 'none'; // 隐藏加载提示
        }
    }
}

// 退出登录
function logout() {
    const token = localStorage.getItem('token');
    
    // 如果有token，调用后端注销接口
    if (token) {
        fetch('http://localhost:3000/api/users/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .catch(error => console.error('注销时出错:', error))
        .finally(() => {
            // 无论请求成功与否，都清除本地存储
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    } else {
        // 如果没有token，直接清除本地存储并跳转
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// 页面加载时，初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化时隐藏错误信息和加载提示
    const errorElement = document.getElementById('error-message');
    const loadingElement = document.getElementById('loading-indicator');
    if (errorElement) errorElement.style.display = 'none';
    if (loadingElement) loadingElement.style.display = 'none';
});





