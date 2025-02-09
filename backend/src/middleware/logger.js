import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const dbLogStream = fs.createWriteStream(
  path.join(logsDir, 'db.log'),
  { flags: 'a' }
);

// 格式化日志消息
function formatLogMessage(data) {
  return JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  }) + '\n';
}

export const logger = (req, res, next) => {
  const start = Date.now();
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    userId: req.userId,
    body: req.method !== 'GET' ? req.body : undefined
  };

  // 记录请求完成后的信息
  res.on('finish', () => {
    logData.duration = Date.now() - start;
    logData.statusCode = res.statusCode;

    // 访问日志
    accessLogStream.write(formatLogMessage(logData));

    // 错误日志
    if (res.statusCode >= 400) {
      errorLogStream.write(formatLogMessage({
        ...logData,
        level: 'ERROR',
        type: 'HTTP_ERROR'
      }));
    }

    // 安全相关日志
    if (
      req.url.includes('/api/auth') || 
      req.url.includes('/api/admin') ||
      res.statusCode === 401 || 
      res.statusCode === 403
    ) {
      securityLogStream.write(formatLogMessage({
        ...logData,
        level: 'SECURITY',
        type: 'AUTH_EVENT'
      }));
    }
  });

  next();
};

// 错误日志记录
export const logError = (error, req, res) => {
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    type: error.code?.startsWith('SQLITE_') ? 'DB_ERROR' : 'APP_ERROR',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.userId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    request: {
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query
    }
  };

  // 写入错误日志
  errorLogStream.write(formatLogMessage(logData));

  // 如果是数据库错误，同时写入数据库日志
  if (error.code?.startsWith('SQLITE_')) {
    dbLogStream.write(formatLogMessage({
      ...logData,
      type: 'DB_ERROR',
      sql: error.sql,
      params: error.params
    }));
  }
}; 