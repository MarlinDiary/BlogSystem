import { logError } from './logger.js';

export const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logError(err, req, res);

  // 根据错误类型返回适当的响应
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: '请求参数验证失败',
      details: err.message 
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: '未授权' });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({ message: '权限不足' });
  }

  // 默认服务器错误
  console.error(err);
  res.status(500).json({ message: '服务器内部错误' });
}; 