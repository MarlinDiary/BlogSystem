import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { articlesRouter } from './routes/articles.js';
import { errorHandler } from './middleware/errorHandler.js';
import { usersRouter } from './routes/users.js';
import { commentsRouter } from './routes/comments.js';
import { logger } from './middleware/logger.js';
import { adminRouter } from './routes/admin.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// CORS 配置
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://blog-blush-nine-72.vercel.app',
      'https://blog-blush-nine-72.vercel.app/',
      'https://blog-production-154c.up.railway.app',
      'https://blog-production-154c.up.railway.app/',
      'https://www.huizha.com',
      'https://www.huizha.com/',
      'http://blog-production-154c.up.railway.app',
      'http://blog-production-154c.up.railway.app/',
      'https://huizha.com',
      'https://huizha.com/',
      'http://huizha.com',
      'http://huizha.com/'
    ]
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: corsOrigins,  // 直接使用域名列表
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

app.use(express.json());

// 静态文件服务
const getStaticRoot = () => {
  return process.env.NODE_ENV === 'production'
    ? '/uploads'
    : 'uploads';
};

// 添加调试日志
const staticRoot = getStaticRoot();
console.log('Static files root:', staticRoot);
console.log('Checking static directory exists:', fs.existsSync(staticRoot));
console.log('Checking if it is a symlink:', fs.lstatSync(staticRoot).isSymbolicLink());
if (process.env.NODE_ENV === 'production') {
  console.log('Checking /data/uploads exists:', fs.existsSync('/data/uploads'));
  // 列出 /data/uploads 目录内容
  console.log('Contents of /data/uploads:', fs.readdirSync('/data/uploads'));
  // 列出各个子目录
  ['avatars', 'covers', 'articles'].forEach(dir => {
    const fullPath = `/data/uploads/${dir}`;
    if (fs.existsSync(fullPath)) {
      console.log(`Contents of ${fullPath}:`, fs.readdirSync(fullPath));
    }
  });
  // 检查软链接目标
  console.log('Symlink target:', fs.readlinkSync('/uploads'));
}

// 添加访问日志中间件
app.use('/uploads', (req, res, next) => {
  console.log('Accessing file:', req.path);
  console.log('File exists:', fs.existsSync(path.join(getStaticRoot(), req.path)));
  
  // 添加缓存控制
  const ext = path.extname(req.path).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    // 图片缓存 7 天
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('Expires', new Date(Date.now() + 604800000).toUTCString());
  }
  
  next();
}, express.static(getStaticRoot()));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 确保必要的目录存在
const ensureDirectories = () => {
  const dirs = [
    '/uploads',
    '/uploads/covers',
    '/uploads/avatars',
    '/uploads/articles'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      // 设置目录权限
      fs.chmodSync(dir, '755');
    }
  });
};

// 在应用启动时初始化目录
if (process.env.NODE_ENV === 'production') {
  ensureDirectories();
}

// 路由
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/users', usersRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/admin', adminRouter);

// 添加日志中间件
app.use(logger);

// 错误处理中间件
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 