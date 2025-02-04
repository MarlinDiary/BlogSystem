import { Router } from 'express';
import { db } from '../db';
import { users, articles, articleReactions, comments } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload';
import { Response, NextFunction } from 'express';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         realName:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         bio:
 *           type: string
 *         avatarUrl:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [active, banned]
 */

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 获取已登录用户的详细信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户未找到
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        dateOfBirth: users.dateOfBirth,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: 更新当前用户信息
 *     description: 更新已登录用户的个人信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               realName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 */
router.put('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { username, realName, dateOfBirth, bio } = req.body;

    // 如果要更新用户名，检查是否已存在
    if (username) {
      const existingUser = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.username, username),
            sql`${users.id} != ${req.userId!}`
          )
        )
        .get();

      if (existingUser) {
        return res.status(400).json({ message: '用户名已被使用' });
      }
    }

    const updatedUser = await db
      .update(users)
      .set({
        ...(username && { username }),
        realName,
        dateOfBirth,
        bio
      })
      .where(eq(users.id, req.userId!))
      .returning();

    res.json(updatedUser[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: 删除当前用户账号
 *     description: 删除已登录用户的账号及相关数据
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *               deleteArticles:
 *                 type: boolean
 *                 default: true
 *               deleteComments:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: 账号删除成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权或密码错误
 */
router.delete('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId;
    
    // 验证密码
    const { password, deleteArticles = true, deleteComments = true } = req.body;
    if (!password) {
      return res.status(400).json({ message: '请提供密码以确认删除' });
    }
    
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId!))
      .get();
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: '密码错误' });
    }

    // 开启事务以确保数据一致性
    await db.transaction(async (tx) => {
      // 删除用户的所有点赞
      await tx
        .delete(articleReactions)
        .where(eq(articleReactions.userId, userId!));
      
      if (deleteComments) {
        // 删除用户的所有评论
        await tx
          .delete(comments)
          .where(eq(comments.userId, userId!));
      } else {
        // 将评论标记为已删除用户
        await tx
          .update(comments)
          .set({ userId: sql`NULL` })
          .where(eq(comments.userId, userId!));
      }
      
      if (deleteArticles) {
        // 删除用户的所有文章
        await tx
          .delete(articles)
          .where(eq(articles.authorId, userId!));
      } else {
        // 将文章标记为已删除用户
        await tx
          .update(articles)
          .set({ 
            authorId: sql`NULL`,
            status: 'pending' as const
          })
          .where(eq(articles.authorId, userId!));
      }
      
      // 最后删除用户
      await tx
        .delete(users)
        .where(eq(users.id, userId!));
    });
    
    // 删除用户头像文件
    if (user.avatarUrl && !user.avatarUrl.includes('default.png')) {
      const avatarPath = path.join(__dirname, '../..', user.avatarUrl);
      fs.unlink(avatarPath, (err) => {
        if (err) console.error('删除头像文件失败:', err);
      });
    }
    
    res.json({ message: '账号已删除' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{userId}/avatar:
 *   get:
 *     summary: 获取用户头像
 *     description: 获取指定用户的头像图片
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功返回头像图片
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 用户或头像未找到
 */
router.get('/:userId/avatar', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const id = parseInt(userId);

    // 如果用户ID无效或为0，返回默认头像
    if (isNaN(id) || id === 0) {
      const defaultAvatarPath = path.join(__dirname, '../../uploads/avatars/default.png');
      if (!fs.existsSync(defaultAvatarPath)) {
        return res.status(404).json({ message: '默认头像文件未找到' });
      }
      res.setHeader('Content-Type', 'image/png');
      return res.sendFile(defaultAvatarPath);
    }

    const user = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!user) {
      // 用户不存在时也返回默认头像
      const defaultAvatarPath = path.join(__dirname, '../../uploads/avatars/default.png');
      if (!fs.existsSync(defaultAvatarPath)) {
        return res.status(404).json({ message: '默认头像文件未找到' });
      }
      res.setHeader('Content-Type', 'image/png');
      return res.sendFile(defaultAvatarPath);
    }

    const avatarPath = user.avatarUrl 
      ? path.join(__dirname, '../..', user.avatarUrl)
      : path.join(__dirname, '../../uploads/avatars/default.png');

    // 检查文件是否存在
    if (!fs.existsSync(avatarPath)) {
      const defaultAvatarPath = path.join(__dirname, '../../uploads/avatars/default.png');
      if (!fs.existsSync(defaultAvatarPath)) {
        return res.status(404).json({ message: '头像文件未找到' });
      }
      res.setHeader('Content-Type', 'image/png');
      return res.sendFile(defaultAvatarPath);
    }

    // 根据文件扩展名设置正确的Content-Type
    const ext = path.extname(avatarPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    // 发送文件
    res.sendFile(avatarPath);
  } catch (error) {
    next(error);
  }
});

