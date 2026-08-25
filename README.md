# 多租户管理平台

一个功能完整的多租户 SaaS 管理平台，提供租户管理、套餐管理、计费与账单等核心功能。

## 技术栈

### 前端
- **React 18** - 前端框架
- **Vite 5** - 构建工具
- **TypeScript 5** - 类型安全
- **Arco Design 2.56** - 企业级 UI 组件库
- **Redux Toolkit 2.1** - 状态管理
- **React Router 6** - 路由管理
- **Axios** - HTTP 客户端

### 后端
- **Node.js 18** - 运行时环境
- **NestJS 10** - 企业级 Node.js 框架
- **TypeScript** - 类型安全
- **Prisma 5** - ORM 数据访问层
- **MySQL 8.0** - 关系型数据库
- **JWT** - 身份认证
- **Passport** - 认证中间件
- **Swagger** - API 文档

### 部署与运维
- **Docker** - 容器化
- **Docker Compose** - 服务编排
- **Nginx** - 反向代理和静态文件服务

## 核心功能

### 1. 平台管理员登录
- JWT Token 认证机制
- 用户名密码登录（默认账号：admin / 112233）
- Token 自动续期和安全存储
- 路由守卫保护

### 2. 租户管理
- 租户信息 CRUD（创建、查询、更新、删除）
- 租户状态管理（激活/禁用）
- 租户套餐分配
- 租户用户管理
- 租户账单关联查看
- 搜索和分页功能

### 3. 套餐管理
- 套餐信息 CRUD
- 套餐功能特性配置（JSON 字段）
- 套餐价格和计费周期管理
- 套餐使用情况统计
- 关联租户检查（防止误删）

### 4. 计费与账单
- 账单信息 CRUD
- 账单状态管理（待支付/已支付/已逾期/已取消）
- 批量生成月度账单
- 账单统计（总金额、已收、待收）
- 账单明细管理
- 业务规则校验（已支付账单不可修改）

### 5. 仪表盘
- 数据概览（总租户、活跃租户、套餐数、已收金额）
- 套餐收入分布
- 账单统计面板
- 最近租户列表
- 最近账单列表

## 快速开始（Docker Compose 一键启动）

### 环境要求
- Docker 20.10+
- Docker Compose 2.0+

### 启动步骤

1. **克隆项目到本地**
```bash
git clone <repository-url>
cd app-12
```

2. **一键启动所有服务**
```bash
docker-compose up --build
```

首次启动会自动执行以下操作：
- 拉取 MySQL 8.0 镜像并初始化数据库
- 构建后端服务镜像，执行数据库迁移和种子数据初始化
- 构建前端服务镜像，使用 Nginx 提供静态资源服务
- 所有服务通过 Docker 内部网络自动连通

3. **访问应用**
- 前端地址：http://localhost
- API 文档：http://localhost:3000/api-docs
- 默认账号：`admin` / `112233`

4. **停止服务**
```bash
docker-compose down
```

5. **停止服务并清除数据**
```bash
docker-compose down -v
```

## 本地开发环境搭建

### 后端开发

1. **进入后端目录**
```bash
cd backend
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
创建 `.env` 文件：
```env
DATABASE_URL=mysql://root:password@localhost:3306/multitenant_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
PORT=3000
```

4. **启动 MySQL 数据库**
```bash
docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=multitenant_db -p 3306:3306 -d mysql:8.0
```

5. **执行数据库迁移**
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

6. **启动开发服务器**
```bash
npm run start:dev
```

后端服务将在 http://localhost:3000 启动

### 前端开发

1. **进入前端目录**
```bash
cd frontend
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

前端服务将在 http://localhost:5173 启动，API 请求会自动代理到 http://localhost:3000

## 项目结构

```
app-12/
├── backend/                    # 后端服务
│   ├── prisma/                 # Prisma 配置
│   │   ├── schema.prisma       # 数据模型定义
│   │   ├── seed.ts             # 种子数据
│   │   └── init.sql            # 数据库初始化脚本
│   ├── src/
│   │   ├── auth/               # 认证模块
│   │   ├── tenant/             # 租户管理模块
│   │   ├── plan/               # 套餐管理模块
│   │   ├── bill/               # 账单管理模块
│   │   ├── dashboard/          # 仪表盘模块
│   │   ├── common/             # 公共模块
│   │   │   ├── guards/         # 守卫
│   │   │   ├── decorators/     # 装饰器
│   │   │   └── dto/            # 数据传输对象
│   │   ├── prisma/             # Prisma 服务
│   │   ├── app.module.ts       # 根模块
│   │   └── main.ts             # 入口文件
│   ├── Dockerfile              # 后端 Docker 镜像
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # 前端服务
│   ├── src/
│   │   ├── components/         # 公共组件
│   │   │   └── MainLayout.tsx  # 主布局组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── Login.tsx       # 登录页
│   │   │   ├── Dashboard.tsx   # 仪表盘
│   │   │   ├── tenants/        # 租户管理页面
│   │   │   ├── plans/          # 套餐管理页面
│   │   │   └── bills/          # 账单管理页面
│   │   ├── store/              # Redux 状态管理
│   │   │   ├── slices/         # 状态切片
│   │   │   └── index.ts        # Store 配置
│   │   ├── services/           # API 服务层
│   │   │   └── api.ts          # Axios 实例和 API 封装
│   │   ├── styles/             # 全局样式
│   │   ├── types/              # TypeScript 类型定义
│   │   ├── App.tsx             # 根组件
│   │   └── main.tsx            # 入口文件
│   ├── Dockerfile              # 前端 Docker 镜像
│   ├── nginx.conf              # Nginx 配置
│   ├── vite.config.ts          # Vite 配置
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml          # Docker Compose 配置
├── .env                        # 环境变量
├── .gitignore                  # Git 忽略文件
└── README.md                   # 项目文档
```

