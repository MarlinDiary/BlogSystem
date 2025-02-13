export const errorHandler = (err, req, res, next) => {
  // 打印详细错误信息到控制台
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
    body: req.body
  });

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

  // SQLite 错误处理
  if (err.code && err.code.startsWith('SQLITE_')) {
    switch (err.code) {
      case 'SQLITE_CONSTRAINT':
        return res.status(400).json({ 
          message: '数据库约束错误',
          details: err.message
        });
      case 'SQLITE_BUSY':
        return res.status(503).json({ 
          message: '数据库繁忙，请稍后重试',
          details: err.message
        });
      case 'SQLITE_READONLY':
        return res.status(503).json({ 
          message: '数据库只读，无法执行写操作',
          details: err.message
        });
      case 'SQLITE_CORRUPT':
        return res.status(500).json({ 
          message: '数据库文件损坏',
          details: err.message
        });
      case 'SQLITE_IOERR':
        return res.status(500).json({ 
          message: '数据库 I/O 错误',
          details: err.message
        });
      default:
        return res.status(500).json({ 
          message: '数据库操作失败',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
  }

  // 文件系统错误处理
  if (err.code && ['ENOENT', 'EACCES', 'EPERM'].includes(err.code)) {
    return res.status(500).json({ 
      message: '文件系统操作失败',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // 默认服务器错误
  res.status(500).json({ 
    message: '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}; 