import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from './auth';

// 创建日志目录
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 创建不同类型的日志流
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

const securityLogStream = fs.createWriteStream(
  path.join(logsDir, 'security.log'),
  { flags: 'a' }
);

interface LogData {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: number;
  duration?: number;
  statusCode?: number;
  error?: string;
}

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const logData: LogData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    userId: (req as AuthRequest).userId
  };

  // 记录请求完成后的信息
  res.on('finish', () => {
    logData.duration = Date.now() - start;
    logData.statusCode = res.statusCode;

    // 访问日志
    accessLogStream.write(JSON.stringify(logData) + '\n');

    // 错误日志
    if (res.statusCode >= 400) {
      errorLogStream.write(JSON.stringify(logData) + '\n');
    }

    // 安全相关日志
    if (
      req.url.includes('/api/auth') || 
      req.url.includes('/api/admin') ||
      res.statusCode === 401 || 
      res.statusCode === 403
    ) {
      securityLogStream.write(JSON.stringify(logData) + '\n');
    }
  });

  next();
};

// 错误日志记录
export const logError = (error: Error, req: Request, res: Response) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req as AuthRequest).userId,
    error: error.message,
    stack: error.stack
  };

  errorLogStream.write(JSON.stringify(logData) + '\n');
}; 