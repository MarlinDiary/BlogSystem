# Blog 系统

这是一个现代化的博客系统，采用前后端分离架构设计。前端使用 SvelteKit 构建，后端使用 Node.js 实现。

## 功能特点

- 📝 文章发布与管理
- 👥 用户认证系统
- 💡 响应式设计
- 🔍 文章搜索
- 💭 评论互动
- ❤️ 文章反应系统

## 系统要求

- Node.js >= 16
- npm 或 yarn
- MongoDB

## 快速开始

### 1. 克隆项目

```bash
git clone [项目地址]
cd Blog
```

### 2. 后端设置

```bash
cd backend
npm install

# 配置环境变量
cp .env.example .env
```

编辑 `.env` 文件，设置以下配置：
```
ADMIN_USERNAME=admin          # 管理员用户名
ADMIN_PASSWORD=your_password  # 管理员密码
JWT_SECRET=your-secret-key   # JWT 密钥
PORT=3000                    # 服务器端口
```

启动后端服务：
```bash
npm run dev
```

### 3. 前端设置

```bash
cd frontend
npm install

# 配置环境变量
cp .env.example .env
```

编辑 `.env` 文件，设置以下配置：
```
VITE_OPENAI_API_KEY=your_openai_api_key_here  # OpenAI API密钥（可选）
PUBLIC_API_URL=http://localhost:3000           # 后端API地址
```

启动前端服务：
```bash
npm run dev
```

## 访问应用

- 前端页面：http://localhost:5173
- 后端API：http://localhost:3000

## 部署说明

### 后端部署
1. 确保MongoDB服务已启动
2. 在生产环境中使用 PM2 或类似工具运行后端服务
```bash
npm install -g pm2
pm2 start npm --name "blog-backend" -- run start
```

### 前端部署
1. 构建前端项目
```bash
cd frontend
npm run build
```
2. 将 `build` 目录部署到您的Web服务器

## 注意事项

- 确保在生产环境中修改所有默认密码和密钥
- 定期备份数据库
- 在生产环境中启用HTTPS
- 确保服务器防火墙配置正确

## 技术栈

- 前端：SvelteKit, TailwindCSS
- 后端：Node.js, Express
- 数据库：MongoDB
- 认证：JWT

## 许可证

MIT 