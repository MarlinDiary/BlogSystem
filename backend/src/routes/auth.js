import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

/**
 * @typedef {import('express').Request & { userId?: string }} AuthRequest
 */

const router = express.Router();

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, realName, dateOfBirth, bio } = req.body;
    
    // 验证必填字段
    if (!username || !password || !realName || !dateOfBirth) {
      return res.status(400).json({ 
        message: '用户名、密码、真实姓名和出生日期为必填项' 
      });
    }

    // 验证用户名格式（字母、数字、下划线，6-20位）
    if (!/^[a-zA-Z0-9_]{6,20}$/.test(username)) {
      return res.status(400).json({ 
        message: '用户名必须是6-20位的字母、数字或下划线组合' 
      });
    }

    // 验证密码强度（至少8位，包含字母和数字）
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
      return res.status(400).json({ 
        message: '密码必须至少8位，且包含字母和数字' 
      });
    }

    // 验证出生日期格式
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ 
        message: '出生日期格式无效' 
      });
    }

    // 检查用户是否已存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
    
    if (existingUser) {
      return res.status(409).json({ message: '用户名已存在' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        realName,
        dateOfBirth: sql`${birthDate.toISOString()}`,
        bio: bio || null,
        status: 'active',
        createdAt: sql`${new Date().toISOString()}`
      })
      .returning();

    // 生成 JWT token
    const token = jwt.sign(
      { userId: newUser[0].id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: '用户创建成功',
      token,
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        realName: newUser[0].realName,
        dateOfBirth: newUser[0].dateOfBirth,
        bio: newUser[0].bio,
        createdAt: newUser[0].createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const user = await db.select().from(users).where(eq(users.username, username)).get();
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        dateOfBirth: user.dateOfBirth,
        bio: user.bio,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// 用户登出
router.post('/logout', authMiddleware, (req, res) => {
  // 由于使用 JWT，客户端需要删除 token
  res.json({ message: '登出成功' });
});

// 检查用户名是否可用
router.get('/check-username/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
    
    res.json({ available: !existingUser });
  } catch (error) {
    next(error);
  }
});

// 验证 token
router.get('/validate', authMiddleware, async (req, res, next) => {
  try {
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        dateOfBirth: users.dateOfBirth,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, req.userId))
      .get();

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        dateOfBirth: users.dateOfBirth,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, req.userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// 刷新 token
router.post('/refresh-token', authMiddleware, async (req, res, next) => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        dateOfBirth: user.dateOfBirth,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '当前密码和新密码都是必填项' });
    }

    // 验证新密码强度
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(newPassword)) {
      return res.status(400).json({ 
        message: '新密码必须至少8位，且包含字母和数字' 
      });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, req.userId));

    res.json({ message: '密码修改成功' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter }; 