// 检查用户状态中间件
export const checkUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await db
      .select({
        id: users.id,
        status: users.status,
        banReason: users.banReason,
        banExpireAt: users.banExpireAt
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }

    if (user.status === 'banned') {
      if (user.banExpireAt && new Date(user.banExpireAt) <= new Date()) {
        // 解封过期的账号
        await db
          .update(users)
          .set({ 
            status: 'active',
            banReason: null,
            banExpireAt: null
          })
          .where(eq(users.id, req.userId!));
      } else {
        return res.status(403).json({ 
          message: '账号已被封禁',
          reason: user.banReason,
          expireAt: user.banExpireAt
        });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: 上传用户头像
 *     description: 上传或更新当前用户的头像
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 头像上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 */
router.post('/avatar', authMiddleware, checkUserStatus, upload.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择头像图片' });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }

    // 删除旧头像
    if (user.avatarUrl && !user.avatarUrl.includes('default.png')) {
      const oldAvatarPath = path.join(__dirname, '../..', user.avatarUrl);
      fs.unlink(oldAvatarPath, (err) => {
        if (err) console.error('删除旧头像失败:', err);
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const updatedUser = await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, req.userId!))
      .returning();

    // 返回完整的用户信息
    res.json({
      id: updatedUser[0].id,
      username: updatedUser[0].username,
      realName: updatedUser[0].realName,
      dateOfBirth: updatedUser[0].dateOfBirth,
      bio: updatedUser[0].bio,
      avatarUrl: updatedUser[0].avatarUrl,
      createdAt: updatedUser[0].createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/me/articles:
 *   get:
 *     summary: 获取当前用户的文章列表
 *     description: 获取已登录用户发布的所有文章
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回文章列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 *       401:
 *         description: 未授权
 */
router.get('/me/articles', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.authorId, req.userId!))
      .orderBy(desc(articles.createdAt));
    
    res.json(userArticles);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 获取所有用户的列表（分页）
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 并发查询：用户列表和总数
    const [usersList, total] = await Promise.all([
      db.select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        articleCount: sql<number>`count(distinct ${articles.id})`,
        commentCount: sql<number>`count(distinct ${comments.id})`
      })
        .from(users)
        .leftJoin(articles, eq(articles.authorId, users.id))
        .leftJoin(comments, eq(comments.userId, users.id))
        .groupBy(users.id)
        .orderBy(desc(users.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(users)
    ]);

    res.json({
      items: usersList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 获取用户信息
 *     description: 获取指定用户的公开信息
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功返回用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: 用户不存在
 */
router.get('/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        dateOfBirth: users.dateOfBirth,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        articleCount: sql<number>`count(distinct ${articles.id})`,
        commentCount: sql<number>`count(distinct ${comments.id})`
      })
      .from(users)
      .leftJoin(articles, eq(articles.authorId, users.id))
      .leftJoin(comments, eq(comments.userId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id)
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}/articles:
 *   get:
 *     summary: 获取用户文章列表
 *     description: 获取指定用户发布的所有文章
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功返回文章列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Article'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *       404:
 *         description: 用户不存在
 */
router.get('/:id/articles', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    // 并发查询：文章列表和总数
    const [articlesList, total] = await Promise.all([
      db.select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        imageUrl: articles.imageUrl,
        status: articles.status,
        viewCount: articles.viewCount,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        commentCount: sql<number>`count(distinct ${comments.id})`,
        reactionCount: sql<number>`count(distinct ${articleReactions.id})`
      })
        .from(articles)
        .leftJoin(comments, eq(comments.articleId, articles.id))
        .leftJoin(articleReactions, eq(articleReactions.articleId, articles.id))
        .where(eq(articles.authorId, userId))
        .groupBy(articles.id)
        .orderBy(desc(articles.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(eq(articles.authorId, userId))
    ]);

    res.json({
      items: articlesList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}/comments:
 *   get:
 *     summary: 获取用户评论列表
 *     description: 获取指定用户的所有评论
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功返回评论列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       articleId:
 *                         type: integer
 *                       articleTitle:
 *                         type: string
 *       404:
 *         description: 用户未找到
 */
router.get('/:id/comments', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    // 检查用户是否存在
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }

    // 获取用户的评论列表，包括文章标题
    const userComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        articleId: comments.articleId,
        articleTitle: articles.title
      })
      .from(comments)
      .leftJoin(articles, eq(comments.articleId, articles.id))
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt));

    res.json({
      items: userComments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/me/avatar:
 *   post:
 *     summary: 上传头像
 *     description: 上传或更新当前用户的头像
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 头像上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 */
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择头像图片' });
    }

    const user = await db
      .select({
        avatarUrl: users.avatarUrl
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }

    // 删除旧头像
    if (user.avatarUrl && !user.avatarUrl.includes('default.png')) {
      const oldAvatarPath = path.join(__dirname, '../..', user.avatarUrl);
      fs.unlink(oldAvatarPath, (err) => {
        if (err) console.error('删除旧头像失败:', err);
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, req.userId!));

    res.json({ avatarUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: 更新用户状态
 *     description: 更新指定用户的状态（仅管理员可操作）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, banned]
 *     responses:
 *       200:
 *         description: 状态更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 用户不存在
 */
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (!req.isAdmin) {
      return res.status(403).json({ message: '无权限' });
    }

    const updatedUser = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();

    res.json(updatedUser[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/me/password:
 *   put:
 *     summary: 修改密码
 *     description: 修改当前用户的密码
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权或当前密码错误
 */
router.put('/me/password', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请提供当前密码和新密码' });
    }
    
    // 验证新密码格式
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(newPassword)) {
      return res.status(400).json({ message: '新密码必须至少8位，且包含字母和数字' });
    }
    
    // 获取用户信息
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .get();
    
    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }
    
    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '当前密码错误' });
    }
    
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, req.userId!));
    
    res.json({ message: '密码修改成功' });
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router; 