require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const customerRoutes = require('./routes/customerRoutes');
const sequelize = require('./config/database');
const db = require('./models'); // 导入并初始化模型关联

// 中间件
app.use(express.json());  // 解析 JSON 请求体

app.use(cors());  // 允许所有来源的请求

// 配置静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 用户相关路由
app.use('/users', userRoutes);
// 注册产品相关路由
app.use('/products', productRoutes);

app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/pay', paymentRoutes);
app.use('/customers', customerRoutes);

// 提供 public 目录中的静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 路由配置
// 首页，提供 public 目录中的静态 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));  // 提供首页
});

// 其他静态页面
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/customerManagement', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customerManagement.html'));
});

app.get('/orderDetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'orderDetails.html'));
});
app.get('/orderHistory', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'orderHistory.html'));
});
app.get('/orderManagement', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'orderManagement.html'));
});
app.get('/productDetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'productDetails.html'));
});
app.get('/productList', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'productList.html'));
});
app.get('/productManagement', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'productManagement.html'));
});
app.get('/salesDashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'salesDashboard.html'));
});
app.get('/salesReport', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'salesReport.html'));
});

// 同步数据库
db.sequelize.sync().then(() => {
    console.log('数据库同步成功');
}).catch(err => {
    console.error('数据库同步失败:', err);
});

// 连接到数据库并启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器已启动，访问地址: http://localhost:${PORT}`);
});
