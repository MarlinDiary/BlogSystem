import { Router } from 'express';
import { db } from '../db';
import { and, eq, sql } from 'drizzle-orm';
import { users, articles, comments, articleLikes } from '../db/schema';
import { isAdmin, authMiddleware } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = Router();

// 所有管理员路由都需要身份验证和管理员权限
router.use(authMiddleware);
router.use(isAdmin);

// 获取所有用户列表（优化为 Java Swing 显示）
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

// 获取单个用户详情
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

// 删除用户
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

// 获取站点统计数据
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

// 审核文章
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

// 删除文章（管理员权限）
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

// 删除评论（管理员权限）
router.delete('/comments/:id', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    
    if (isNaN(commentId)) {
      return res.status(400).json({ message: '无效的评论ID' });
    }

    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    res.json({ message: '评论已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除评论失败' });
  }
});

// 批量删除评论（管理员权限）
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

// 批量删除文章（管理员权限）
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

// 提升为管理员
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

// 撤销管理员权限
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

// 设置/撤销管理员权限
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