## 数据库设计

### 核心数据表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| Admin | 平台管理员 | id, username, password, name, email, role |
| Plan | 套餐 | id, name, price, billingCycle, maxUsers, maxStorage, features, status |
| Tenant | 租户 | id, name, code, contactName, contactEmail, status, planId, trialEndsAt |
| TenantUser | 租户用户 | id, tenantId, username, email, password, role, status |
| Bill | 账单 | id, tenantId, amount, billDate, dueDate, status, paidAt, items |

### 关系说明
- Plan (1) → Tenant (n)：一个套餐可以被多个租户使用
- Tenant (1) → TenantUser (n)：一个租户可以有多个用户
- Tenant (1) → Bill (n)：一个租户可以有多个账单

## API 文档

启动后端服务后，访问 Swagger API 文档：
- 地址：http://localhost:3000/api-docs

### 主要接口

#### 认证接口
- `POST /api/auth/login` - 管理员登录
- `GET /api/auth/profile` - 获取当前用户信息

#### 租户管理接口
- `GET /api/tenants` - 获取租户列表（支持分页和搜索）
- `GET /api/tenants/:id` - 获取租户详情
- `POST /api/tenants` - 创建租户
- `PUT /api/tenants/:id` - 更新租户信息
- `DELETE /api/tenants/:id` - 删除租户
- `PATCH /api/tenants/:id/status` - 更新租户状态
- `GET /api/tenants/stats` - 获取租户统计数据

#### 套餐管理接口
- `GET /api/plans` - 获取套餐列表
- `GET /api/plans/:id` - 获取套餐详情
- `POST /api/plans` - 创建套餐
- `PUT /api/plans/:id` - 更新套餐信息
- `DELETE /api/plans/:id` - 删除套餐

#### 账单管理接口
- `GET /api/bills` - 获取账单列表（支持分页、搜索、状态筛选）
- `GET /api/bills/:id` - 获取账单详情
- `POST /api/bills` - 创建账单
- `PUT /api/bills/:id` - 更新账单信息
- `DELETE /api/bills/:id` - 删除账单
- `PATCH /api/bills/:id/status` - 更新账单状态
- `POST /api/bills/generate-monthly` - 批量生成月度账单
- `GET /api/bills/stats` - 获取账单统计数据

#### 仪表盘接口
- `GET /api/dashboard/overview` - 获取仪表盘概览数据

## UI 风格说明

本平台采用专业的企业级管理后台设计风格：

- **配色方案**：以蓝色系为主色调，配合中性灰和专业状态色
  - 成功/活跃状态：绿色
  - 警告/待处理状态：橙色
  - 错误/逾期状态：红色
  - 信息/已取消状态：灰色

- **布局结构**：经典的三栏布局
  - 顶部 Header：Logo、系统标题、用户信息
  - 左侧 Sider：可折叠导航菜单
  - 右侧 Content：主内容区域

- **组件设计**：
  - 统计卡片：清晰展示关键指标
  - 数据表格：支持排序、筛选、分页
  - 弹窗表单：统一的新建/编辑交互
  - 详情页面：信息分组展示，关联数据一目了然

## 部署说明

### 生产环境部署

1. **修改环境变量**
编辑 `.env` 文件，修改默认密码和密钥：
```env
DB_ROOT_PASSWORD=your_strong_root_password
DB_PASSWORD=your_strong_db_password
JWT_SECRET=your_very_long_and_secure_jwt_secret_key
```

2. **启动服务**
```bash
docker-compose up -d --build
```

3. **配置反向代理（可选）**
如果需要配置域名和 HTTPS，可以在 Nginx 前面增加一层反向代理，例如使用 Nginx Proxy Manager 或 Traefik。

### 数据备份

备份 MySQL 数据：
```bash
docker exec multitenant-mysql mysqldump -u root -p${DB_ROOT_PASSWORD} multitenant_db > backup.sql
```

恢复数据：
```bash
docker exec -i multitenant-mysql mysql -u root -p${DB_ROOT_PASSWORD} multitenant_db < backup.sql
```

## 常见问题

### 1. 启动时后端服务连接数据库失败？
确保 MySQL 服务完全启动后再启动后端。Docker Compose 已配置健康检查，会自动等待 MySQL 就绪。如果仍然失败，可以尝试：
```bash
docker-compose restart backend
```

### 2. 前端页面刷新出现 404？
这是单页应用的常见问题。Nginx 已配置 `try_files` 规则，确保所有请求都回退到 `index.html`。如果使用其他 Web 服务器，请参考配置相应的路由回退规则。

### 3. 如何修改默认管理员密码？
登录系统后，可以通过修改数据库中的 `Admin` 表来更改密码。密码使用 bcrypt 加密，需要先生成哈希值：
```typescript
import * as bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash('new_password', 10);
```

### 4. 如何添加新的功能模块？
- 后端：在 `src/` 下创建新的模块目录，包含 module、controller、service、dto
- 前端：在 `src/pages/` 下创建新的页面组件，在 `src/services/api.ts` 添加 API 接口，在 `MainLayout.tsx` 添加菜单项

### 5. 数据库迁移失败怎么办？
检查 `DATABASE_URL` 环境变量是否正确，确保 MySQL 服务可访问。可以手动执行迁移命令：
```bash
docker exec multitenant-backend npm run prisma:migrate
```

## 开发规范

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 规范（可根据需要添加配置）
- 组件和函数使用 PascalCase 和 camelCase 命名

### 提交规范
建议使用 Conventional Commits 规范：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具相关

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或发送邮件。

---

**享受使用多租户管理平台！** 🚀
