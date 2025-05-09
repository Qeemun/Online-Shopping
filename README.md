# 在线购物网站项目说明

## 项目简介
该项目是一个前后端分离的购物网站，使用MVC模式进行开发，后端基于node.js和Express框架运行，数据库使用Sequelize ORM进行管理。功能覆盖用户注册、登录和注销，实现了购物车、产品展示和用户购买流程，还有后台管理员权限进行的商品管理、订单管理、用户管理和销售人员管理。在购买流程的最后完成付款后会给用户的注册邮箱发送确认发货邮件，并支持个性化商品推荐功能。
---

## 安装与启动说明

### 前置要求
- Node.js (v14.0.0以上)
- MySQL或PostgreSQL数据库
- npm或yarn包管理工具

### 安装步骤
1. **克隆项目**
   ```bash
   git clone <项目仓库URL>
   cd Online-Shopping
   ```

2. **安装依赖**
   ```bash
   # 安装前端依赖
   npm install
   
   # 安装后端依赖
   cd server
   npm install
   cd ..
   ```

3. **配置数据库**
   - 在`server/config/config.json`中配置数据库连接信息
   ```json
   {
     "development": {
       "username": "your_username",
       "password": "your_password",
       "database": "shopping_db",
       "host": "127.0.0.1",
       "dialect": "mysql"
     },
     "test": { ... },
     "production": { ... }
   }
   ```

4. **运行数据库迁移**
   ```bash
   cd server
   npx sequelize-cli db:migrate
   ```

5. **填充初始数据（可选）**
   ```bash
   node scripts/seedProducts.js
   ```

### 启动应用
1. **启动后端服务**
   ```bash
   cd server
   npm start
   ```
   服务将在http://localhost:3000启动

2. **访问前端页面**
   - 使用浏览器直接打开`public/index.html`或
   - 使用本地服务器如Live Server(VS Code插件)启动前端项目

## 文件结构

### 前端代码
- `public/css/` - 前端样式文件目录
  - `index.css` - 产品展示页面样式
  - `login.css` - 登录页面样式
  - `main.css` - 通用页面样式
  - `order.css` - 订单详情页面样式
  - `orderHistory.css` - 历史订单页面样式
  - `animations.css` - 通用动画效果
  - `cart.css` - 购物车页面样式
  - `checkout.css` - 结账页面样式
  - `common.css` - 全局通用样式
  - `unified-dashboard.css` - 统一后台管理面板样式
  - `productDetails.css` - 产品详情页面样式
  - `productCategoryManagement.css` - 产品类别管理页面样式
  - `productSalesMonitor.css` - 产品销售监控页面样式
  - `reports.css` - 报表页面样式
  - `salesStaffManagement.css` - 销售人员管理页面样式
  - `variables.css` - CSS变量定义
  - `header-fix.css` - 头部导航修复样式
  - `register.css` - 注册页面样式

- `public/js/` - 前端脚本文件目录
  - `auth.js` - 用户登录、注册和注销功能
  - `cart.js` - 购物车操作（添加、更新和删除）
  - `checkout.js` - 结账处理
  - `orderDetails.js` - 订单详情展示
  - `orderHistory.js` - 历史订单查询
  - `index.js` - 首页展示控制
  - `orderManagement.js` - 订单管理控制
  - `productDetails.js` - 产品详情页控制
  - `productCategoryManagement.js` - 产品类别管理
  - `customerManagement.js` - 用户管理控制
  - `dashboard.js` - 管理后台控制
  - `productSalesMonitor.js` - 产品销售监控
  - `recommendations.js` - 产品推荐功能
  - `reports.js` - 销售报表功能
  - `salesStaffManagement.js` - 销售人员管理
  - `salesUtils.js` - 销售辅助工具函数
  - `api.js` - API请求统一处理
  - `area-data.js` - 地区数据处理

