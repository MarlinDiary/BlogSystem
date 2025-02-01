import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  user?: {
    id: number;
    username: string;
    role: string;
  };
  isAdmin?: boolean;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
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

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}; 