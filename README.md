# 在线购物网站项目说明

## 项目简介
该项目是一个前后端分离的购物网站，使用MVC模式进行开发，后端基于node.js和Express框架运行，数据库使用Sequelize ORM进行管理。功能覆盖用户注册、登录和注销，实现了购物车、产品展示和用户购买流程，还有后台管理员权限进行的商品管理、订单管理、用户管理和销售人员管理。在购买流程的最后完成付款后会给用户的注册邮箱发送确认发货邮件，并支持个性化商品推荐功能。
202230443354 张博谦
---

## 安装与启动说明

### 前置要求
- Node.js (v14.0.0以上)
- MySQL数据库
- npm管理工具

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
  - `api.js` - API请求统一处理与路径定义
  - `area-data.js` - 地区数据处理
  - `auth.js` - 用户登录、注册和注销功能
  - `cart.js` - 购物车操作（添加、更新和删除）
  - `categoryUtils.js` - 类别操作工具函数
  - `checkout.js` - 结账处理
  - `customerManagement.js` - 用户管理控制
  - `dashboard.js` - 管理后台控制
  - `index.js` - 首页展示控制
  - `operationLogs.js` - 操作日志查询及显示
  - `orderDetails.js` - 订单详情展示
  - `orderHistory.js` - 历史订单查询
  - `orderManagement.js` - 订单管理控制
  - `productCategoryManagement.js` - 产品类别管理
  - `productDetails.js` - 产品详情页控制
  - `productSalesMonitor.js` - 产品销售监控
  - `recommendations.js` - 产品推荐功能
  - `reports.js` - 销售报表功能
  - `salesProductLog.js` - 产品销售日志查询
  - `salesStaffManagement.js` - 销售人员管理
  - `salesUtils.js` - 销售辅助工具函数

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
  - `product.js` - 产品模型（包含状态字段：active/discontinued）
  - `order.js` - 订单模型
  - `orderItem.js` - 订单明细模型
  - `cartItem.js` - 购物车模型
  - `category.js` - 产品类别模型
  - `recommendation.js` - 商品推荐模型
  - `userProfile.js` - 用户资料模型
  - `salesProductAssignment.js` - 销售人员产品分配模型
  - `ActivityLog.js` - 用户活动记录模型
  - `LoginLog.js` - 用户登录记录模型
  - `ProductViewLog.js` - 产品浏览记录模型
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
  - `adminController.js` - 管理员功能控制
  - `logController.js` - 日志查询和管理
  - `salesStatsController.js` - 销售统计分析
  - `userActivityController.js` - 用户活动跟踪

- `server/routes/` - 路由文件
  - `userRoutes.js` - 用户相关路由
  - `productRoutes.js` - 产品相关路由
  - `cartRoutes.js` - 购物车相关路由
  - `orderRoutes.js` - 订单相关路由
  - `paymentRoutes.js` - 支付路由
  - `recommendationRoutes.js` - 推荐系统路由
  - `salesStaffRoutes.js` - 销售人员路由
  - `salesReportRoutes.js` - 销售报告路由
  - `categoryRoutes.js` - 产品类别管理路由
  - `logRoutes.js` - 日志查询路由

- `server/config/` - 配置文件
  - `config.json` - 数据库连接配置
  - `database.js` - 数据库初始化
  - `middleware/` - 中间件目录
    - `activityLogger.js` - 用户活动记录中间件
    - `authMiddleware.js` - 身份认证中间件

- `server/migrations/` - 数据库迁移文件
  - 包含创建各种数据表的迁移脚本
  - `20250510000000-create-categories.js` - 创建产品类别表
  - `20250510000001-populate-categories.js` - 填充初始类别数据
  - `20250510140000-add-isActive-to-users.js` - 添加用户活跃状态字段
  - `20250511000000-add-status-to-products.js` - 添加产品状态字段 
  - `20250511000001-create-product-view-logs.js` - 创建产品浏览日志表

- `server/services/` - 服务层
  - `categoryHelper.js` - 产品类别处理辅助服务
  - `categoryService.js` - 产品类别业务逻辑服务
  - `salesAssignmentService.js` - 销售产品分配服务

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
  1. **注册**: 检查邮箱是否已存在，通过 Sequelize 创建用户记录，同时创建相关联的用户资料表
  2. **登录**: 使用 bcrypt 校验密码，生成 JWT 令牌，并记录登录行为到 `LoginLog` 表
  3. **权限验证**: 通过中间件解析 JWT 并验证用户角色（管理员/销售人员/普通用户）
  4. **用户资料**: 提供基于 JWT 的接口返回和更新用户信息
  5. **状态管理**: 支持激活/禁用用户账户，通过 `isActive` 字段控制
  6. **登录历史**: 支持查看用户登录历史记录，包括登录时间、设备和IP地址

