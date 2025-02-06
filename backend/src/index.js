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
      'https://blog-production-154c.up.railway.app/'
    ]
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 静态文件服务
const getStaticRoot = () => {
  return process.env.NODE_ENV === 'production'
    ? '/data/uploads'
    : 'uploads';
};

app.use('/uploads', express.static(getStaticRoot()));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

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