import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { Request } from 'express';

interface AuthRequest extends Request {
  userId?: string;
}

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户账号
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - realName
 *               - dateOfBirth
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名（6-20位字母、数字或下划线）
 *               password:
 *                 type: string
 *                 description: 密码（至少8位，包含字母和数字）
 *               realName:
 *                 type: string
 *                 description: 真实姓名
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: 出生日期
 *               bio:
 *                 type: string
 *                 description: 个人简介
 *     responses:
 *       201:
 *         description: 注册成功
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 用户名已存在
 */
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
        status: 'active' as const,
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名和密码登录
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: 用户名或密码错误
 */
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

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 登出当前用户
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未授权
 */
router.post('/logout', authMiddleware, (req: AuthRequest, res) => {
  // 由于使用 JWT，客户端需要删除 token
  res.json({ message: '登出成功' });
});

/**
 * @swagger
 * /api/auth/check-username/{username}:
 *   get:
 *     summary: 检查用户名是否可用
 *     description: 检查指定的用户名是否已被注册
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: 要检查的用户名
 *     responses:
 *       200:
 *         description: 检查结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 */
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
    
    res.json({ available: !existingUser });
  } catch (error) {
    res.status(500).json({ message: '检查用户名失败' });
  }
});

export const authRouter = router; 