---

### 产品管理
- **功能**: 提供产品的新增、更新、删除及查询功能，支持图片上传和产品分类管理
- **实现过程**:
  1. 使用 Sequelize 定义产品模型，包含名称、价格、库存、分类、状态等字段
  2. **新增/更新**: 使用 multer 中间件处理图片上传，并更新产品记录
  3. **查询**: 支持按分类、状态和关键词搜索产品，返回产品列表，支持查询单个产品的详细信息
  4. **删除**: 支持物理删除和逻辑删除（设置状态为已停产）产品记录
  5. **分类管理**: 提供产品分类的增删改查功能，并通过 `categoryHelper` 服务优化分类关联
  6. **状态追踪**: 记录产品状态变更历史，支持产品下架和重新上架

---

### 购物车
- **功能**: 实现用户购物车的管理，包括添加商品、更新数量、删除商品和查看购物车
- **实现过程**:
  1. 每个购物车商品（`cartItem`）与用户和产品通过外键关联
  2. **添加商品**: 检查产品状态和库存后新增或更新购物车记录，并记录用户活动
  3. **更新数量**: 校验库存并修改购物车记录，同时触发相关事件
  4. **删除商品**: 删除指定购物车记录
  5. **查询购物车**: 返回用户当前的购物车内容，包括商品详情、状态、库存和总金额

---

### 订单管理
- **功能**: 实现订单的创建、更新、查询和管理
- **实现过程**:
  1. **创建订单**: 
     - 从购物车中生成订单及订单明细，并清空购物车
     - 验证产品状态和库存是否满足订单要求
     - 生成唯一订单号和初始状态（未支付）
  2. **查询历史订单**: 
     - 返回用户的订单记录，包括订单明细和状态追踪
     - 提供按时间、状态、金额等多种条件的筛选功能
  3. **更新订单状态**: 
     - 支持更新为支付、发货、运输中、已签收或已取消等多种状态
     - 每次状态变更都记录到活动日志中
  4. **订单详情**: 
     - 提供订单详细信息查看，包括配送地址、支付信息等
  5. **订单管理**: 
     - 管理员可查看和处理所有用户订单
     - 销售人员可以查看和处理自己负责的订单

---

### 支付功能
- **功能**: 模拟支付处理，并发送支付成功确认邮件
- **实现过程**:
  1. **支付处理**:
     - 通过订单 ID 查找订单记录并验证状态和金额
     - 更新订单状态为"已支付"
  2. **通知发送**:
     - 使用 `nodemailer` 配置 SMTP 服务器
     - 发送支付成功通知到用户的注册邮箱
  3. **交易记录**:
     - 支付完成后记录交易信息到数据库
     - 支付失败时自动重试或通知用户
  4. **订单后续处理**:
     - 支付成功后自动减少产品库存
     - 触发订单处理流程，通知相关销售人员
     - 更新用户购买历史

---

### 销售报告
- **功能**: 提供全面的销售数据分析和可视化报表
- **实现过程**:
  1. **总销售额统计**: 
     - 使用 Sequelize 聚合函数计算已完成订单的总金额
     - 支持按区域、客户类型分组统计
     - 提供同比和环比增长率分析
  2. **商品销售统计**: 
     - 按时间段汇总每个商品的销售数量和金额
     - 提供类别销售占比分析
  3. **时间段统计**: 
     - 按小时、天、周、月或年分组统计总销售额
     - 支持自定义时间范围查询
  4. **销售人员业绩**: 
     - 统计每个销售人员的销售额和订单数
  5. **可视化报表**: 
     - 前端使用 Chart.js 创建多种图表展示销售数据
     - 支持柱状图、折线图、饼图和热力图等多种图表类型
  6. **销售异常监控**: 
     - 自动监控销售数据异常
     - 显示销售异常指标和预警

---

### 商品推荐系统
- **功能**: 根据用户购买历史和浏览记录推荐相关商品
- **实现过程**:
  1. **数据收集**:
     - 记录用户的浏览行为到 `ProductViewLog` 表，包括浏览时间、停留时间和交互方式
     - 记录用户的购买行为到 `ActivityLog` 表，包括购买频率和金额
  2. **用户画像构建**:
     - 基于用户行为数据分析用户偏好和兴趣
     - 识别用户消费习惯和价格敏感度
     - 建立用户分类模型和偏好标签
  3. **推荐算法**:
     - 基于内容的推荐：根据用户历史喜好的产品特征推荐相似产品
     - 热门商品推荐：根据销量推荐热门商品
  4. **推荐展示**:
     - 在商品详情页展示个性化推荐商品列表
  5. **推荐效果分析**:
     - 跟踪推荐商品的点击率和转化率
     - 提供推荐效果报告给管理员

---