- `public/` - 前端网页页面
  - `index.html` - 网站首页
  - `login.html` - 网站登录页面
  - `cart.html` - 购物车页面
  - `checkout.html` - 结账页面
  - `customerManagement.html` - 用户管理页面
  - `orderDetails.html` - 订单详情页面
  - `orderHistory.html` - 订单历史页面
  - `orderManagement.html` - 订单管理页面
  - `productDetails.html` - 产品详情页面
  - `productCategoryManagement.html` - 产品类别管理页面
  - `productSalesMonitor.html` - 产品销售监控页面
  - `register.html` - 注册页面
  - `dashboard.html` - 后台管理仪表盘
  - `reports.html` - 销售报表页面
  - `salesStaffManagement.html` - 销售人员管理页面
  - `favicon.ico` - 网站图标

- `public/images/` - 图片资源目录
  - 包含网站所需的各种产品图片和界面元素图片
  - `products/` - 产品图片子目录

### 后端代码
- `server/models/` - 数据模型定义
  - `user.js` - 用户模型
  - `product.js` - 产品模型
  - `order.js` - 订单模型
  - `orderItem.js` - 订单明细模型
  - `cartItem.js` - 购物车模型
  - `recommendation.js` - 商品推荐模型
  - `userProfile.js` - 用户资料模型
  - `salesProductAssignment.js` - 销售人员产品分配模型
  - `index.js` - 模型关联配置

- `server/controllers/` - 业务逻辑实现
  - `userController.js` - 用户注册、登录和权限验证
  - `productController.js` - 产品管理
  - `cartController.js` - 购物车管理
  - `orderController.js` - 订单管理
  - `paymentController.js` - 支付处理及邮件通知
  - `recommendationController.js` - 个性化商品推荐
  - `salesReportController.js` - 销售报告统计
  - `salesStaffController.js` - 销售人员管理

- `server/routes/` - 路由文件
  - `userRoutes.js` - 用户相关路由
  - `productRoutes.js` - 产品相关路由
  - `cartRoutes.js` - 购物车相关路由
  - `orderRoutes.js` - 订单相关路由
  - `paymentRoutes.js` - 支付路由
  - `recommendationRoutes.js` - 推荐系统路由
  - `salesStaffRoutes.js` - 销售人员路由
  - `salesReportRoutes.js` - 销售报告路由

- `server/config/` - 配置文件
  - `config.json` - 数据库连接配置
  - `database.js` - 数据库初始化
  - `middleware/` - 中间件目录

- `server/migrations/` - 数据库迁移文件
  - 包含创建各种数据表的迁移脚本

- `server/app.js` - 应用程序入口文件
  - 配置中间件，如 CORS 和 JSON 解析
  - 注册路由
  - 提供静态文件服务
  - 初始化数据库连接

- `scripts/` - 工具脚本
  - `seedProducts.js` - 产品数据填充脚本
  - `deleteProducts.js` - 产品数据清理脚本
  - `generateAreaData.js` - 地区数据生成脚本

---

## 功能模块说明

### 用户管理
- **功能**: 实现用户的注册、登录、权限验证，以及获取和更新用户资料
- **实现过程**:
  1. **注册**: 检查邮箱是否已存在，通过 Sequelize 创建用户记录
  2. **登录**: 使用 bcrypt 校验密码，生成 JWT 令牌
  3. **权限验证**: 通过中间件解析 JWT 并验证用户角色
  4. **用户资料**: 提供基于 JWT 的接口返回和更新用户信息

---

### 产品管理
- **功能**: 提供产品的新增、更新、删除及查询功能，支持图片上传和产品分类管理
- **实现过程**:
  1. 使用 Sequelize 定义产品模型，包含名称、价格、库存、分类等字段
  2. **新增/更新**: 使用 multer 中间件处理图片上传，并更新产品记录
  3. **查询**: 支持按分类和关键词搜索产品，返回产品列表，支持查询单个产品的详细信息
  4. **删除**: 删除数据库中的产品记录
  5. **分类管理**: 提供产品分类的增删改查功能

---

