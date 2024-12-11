document.addEventListener('DOMContentLoaded', () => {
    // 获取当前页面的路径
    const currentPath = window.location.pathname;
    
    //如果当前在登录页面，不要自动跳转
    if (currentPath.includes('login.html')) {
        // 只初始化表单状态
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('loading-indicator').style.display = 'none';
        return;
    }

    // 其他页面才检查登录状态并跳转
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (user && token) {
        // 已登录状态下，如果在登录页面则跳转到首页
        if (currentPath.includes('login.html')) {
            window.location.href = 'index.html';
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
    fetch('http://localhost:3000/users/login', {
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
    fetch('http://localhost:3000/users/register', {
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
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block'; // 显示错误信息
}

// 显示加载状态
function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (isLoading) {
        loadingIndicator.style.display = 'block'; // 显示加载提示
    } else {
        loadingIndicator.style.display = 'none'; // 隐藏加载提示
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('user'); // 清除本地存储中的用户信息
    localStorage.removeItem('token');
    window.location.href = 'login.html'; // 跳转到登录页面
}

// 页面加载时，初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化时隐藏错误信息和加载提示
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('loading-indicator').style.display = 'none';
});





