import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { authRouter } from './routes/auth';
import { articlesRouter } from './routes/articles';
import { errorHandler } from './middleware/errorHandler';
import { usersRouter } from './routes/users';
import { commentsRouter } from './routes/comments';
import { logger } from './middleware/logger';
import adminRouter from './routes/admin';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS 配置
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'], // 允许的前端域名
  credentials: true, // 允许携带认证信息
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
}); 