### 购物车
- **功能**: 实现用户购物车的管理，包括添加商品、更新数量、删除商品和查看购物车
- **实现过程**:
  1. 每个购物车商品与用户和产品通过外键关联
  2. **添加商品**: 检查库存后新增或更新购物车记录
  3. **更新数量**: 校验库存并修改购物车记录
  4. **删除商品**: 删除指定购物车记录
  5. **查询购物车**: 返回用户当前的购物车内容，包括商品详情和总金额

---

### 订单管理
- **功能**: 实现订单的创建、更新、查询和管理
- **实现过程**:
  1. **创建订单**: 从购物车中生成订单，并清空购物车
  2. **查询历史订单**: 返回用户的订单记录，包括订单明细
  3. **更新订单状态**: 支持更新为支付、发货或完成
  4. **订单详情**: 提供订单详细信息查看
  5. **订单管理**: 管理员可查看和处理所有用户订单

---

### 支付功能
- **功能**: 模拟支付处理，并发送支付成功确认邮件
- **实现过程**:
  1. 通过订单 ID 查找订单记录并更新为"已支付"状态
  2. 使用 `nodemailer` 配置 SMTP 服务器，发送支付确认邮件
  3. 支付完成后记录交易信息

---

### 销售报告
- **功能**: 提供销售额统计和商品销售情况统计
- **实现过程**:
  1. **总销售额统计**: 使用 Sequelize 聚合函数计算已完成订单的总金额
  2. **商品销售统计**: 按时间段汇总每个商品的销售数量和金额
  3. **时间段统计**: 按天、月或年分组统计总销售额
  4. **可视化报表**: 前端使用图表展示销售数据

---

### 商品推荐系统
- **功能**: 根据用户购买历史和浏览记录推荐相关商品
- **实现过程**:
  1. 记录用户的浏览和购买行为
  2. 基于用户行为数据生成个性化推荐
  3. 在产品详情页和首页展示推荐商品

---

### 销售人员管理
- **功能**: 管理销售人员账号和业绩
- **实现过程**:
  1. 创建和管理销售人员账户
  2. 分配产品管理权限
  3. 跟踪和统计销售业绩
  4. 销售人员权限控制


## 实现概述
1. **后端实现**: 通过 Express 提供 RESTful API，并使用 Sequelize ORM 管理数据库模型和关联
2. **前端实现**: 使用 JavaScript 和 CSS 构建动态界面，与后端 API 交互
3. **数据库**: 使用 MySQL 或 PostgreSQL，通过Sequelize定义规范化表结构存储数据
4. **认证授权**: 使用 JWT (JSON Web Token) 实现用户认证和授权
5. **文件上传**: 使用 multer 处理产品图片上传
6. **电子邮件**: 使用 nodemailer 发送订单确认和通知邮件

---

## 技术栈

### 前端技术
- **核心语言与框架**：
  - HTML5：网页结构
  - CSS3：网页样式，包括Flexbox和Grid布局
  - JavaScript (ES6+)：前端逻辑实现
  - Fetch API：处理AJAX请求

- **UI组件与库**：
  - Bootstrap 5：响应式布局和UI组件
  - Chart.js：销售报表数据可视化
  - SweetAlert2：美化的弹窗提示
  - FontAwesome：图标库

- **数据处理**：
  - LocalStorage：本地数据存储（购物车、用户偏好）
  - JSON：数据交换格式

### 后端技术
- **核心框架与运行时**：
  - Node.js：JavaScript运行时环境
  - Express.js：Web应用框架

- **数据库**：
  - MySQL/PostgreSQL：关系型数据库
  - Sequelize ORM：对象关系映射，简化数据库操作

- **安全与认证**：
  - JSON Web Token (JWT)：用户认证
  - bcrypt：密码加密
  - Helmet：HTTP头安全
  - CORS：跨域资源共享配置

- **文件处理**：
  - Multer：处理文件上传
  - Sharp：图片处理和优化

- **邮件服务**：
  - Nodemailer：发送订单确认和通知邮件

- **日志处理**：
  - Winston：后端日志记录
  - Morgan：HTTP请求日志

### 开发与部署工具
- **版本控制**：
  - Git：代码版本管理

- **开发工具**：
  - VS Code：代码编辑器
  - npm：包管理工具