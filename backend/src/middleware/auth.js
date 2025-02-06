import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({ message: '无效的认证令牌' });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .get();

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    req.userId = decoded.userId;
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    req.isAdmin = user.role === 'admin';

    next();
  } catch (error) {
    return res.status(401).json({ message: '认证失败' });
  }
};

export const isAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}; 