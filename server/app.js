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
const userActivityRoutes = require('./routes/userActivityRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const adminLogRoutes = require('./routes/adminLogRoutes');
const sequelize = require('./config/database');
const db = require('./models'); // 导入并初始化模型关联
const rootDir = path.resolve(__dirname, '..'); 
const logMiddleware = require('./config/middleware/logMiddleware');

// 中间件
app.use(express.json());  // 解析 JSON 请求体

app.use(cors());  // 允许所有来源的请求

// 配置静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 全局中间件 - 记录管理员操作
app.use(logMiddleware.logAdminAction);

// 全局中间件 - 记录用户活动
app.use(logMiddleware.logUserActivity);

// 日志API路由
app.use('/api/logs', userActivityRoutes);
app.use('/api/admin-logs', adminLogRoutes);

// 用户相关路由
app.use('/users', userRoutes);
// 注册产品相关路由
app.use('/products', productRoutes);

app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/pay', paymentRoutes);
app.use('/user-activity', userActivityRoutes);
app.use('/recommendations', recommendationRoutes);

// 提供 public 目录中的静态文件
app.use(express.static(path.join(rootDir, 'public')));

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
