# 在线购物网站项目说明

## 项目简介
该项目是一个前后端分离的购物网站，使用MVC模式进行开发，后端基于node.js运行。功能覆盖用户注册、登录和注销。实现了购物车、产品展示和用户购买流程，还有后台管理员权限进行的商品管理、订单管理和用户管理。在购买流程的最后完成付款后会给用户的注册邮箱发送确认发货邮件。
---

## 文件结构

### 前端代码
- `public/css/` - 前端样式文件目录
  - `index.css` - 产品展示页面样式。
  - `login.css` - 登录页面样式。
  - `main.css` - 通用页面样式。
  - `order.css` - 订单详情页面样式。
  - `orderHistory.css` - 历史订单页面样式。
  - `animations.css` - 通用动画效果。
  - `cart.css` - 购物车页面样式。
  - `checkout.css` - 结账页面样式。
  - `common.css` - 全局通用样式。
  - `dashboard.css` - 后台管理面板样式。

- `public/js/` - 前端脚本文件目录
  - `auth.js` - 用户登录、注册和注销功能。
  - `cart.js` - 购物车操作（添加、更新和删除）。
  - `checkout.js` - 结账处理。
  - `orderDetails.js` - 订单详情展示。
  - `orderHistory.js` - 历史订单查询。
  - `index.js` - 首页展示控制。
  - `orderManagement.js` - 订单管理控制。
  - `product.js` - 产品展示和搜索。
  - `productManagement.js` - 产品管理控制。
  - `customerManagement.js` - 用户管理控制

- `public/` - 前端网页页面
  - `index.html` - 网站首页。
  - `login.html` - 网站登录页面。
  - `cart.html` - 购物车页面。
  - `checkout.html` - 结账页面。
  - `customerManagement.html` - 用户管理页面。
  - `orderDetails.html` - 订单详情页面。
  - `orderHistory.html` - 订单历史页面。
  - `orderManagement.html` - 订单管理页面。
  - `productDetails.html` - 产品详情页面。
  - `productList.html` - 产品列表页面。
  - `productManagement.html` - 产品管理页面。
  - `register.html` - 注册页面。
  - `salesDashboard.html` - 后台管理页面。
  - `salesReport.html` - 销售报表页面。
  - `favicon.ico` - 网站图标

### 后端代码
- `models/` - 数据模型定义
  - `User.js` - 用户模型。
  - `Product.js` - 产品模型。
  - `Order.js` - 订单模型。
  - `OrderItem.js` - 订单明细模型。
  - `CartItem.js` - 购物车模型。
  - `CustomerLog.js` - 客户活动日志。

- `controllers/` - 业务逻辑实现
  - `userController.js` - 用户注册、登录和权限验证。
  - `productController.js` - 产品管理。
  - `cartController.js` - 购物车管理。
  - `orderController.js` - 订单管理。
  - `paymentController.js` - 支付处理及邮件通知。
  - `customerLogController.js` - 客户日志管理。
  - `salesReportController.js` - 销售报告统计。

- `routes/` - 路由文件
  - `userRoutes.js` - 用户相关路由。
  - `productRoutes.js` - 产品相关路由。
  - `cartRoutes.js` - 购物车相关路由。
  - `orderRoutes.js` - 订单相关路由。
  - `paymentRoutes.js` - 支付路由。
  - `customerRoutes.js` - 客户相关路由。
  - `salesReportRoutes.js` - 销售报告路由。

- `app.js` - 应用程序入口文件
  - 配置中间件，如 CORS 和 JSON 解析。
  - 注册路由。
  - 提供静态文件服务。
  - 初始化数据库连接。

---

## 功能模块说明

### 用户管理
- **功能**: 实现用户的注册、登录、权限验证，以及获取用户资料。
- **实现过程**:
  1. **注册**: 检查邮箱是否已存在，通过 Sequelize 创建用户记录。
  2. **登录**: 使用 bcrypt 校验密码，生成 JWT 令牌。
  3. **权限验证**: 通过中间件解析 JWT 并验证用户角色。
  4. **用户资料**: 提供基于 JWT 的接口返回用户信息。

---

### 产品管理
- **功能**: 提供产品的新增、更新、删除及查询功能，支持图片上传。
- **实现过程**:
  1. 使用 Sequelize 定义产品模型，包含名称、价格、库存等字段。
  2. **新增/更新**: 使用 multer 中间件处理图片上传，并更新产品记录。
  3. **查询**: 返回产品列表，支持查询单个产品的详细信息。
  4. **删除**: 删除数据库中的产品记录。

---

### 购物车
- **功能**: 实现用户购物车的管理，包括添加商品、更新数量、删除商品和查看购物车。
- **实现过程**:
  1. 每个购物车商品与用户和产品通过外键关联。
  2. **添加商品**: 检查库存后新增或更新购物车记录。
  3. **更新数量**: 校验库存并修改购物车记录。
  4. **删除商品**: 删除指定购物车记录。
  5. **查询购物车**: 返回用户当前的购物车内容。

---

### 订单管理
- **功能**: 实现订单的创建、更新、查询和删除。
- **实现过程**:
  1. **创建订单**: 从购物车中生成订单，并清空购物车。
  2. **查询历史订单**: 返回用户的订单记录，包括订单明细。
  3. **更新订单状态**: 支持更新为支付、发货或完成。
  4. **删除订单**: 删除订单及其关联的订单项。

---

### 支付功能
- **功能**: 模拟支付处理，并发送支付成功确认邮件。
- **实现过程**:
  1. 通过订单 ID 查找订单记录并更新为“已支付”状态。
  2. 使用 `nodemailer` 配置 SMTP 服务器，发送支付确认邮件。

---

### 销售报告
- **功能**: 提供销售额统计和商品销售情况统计。
- **实现过程**:
  1. **总销售额统计**: 使用 Sequelize 聚合函数计算已完成订单的总金额。
  2. **商品销售统计**: 按时间段汇总每个商品的销售数量和金额。
  3. **时间段统计**: 按天、月或年分组统计总销售额。

---

## 实现概述
1. **后端实现**: 通过 Express 提供 RESTful API，并使用 Sequelize 管理数据库模型和关联。
2. **前端实现**: 使用 JavaScript 和 CSS 构建动态界面，与后端 API 交互。
3. **数据库**: 使用 MySQL 或 PostgreSQL，定义规范化表结构存储数据。
