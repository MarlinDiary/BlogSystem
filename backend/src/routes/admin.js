import express from 'express';
import { db } from '../db/index.js';
import { and, eq, sql } from 'drizzle-orm';
import { users, articles as articlesTable, comments as commentsTable, articleReactions } from '../db/schema.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 管理员路由中间件
router.use(authMiddleware);
router.use(isAdmin);

// 获取所有用户列表
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
        articleCount: sql`count(distinct ${articlesTable.id})`,
        commentCount: sql`count(distinct ${commentsTable.id})`
      })
      .from(users)
      .leftJoin(articlesTable, eq(articlesTable.authorId, users.id))
      .leftJoin(commentsTable, eq(commentsTable.userId, users.id))
      .groupBy(users.id);

    const formattedUsers = usersWithStats.map(user => ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '',
      hasAvatar: !!user.avatarUrl
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        realName: users.realName,
        dateOfBirth: users.dateOfBirth,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        articleCount: sql`count(distinct ${articlesTable.id})`,
        commentCount: sql`count(distinct ${commentsTable.id})`
      })
      .from(users)
      .leftJoin(articlesTable, eq(articlesTable.authorId, users.id))
      .leftJoin(commentsTable, eq(commentsTable.userId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id)
      .get();

    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

// 删除用户
router.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });

  try {
    await db.transaction(async (tx) => {
      await tx.delete(commentsTable).where(eq(commentsTable.userId, userId));
      await tx.delete(articlesTable).where(eq(articlesTable.authorId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 获取系统统计信息
router.get('/stats', async (req, res) => {
  try {
    // 用户统计
    const [userStats] = await db
      .select({
        totalUsers: sql`count(*)`,
        activeUsers: sql`count(case when status = 'active' then 1 end)`,
        bannedUsers: sql`count(case when status = 'banned' then 1 end)`
      })
      .from(users);

    // 文章统计
    const [articleStats] = await db
      .select({
        totalArticles: sql`count(*)`,
        publishedArticles: sql`count(case when status = 'published' then 1 end)`,
        pendingArticles: sql`count(case when status = 'pending' then 1 end)`,
        totalViews: sql`sum(view_count)`
      })
      .from(articlesTable);

    // 评论统计
    const [commentStats] = await db
      .select({
        totalComments: sql`count(*)`,
        visibleComments: sql`count(case when visibility = 'visible' then 1 end)`,
        hiddenComments: sql`count(case when visibility = 'hidden' then 1 end)`
      })
      .from(commentsTable);

    // 反应统计
    const [reactionStats] = await db
      .select({
        totalReactions: sql`count(*)`
      })
      .from(articleReactions);

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
      reactions: {
        total: reactionStats.totalReactions
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 封禁用户
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

// 解封用户
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

// 获取所有文章列表
router.get('/articles', async (req, res) => {
  try {
    const { status = 'all', page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const conditions = [];
    if (status !== 'all') {
      conditions.push(eq(articlesTable.status, status));
    }

    const [articlesList, total] = await Promise.all([
      db.select({
        id: articlesTable.id,
        title: articlesTable.title,
        content: articlesTable.content,
        status: articlesTable.status,
        viewCount: articlesTable.viewCount,
        createdAt: articlesTable.createdAt,
        author: {
          id: users.id,
          username: users.username
        }
      })
        .from(articlesTable)
        .leftJoin(users, eq(users.id, articlesTable.authorId))
        .where(and(...conditions))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(articlesTable)
        .where(and(...conditions))
    ]);

    res.json({
      items: articlesList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 审核文章
router.patch('/articles/:id/review', async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const { status, reason } = req.body;

    if (!['published', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    if (status === 'rejected' && !reason) {
      return res.status(400).json({ message: '拒绝时必须提供原因' });
    }

    await db
      .update(articlesTable)
      .set({ 
        status,
        reviewReason: reason || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(articlesTable.id, articleId));

    res.json({ message: '文章审核完成' });
  } catch (error) {
    res.status(500).json({ error: '审核文章失败' });
  }
});

// 获取所有评论列表
router.get('/comments', async (req, res) => {
  try {
    const { visibility = 'all', page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const conditions = [];
    if (visibility !== 'all') {
      conditions.push(eq(commentsTable.visibility, visibility));
    }

    const [commentsList, total] = await Promise.all([
      db.select({
        id: commentsTable.id,
        content: commentsTable.content,
        visibility: commentsTable.visibility,
        createdAt: commentsTable.createdAt,
        user: {
          id: users.id,
          username: users.username
        },
        article: {
          id: articlesTable.id,
          title: articlesTable.title
        }
      })
        .from(commentsTable)
        .leftJoin(users, eq(users.id, commentsTable.userId))
        .leftJoin(articlesTable, eq(articlesTable.id, commentsTable.articleId))
        .where(and(...conditions))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(commentsTable)
        .where(and(...conditions))
    ]);

    res.json({
      items: commentsList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: '获取评论列表失败' });
  }
});

// 更新评论可见性
router.patch('/comments/:id/visibility', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { visibility } = req.body;

    if (!['visible', 'hidden'].includes(visibility)) {
      return res.status(400).json({ message: '无效的可见性值' });
    }

    await db
      .update(commentsTable)
      .set({ visibility })
      .where(eq(commentsTable.id, commentId));

    res.json({ message: '评论可见性已更新' });
  } catch (error) {
    res.status(500).json({ error: '更新评论可见性失败' });
  }
});

// 批量删除评论
router.post('/comments/batch-delete', async (req, res) => {
  try {
    const { commentIds } = req.body;
    
    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ message: '请提供要删除的评论ID列表' });
    }

    await db
      .delete(commentsTable)
      .where(sql`id = any(${commentIds})`);

    res.json({ message: '评论已批量删除' });
  } catch (error) {
    res.status(500).json({ error: '批量删除评论失败' });
  }
});

// 批量删除文章
router.post('/articles/batch-delete', async (req, res) => {
  try {
    const { articleIds } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: '请提供要删除的文章ID列表' });
    }

    await db.transaction(async (tx) => {
      // 删除文章的所有点赞
      await tx
        .delete(articleReactions)
        .where(sql`article_id = any(${articleIds})`);
      
      // 删除文章的所有评论
      await tx
        .delete(commentsTable)
        .where(sql`article_id = any(${articleIds})`);
      
      // 获取要删除的文章列表（用于删除封面图）
      const articlesToDelete = await tx
        .select({
          id: articlesTable.id,
          imageUrl: articlesTable.imageUrl
        })
        .from(articlesTable)
        .where(sql`id = any(${articleIds})`);
      
      // 删除文章
      await tx
        .delete(articlesTable)
        .where(sql`id = any(${articleIds})`);

      // 删除封面图文件
      for (const article of articlesToDelete) {
        if (article.imageUrl) {
          const imagePath = path.join(process.cwd(), article.imageUrl);
          fs.unlink(imagePath, (err) => {
            if (err) console.error(`删除文章 ${article.id} 的封面图失败:`, err);
          });
        }
      }
    });

    res.json({ message: '文章已批量删除' });
  } catch (error) {
    res.status(500).json({ error: '批量删除文章失败' });
  }
});

// 提升为管理员
router.post('/users/:id/promote', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
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

// 撤销管理员权限
router.post('/users/:id/demote', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // 检查是否为最后一个管理员
    const adminCount = await db
      .select({ count: sql`count(*)` })
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

// 设置用户角色
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

export { router as adminRouter }; 