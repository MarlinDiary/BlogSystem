import { Router } from 'express';
import { db } from '../db';
import { and, eq, sql } from 'drizzle-orm';
import { users, articles, comments, articleLikes } from '../db/schema';
import { isAdmin, authMiddleware } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminStats:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             active:
 *               type: integer
 *             banned:
 *               type: integer
 *         articles:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             published:
 *               type: integer
 *             pending:
 *               type: integer
 *             totalViews:
 *               type: integer
 *         comments:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             visible:
 *               type: integer
 *             hidden:
 *               type: integer
 *         likes:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 */

const router = Router();

// 所有管理员路由都需要身份验证和管理员权限
router.use(authMiddleware);
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 获取所有用户列表
 *     description: 获取系统中所有用户的详细信息（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.get('/users', async (req, res) => {
  try {
    const usersWithStats = await db
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
      .groupBy(users.id);

    // 格式化数据以适应 JTable 显示
    const formattedUsers = usersWithStats.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt).toLocaleString('zh-CN'),
      hasAvatar: !!user.avatarUrl
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     description: 获取指定用户的详细信息（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功返回用户详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 用户不存在
 */
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
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
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: 删除用户
 *     description: 删除指定用户及其相关数据（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 用户不存在
 */
router.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId)) {
    return res.status(400).json({ error: '无效的用户ID' });
  }

  try {
    await db.transaction(async (tx) => {
      // 删除用户的评论
      await tx.delete(comments).where(eq(comments.userId, userId));
      
      // 删除用户的文章
      await tx.delete(articles).where(eq(articles.authorId, userId));
      
      // 删除用户
      await tx.delete(users).where(eq(users.id, userId));
    });
    
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除用户失败' });
  }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: 获取系统统计信息
 *     description: 获取系统的各项统计数据（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回统计信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.get('/stats', async (req, res) => {
  try {
    // 用户统计
    const [userStats] = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        activeUsers: sql<number>`count(case when status = 'active' then 1 end)`,
        bannedUsers: sql<number>`count(case when status = 'banned' then 1 end)`
      })
      .from(users);

    // 文章统计
    const [articleStats] = await db
      .select({
        totalArticles: sql<number>`count(*)`,
        publishedArticles: sql<number>`count(case when status = 'published' then 1 end)`,
        pendingArticles: sql<number>`count(case when status = 'pending' then 1 end)`,
        totalViews: sql<number>`sum(view_count)`
      })
      .from(articles);

    // 评论统计
    const [commentStats] = await db
      .select({
        totalComments: sql<number>`count(*)`,
        visibleComments: sql<number>`count(case when visibility = 1 then 1 end)`,
        hiddenComments: sql<number>`count(case when visibility = 0 then 1 end)`
      })
      .from(comments);

    // 点赞统计
    const [likeStats] = await db
      .select({
        totalLikes: sql<number>`count(*)`
      })
      .from(articleLikes);

    res.json({
      users: {
        total: userStats.totalUsers,
        active: userStats.activeUsers,
        banned: userStats.bannedUsers
      },
      articles: {
        total: articleStats.totalArticles,
        published: articleStats.publishedArticles,
        pending: articleStats.pendingArticles,
        totalViews: articleStats.totalViews || 0
      },
      comments: {
        total: commentStats.totalComments,
        visible: commentStats.visibleComments,
        hidden: commentStats.hiddenComments
      },
      likes: {
        total: likeStats.totalLikes
      }
    });
  } catch (error) {
    console.error('统计数据查询失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/ban:
 *   post:
 *     summary: 封禁用户
 *     description: 封禁指定用户（管理员专用）
 *     tags: [Admin]
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
 *               - reason
 *               - duration
 *             properties:
 *               reason:
 *                 type: string
 *                 description: 封禁原因
 *               duration:
 *                 type: integer
 *                 description: 封禁时长（小时）
 *     responses:
 *       200:
 *         description: 用户封禁成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration in hours
    const userId = parseInt(req.params.id);

    if (!reason || !duration) {
      return res.status(400).json({ message: '请提供封禁原因和时长' });
    }

    const banExpireAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

    await db
      .update(users)
      .set({ 
        status: 'banned',
        banReason: reason,
        banExpireAt
      })
      .where(eq(users.id, userId));

    res.json({ message: '用户已被封禁' });
  } catch (error) {
    res.status(500).json({ error: '封禁用户失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/unban:
 *   post:
 *     summary: 解封用户
 *     description: 解除指定用户的封禁状态（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户解封成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.post('/users/:id/unban', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    await db
      .update(users)
      .set({ 
        status: 'active',
        banReason: null,
        banExpireAt: null
      })
      .where(eq(users.id, userId));

    res.json({ message: '用户已解封' });
  } catch (error) {
    res.status(500).json({ error: '解封用户失败' });
  }
});

/**
 * @swagger
 * /api/admin/articles:
 *   get:
 *     summary: 获取所有文章列表
 *     description: 获取系统中所有文章的详细信息（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, pending, rejected]
 *         description: 文章状态过滤
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
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.get('/articles', async (req, res) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/admin/articles/{id}:
 *   get:
 *     summary: 获取文章详情
 *     description: 获取指定文章的详细信息（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *     responses:
 *       200:
 *         description: 成功返回文章详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 文章不存在
 */
router.get('/articles/:id', async (req, res) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/admin/comments:
 *   get:
 *     summary: 获取所有评论列表
 *     description: 获取系统中所有评论的详细信息（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: 评论可见性过滤
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
 *         description: 成功返回评论列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.get('/comments', async (req, res) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/admin/comments/{id}:
 *   delete:
 *     summary: 删除评论
 *     description: 删除指定评论（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 评论ID
 *     responses:
 *       200:
 *         description: 评论删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 评论不存在
 */
router.delete('/comments/:id', async (req, res) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/admin/comments/{id}/visibility:
 *   patch:
 *     summary: 更新评论可见性
 *     description: 更新指定评论的可见性（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 评论ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - visibility
 *             properties:
 *               visibility:
 *                 type: integer
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: 可见性更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 评论不存在
 */
router.patch('/comments/:id/visibility', async (req, res) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/admin/articles/{id}/review:
 *   post:
 *     summary: 审核文章
 *     description: 审核指定文章（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
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
 *                 enum: [published, rejected]
 *               reason:
 *                 type: string
 *                 description: 审核意见（拒绝时必填）
 *     responses:
 *       200:
 *         description: 文章审核成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.post('/articles/:id/review', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const articleId = parseInt(req.params.id);

    if (!['published', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的审核状态' });
    }

    await db
      .update(articles)
      .set({ 
        status,
        reviewedAt: new Date().toISOString(),
        reviewReason: reason || null
      })
      .where(eq(articles.id, articleId));

    res.json({ message: '文章审核完成' });
  } catch (error) {
    res.status(500).json({ error: '审核文章失败' });
  }
});

/**
 * @swagger
 * /api/admin/articles/{id}:
 *   delete:
 *     summary: 删除文章
 *     description: 删除指定文章及其相关数据（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *     responses:
 *       200:
 *         description: 文章删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.delete('/articles/:id', async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    
    if (isNaN(articleId)) {
      return res.status(400).json({ message: '无效的文章ID' });
    }

    // 开启事务以确保数据一致性
    await db.transaction(async (tx) => {
      // 删除文章的所有点赞
      await tx
        .delete(articleLikes)
        .where(eq(articleLikes.articleId, articleId));
      
      // 删除文章的所有评论
      await tx
        .delete(comments)
        .where(eq(comments.articleId, articleId));
      
      // 删除文章
      const article = await tx
        .delete(articles)
        .where(eq(articles.id, articleId))
        .returning();

      // 如果文章有封面图，删除封面图文件
      if (article[0]?.imageUrl) {
        const imagePath = path.join(__dirname, '../../uploads/covers', 
          path.basename(article[0].imageUrl));
        fs.unlink(imagePath, (err) => {
          if (err) console.error('删除封面图失败:', err);
        });
      }
    });

    res.json({ message: '文章已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除文章失败' });
  }
});

/**
 * @swagger
 * /api/admin/comments/batch-delete:
 *   post:
 *     summary: 批量删除评论
 *     description: 批量删除多个评论（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commentIds
 *             properties:
 *               commentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: 评论批量删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.post('/comments/batch-delete', async (req, res) => {
  try {
    const { commentIds } = req.body;
    
    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ message: '请提供要删除的评论ID列表' });
    }

    await db
      .delete(comments)
      .where(sql`id = any(${commentIds})`);

    res.json({ message: '评论已批量删除' });
  } catch (error) {
    res.status(500).json({ error: '批量删除评论失败' });
  }
});

/**
 * @swagger
 * /api/admin/articles/batch-delete:
 *   post:
 *     summary: 批量删除文章
 *     description: 批量删除多篇文章及其相关数据（管理员专用）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articleIds
 *             properties:
 *               articleIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: 文章批量删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.post('/articles/batch-delete', async (req, res) => {
  try {
    const { articleIds } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: '请提供要删除的文章ID列表' });
    }

    // 开启事务以确保数据一致性
    await db.transaction(async (tx) => {
      // 删除文章的所有点赞
      await tx
        .delete(articleLikes)
        .where(sql`article_id = any(${articleIds})`);
      
      // 删除文章的所有评论
      await tx
        .delete(comments)
        .where(sql`article_id = any(${articleIds})`);
      
      // 获取要删除的文章列表（用于删除封面图）
      const articlesToDelete = await tx
        .select({
          id: articles.id,
          imageUrl: articles.imageUrl
        })
        .from(articles)
        .where(sql`id = any(${articleIds})`);
      
      // 删除文章
      await tx
        .delete(articles)
        .where(sql`id = any(${articleIds})`);

      // 删除封面图文件
      articlesToDelete.forEach(article => {
        if (article.imageUrl) {
          const imagePath = path.join(__dirname, '../../uploads/covers', 
            path.basename(article.imageUrl));
          fs.unlink(imagePath, (err) => {
            if (err) console.error(`删除文章 ${article.id} 的封面图失败:`, err);
          });
        }
      });
    });

    res.json({ message: '文章已批量删除' });
  } catch (error) {
    res.status(500).json({ error: '批量删除文章失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/promote:
 *   post:
 *     summary: 提升为管理员
 *     description: 将指定用户提升为管理员（仅超级管理员可操作）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功设置为管理员
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 用户不存在
 */
router.post('/users/:id/promote', isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // 检查用户是否存在
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();
      
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, userId));

    res.json({ message: '已成功设置为管理员' });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/demote:
 *   post:
 *     summary: 撤销管理员权限
 *     description: 撤销指定用户的管理员权限（仅超级管理员可操作）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功撤销管理员权限
 *       400:
 *         description: 系统必须保留至少一个管理员
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 */
router.post('/users/:id/demote', isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // 检查是否为最后一个管理员
    const adminCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'admin'));
      
    if (adminCount[0].count <= 1) {
      return res.status(400).json({ message: '系统必须保留至少一个管理员' });
    }

    await db
      .update(users)
      .set({ role: 'user' })
      .where(eq(users.id, userId));

    res.json({ message: '已成功撤销管理员权限' });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: 设置用户角色
 *     description: 设置或修改用户的角色（管理员/普通用户）
 *     tags: [Admin]
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: 用户角色
 *     responses:
 *       200:
 *         description: 角色设置成功
 *       400:
 *         description: 无效的角色类型
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 用户不存在
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: '无效的角色类型' });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId));

    res.json({ message: `已${role === 'admin' ? '设置' : '撤销'}管理员权限` });
  } catch (error) {
    res.status(500).json({ message: '更新用户角色失败' });
  }
});

export default router; 