### 销售人员管理
- **功能**: 管理销售人员账号和业绩
- **实现过程**:
  1. **账户管理**:
     - 创建和管理销售人员账户
  2. **产品分配**:
     - 通过 `salesProductAssignment` 模型分配产品管理权限
     - 支持按产品类别或具体产品分配
  3. **业绩跟踪**:
     - 使用 `salesStatsController` 统计每个销售人员的订单数、销售额和客户数
     - 生成销售业绩报表和趋势图表
  4. **权限控制**:
     - 销售人员只能访问其负责的产品和客户数据

---

### 用户活动日志
- **功能**: 记录用户的各种活动，提供全面的用户行为分析
- **实现过程**:
  1. **活动捕获**:
     - 使用中间件 `activityLogger.js` 自动捕获用户活动
     - 记录API请求、页面访问和交互操作
     - 获取用户IP、设备和浏览器信息
  2. **日志存储**:
     - 将用户活动记录到 `ActivityLog` 表中，包含用户ID、活动类型、时间戳和详细信息
     - 将登录相关活动记录到 `LoginLog` 表中，包含登录方式、成功/失败状态和会话ID
     - 将产品浏览记录到 `ProductViewLog` 表中，包含浏览时长和交互方式
  3. **分析界面**:
     - 在 `operationLogs.html` 页面提供管理员查询和分析用户活动的界面
     - 支持按用户、时间段、活动类型、IP地址等多种条件筛选日志
     - 提供日志数据可视化图表

---

### 产品状态管理
- **功能**: 管理产品的生命周期状态，优化库存和销售策略
- **实现过程**:
  1. **状态定义**:
     - 产品模型中添加 `status` 字段，支持 `active`（活跃）和 `discontinued`（已停产）状态
     - 通过数据库迁移脚本 `20250511000000-add-status-to-products.js` 实现状态字段添加
     - 为历史数据设置默认状态值
  2. **界面管理**:
     - 在产品管理界面提供状态切换功能，支持批量操作
     - 使用颜色编码和图标直观显示产品状态
     - 提供状态变更原因记录和审批流程
  3. **状态过滤**:
     - 产品列表和搜索结果默认只显示活跃状态的产品
     - 为管理员和销售人员提供查看所有状态产品的选项
     - 在API响应中包含产品状态信息
  4. **库存联动**:
     - 停产产品自动标记为不可购买
     - 低库存产品提供自动或手动状态更新选项
  5. **销售分析**:
     - 提供不同状态产品的销售对比分析
     - 监控产品状态变更对销售的影响
     - 基于销售趋势提供状态调整建议

---

### 产品分类管理
- **功能**: 管理产品类别体系，优化产品组织和展示
- **实现过程**:
  1. **类别结构**:
     - 通过 `category.js` 模型定义产品类别，支持层级结构
     - 使用 `categoryService.js` 提供完整的类别业务逻辑
     - 通过 `categoryHelper.js` 优化产品和类别的关联处理
  2. **类别操作**:
     - 提供类别的创建、编辑、删除功能
     - 支持类别合并和拆分操作
     - 类别变更时自动更新关联产品
  3. **前端展示**:
     - 使用 `categoryUtils.js` 处理前端类别展示逻辑
     - 通过导航菜单和筛选器展示类别结构
     - 支持多级类别的层级显示和折叠
  4. **数据分析**:
     - 提供各类别销售数据和趋势分析
     - 识别高增长和低增长类别
     - 基于类别分析提供产品组合优化建议

---

### 销售产品监控
- **功能**: 实时监控产品销售情况，提供销售异常预警
- **实现过程**:
  1. **数据收集**:
     - 通过 `salesProductLog.js` 记录产品销售日志
     - 在 `productSalesMonitor.html` 页面展示监控界面
     - 支持多维度数据筛选和分析
  2. **指标监控**:
     - 跟踪产品销售量、销售额和库存水平
     - 计算销售异常指标和波动率
  3. **异常检测**:
     - 设置销售指标阈值和预警规则
  4. **实时报告**:
     - 生成销售监控实时报表

## 实现概述
1. **后端实现**: 通过 Express 提供 RESTful API，并使用 Sequelize ORM 管理数据库模型和关联
2. **前端实现**: 使用 JavaScript 和 CSS 构建动态界面，与后端 API 交互
3. **数据库**: 使用 MySQL ，通过Sequelize定义规范化表结构存储数据
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
  - MySQL：关系型数据库
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

- **日志与监控**：
  - Winston：后端日志记录
  - Morgan：HTTP请求日志
  - 自定义活动日志中间件：用户行为追踪

- **日志处理**：
  - Winston：后端日志记录
  - Morgan：HTTP请求日志

### 开发与部署工具
- **版本控制**：
  - Git：代码版本管理

- **开发工具**：
  - VS Code：代码编辑器
  - npm：包管理工具