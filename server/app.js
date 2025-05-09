const path = require('path');  // 首先导入path模块
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session'); // 添加session中间件
const uuid = require('uuid'); // 导入uuid模块用于生成唯一的sessionID
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const salesRoutes = require('./routes/salesRoutes');
const salesStaffRoutes = require('./routes/salesStaffRoutes');
const salesReportRoutes = require('./routes/salesReportRoutes');
const sequelize = require('./config/database');
const db = require('./models'); // 导入并初始化模型关联
const rootDir = path.resolve(__dirname, '..'); 

// 导入自定义中间件
const activityLogger = require('./config/middleware/activityLogger');
const trackUserView = require('./config/middleware/trackUserView').trackUserView;

// 中间件
app.use(express.json());  // 解析 JSON 请求体
app.use(cors({
  origin: true,  // 允许所有来源的请求
  credentials: true  // 允许凭证（cookies, sessions）
}));

// 配置会话中间件，使用更可靠的配置
app.use(session({
  genid: function(req) {
    return uuid.v4(); // 使用UUID确保生成唯一的sessionID
  },
  secret: process.env.SESSION_SECRET || 'mySessionSecret123!',
  resave: false,
  saveUninitialized: false, // 避免存储未初始化的会话
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // 仅在生产环境使用secure
    maxAge: 3600000, // 1小时过期
    httpOnly: true
  }
}));

// 应用活动日志记录中间件
app.use(activityLogger);

// 应用用户浏览跟踪中间件
app.use(trackUserView);

// 配置静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 用户相关路由
app.use('/api/users', userRoutes);
// 注册产品相关路由
app.use('/api/products', productRoutes);

app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/pay', paymentRoutes);
app.use('/api/recommendations', recommendationRoutes);

// 注册新的路由
app.use('/api/admin', adminRoutes);
app.use('/api/sales', salesRoutes);
app.use('/sales-staff', salesStaffRoutes);
app.use('/sales-reports', salesReportRoutes);

// 提供 public 目录中的静态文件
app.use(express.static(path.join(rootDir, 'public')));

// 处理前端路由的通配符路由（SPA支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
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
