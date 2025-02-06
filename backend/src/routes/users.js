import express from 'express';
import { db } from '../db/index.js';
import { users, articles, articleReactions, comments } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// 获取用户列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const [usersList, total] = await Promise.all([
      db.select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        articleCount: sql`count(distinct ${articles.id})`,
        commentCount: sql`count(distinct ${comments.id})`
      })
        .from(users)
        .leftJoin(articles, eq(articles.authorId, users.id))
        .leftJoin(comments, eq(comments.userId, users.id))
        .groupBy(users.id)
        .orderBy(desc(users.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
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
      return res.status(404).json({ message: '用户未找到' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// 更新当前用户信息
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { username, realName, dateOfBirth, bio } = req.body;

    if (username) {
      const existingUser = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.username, username),
            sql`${users.id} != ${req.userId}`
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
      .where(eq(users.id, req.userId))
      .returning();

    res.json(updatedUser[0]);
  } catch (error) {
    next(error);
  }
});

// 删除当前用户账号
router.delete('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId;
    
    const { password, deleteArticles = true, deleteComments = true } = req.body;
    if (!password) {
      return res.status(400).json({ message: '请提供密码以确认删除' });
    }
    
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: '密码错误' });
    }

    await db.transaction(async (tx) => {
      // 删除用户的所有点赞
      await tx
        .delete(articleReactions)
        .where(eq(articleReactions.userId, userId));
      
      if (deleteComments) {
        // 删除用户的所有评论
        await tx
          .delete(comments)
          .where(eq(comments.userId, userId));
      } else {
        // 将评论标记为已删除用户
        await tx
          .update(comments)
          .set({ userId: sql`NULL` })
          .where(eq(comments.userId, userId));
      }
      
      if (deleteArticles) {
        // 删除用户的所有文章
        await tx
          .delete(articles)
          .where(eq(articles.authorId, userId));
      } else {
        // 将文章标记为已删除用户
        await tx
          .update(articles)
          .set({ 
            authorId: sql`NULL`,
            status: 'pending'
          })
          .where(eq(articles.authorId, userId));
      }

      // 删除用户头像文件
      if (user.avatarUrl && !user.avatarUrl.includes('default.png')) {
        const avatarPath = path.join(process.cwd(), user.avatarUrl);
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }
      
      // 最后删除用户账号
      await tx
        .delete(users)
        .where(eq(users.id, userId));
    });

    res.json({ message: '账号删除成功' });
  } catch (error) {
    next(error);
  }
});

// 上传用户头像
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传头像图片' });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId))
      .get();

    if (!user) {
      // 删除上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: '用户未找到' });
    }

    // 如果用户已有头像，删除旧文件
    if (user.avatarUrl && !user.avatarUrl.includes('default.png')) {
      const oldAvatarPath = path.join(process.cwd(), user.avatarUrl);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, req.userId))
      .returning();

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
    // 发生错误时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// 修改密码
router.put('/me/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请提供原密码和新密码' });
    }

    // 验证密码强度
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

    if (!user || !await bcrypt.compare(currentPassword, user.password)) {
      return res.status(401).json({ message: '原密码错误' });
    }

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

// 获取我的文章列表
router.get('/me/articles', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

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
        commentCount: sql`count(distinct ${comments.id})`,
        reactionCount: sql`count(distinct ${articleReactions.id})`
      })
        .from(articles)
        .leftJoin(comments, eq(comments.articleId, articles.id))
        .leftJoin(articleReactions, eq(articleReactions.articleId, articles.id))
        .where(eq(articles.authorId, req.userId))
        .groupBy(articles.id)
        .orderBy(desc(articles.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(articles)
        .where(eq(articles.authorId, req.userId))
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

// 获取用户信息
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
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        articleCount: sql`count(distinct ${articles.id})`,
        commentCount: sql`count(distinct ${comments.id})`
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

// 获取用户文章列表
router.get('/:id/articles', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

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
        commentCount: sql`count(distinct ${comments.id})`,
        reactionCount: sql`count(distinct ${articleReactions.id})`
      })
        .from(articles)
        .leftJoin(comments, eq(comments.articleId, articles.id))
        .leftJoin(articleReactions, eq(articleReactions.articleId, articles.id))
        .where(eq(articles.authorId, userId))
        .groupBy(articles.id)
        .orderBy(desc(articles.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
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

// 获取用户评论列表
router.get('/:id/comments', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    const [commentsList, total] = await Promise.all([
      db.select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        visibility: comments.visibility,
        articleId: articles.id,
        articleTitle: articles.title
      })
        .from(comments)
        .leftJoin(articles, eq(articles.id, comments.articleId))
        .where(eq(comments.userId, userId))
        .orderBy(desc(comments.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(comments)
        .where(eq(comments.userId, userId))
    ]);

    res.json({
      items: commentsList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    next(error);
  }
});

// 获取用户头像
router.get('/:id/avatar', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(404).json({ message: '无效的用户ID' });
    }

    const user = await db
      .select({
        avatarUrl: users.avatarUrl
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const avatarPath = user.avatarUrl 
      ? path.join(process.cwd(), user.avatarUrl)
      : path.join(process.cwd(), '/uploads/avatars/default.png');

    if (!fs.existsSync(avatarPath)) {
      return res.status(404).json({ message: '头像文件不存在' });
    }

    const ext = path.extname(avatarPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.sendFile(avatarPath);
  } catch (error) {
    next(error);
  }
});

// 检查用户状态中间件
export const checkUserStatus = async (req, res, next) => {
  try {
    if (!req.userId) {
      return next();
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId))
      .get();

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    if (user.status === 'banned') {
      const banExpireAt = user.banExpireAt ? new Date(user.banExpireAt) : null;
      if (!banExpireAt || banExpireAt > new Date()) {
        return res.status(403).json({
          message: '账号已被封禁',
          reason: user.banReason,
          expireAt: user.banExpireAt
        });
      } else {
        // 如果封禁已过期，自动解除封禁
        await db
          .update(users)
          .set({
            status: 'active',
            banReason: null,
            banExpireAt: null
          })
          .where(eq(users.id, req.userId));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export { router as usersRouter }; 