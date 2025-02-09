import express from 'express';
import { query, get, run, transaction } from '../db/index.js';
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
    const usersWithStats = await query(`
      SELECT 
        u.id, u.username, u.real_name as realName,
        u.date_of_birth as dateOfBirth, u.bio,
        u.avatar_url as avatarUrl,
        u.created_at as createdAt,
        u.status,
        u.ban_reason as banReason,
        u.ban_expire_at as banExpireAt,
        COUNT(DISTINCT a.id) as articleCount,
        COUNT(DISTINCT c.id) as commentCount
      FROM users u
      LEFT JOIN articles a ON a.author_id = u.id
      LEFT JOIN comments c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const formattedUsers = usersWithStats.map(user => ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '',
      banExpireAt: user.banExpireAt ? new Date(user.banExpireAt).toLocaleString('zh-CN') : null,
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

    const user = await get(`
      SELECT 
        u.id, u.username, u.real_name as realName,
        u.date_of_birth as dateOfBirth, u.bio,
        u.avatar_url as avatarUrl,
        u.created_at as createdAt,
        COUNT(DISTINCT a.id) as articleCount,
        COUNT(DISTINCT c.id) as commentCount
      FROM users u
      LEFT JOIN articles a ON a.author_id = u.id
      LEFT JOIN comments c ON c.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

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
    await transaction(async (tx) => {
      await tx.run('DELETE FROM comments WHERE user_id = ?', [userId]);
      await tx.run('DELETE FROM articles WHERE author_id = ?', [userId]);
      await tx.run('DELETE FROM users WHERE id = ?', [userId]);
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
    const [userStats] = await query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeUsers,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as bannedUsers
      FROM users
    `);

    // 文章统计
    const [articleStats] = await query(`
      SELECT 
        COUNT(*) as totalArticles,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as publishedArticles,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingArticles,
        SUM(view_count) as totalViews
      FROM articles
    `);

    // 评论统计
    const [commentStats] = await query(`
      SELECT 
        COUNT(*) as totalComments,
        COUNT(CASE WHEN visibility = 'visible' THEN 1 END) as visibleComments,
        COUNT(CASE WHEN visibility = 'hidden' THEN 1 END) as hiddenComments
      FROM comments
    `);

    // 反应统计
    const [reactionStats] = await query(`
      SELECT COUNT(*) as totalReactions
      FROM article_reactions
    `);

    res.json({
      users: {
        total: Number(userStats.totalUsers),
        active: Number(userStats.activeUsers),
        banned: Number(userStats.bannedUsers)
      },
      articles: {
        total: Number(articleStats.totalArticles),
        published: Number(articleStats.publishedArticles),
        pending: Number(articleStats.pendingArticles),
        totalViews: Number(articleStats.totalViews || 0)
      },
      comments: {
        total: Number(commentStats.totalComments),
        visible: Number(commentStats.visibleComments),
        hidden: Number(commentStats.hiddenComments)
      },
      reactions: {
        total: Number(reactionStats.totalReactions)
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

    await run(`
      UPDATE users 
      SET status = 'banned',
          ban_reason = ?,
          ban_expire_at = ?
      WHERE id = ?
    `, [reason, banExpireAt, userId]);

    res.json({ message: '用户已被封禁' });
  } catch (error) {
    res.status(500).json({ error: '封禁用户失败' });
  }
});

// 解封用户
router.post('/users/:id/unban', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    await run(`
      UPDATE users 
      SET status = 'active',
          ban_reason = NULL,
          ban_expire_at = NULL
      WHERE id = ?
    `, [userId]);

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

    let query = `
      SELECT 
        a.id, a.title, a.content, a.status,
        a.view_count as viewCount,
        a.created_at as createdAt,
        u.id as author_id,
        u.username as author_username
      FROM articles a
      LEFT JOIN users u ON u.id = a.author_id
    `;

    const countQuery = 'SELECT COUNT(*) as count FROM articles';
    const params = [];
    const countParams = [];

    if (status !== 'all') {
      query += ' WHERE a.status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
      countParams.push(status);
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(pageSize), offset);

    const [articlesList, [total]] = await Promise.all([
      query(query, params),
      query(countQuery, countParams)
    ]);

    const formattedArticles = articlesList.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status,
      viewCount: article.viewCount,
      createdAt: article.createdAt,
      author: {
        id: article.author_id,
        username: article.author_username
      }
    }));

    res.json({
      items: formattedArticles,
      total: Number(total.count),
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

    await run(`
      UPDATE articles 
      SET status = ?,
          review_reason = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      status,
      reason || null,
      new Date().toISOString(),
      new Date().toISOString(),
      articleId
    ]);

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

    let query = `
      SELECT 
        c.id, c.content, c.visibility,
        c.created_at as createdAt,
        u.id as user_id,
        u.username as user_username,
        a.id as article_id,
        a.title as article_title
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN articles a ON a.id = c.article_id
    `;

    const countQuery = 'SELECT COUNT(*) as count FROM comments';
    const params = [];
    const countParams = [];

    if (visibility !== 'all') {
      query += ' WHERE c.visibility = ?';
      countQuery += ' WHERE visibility = ?';
      params.push(visibility);
      countParams.push(visibility);
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(pageSize), offset);

    const [commentsList, [total]] = await Promise.all([
      query(query, params),
      query(countQuery, countParams)
    ]);

    const formattedComments = commentsList.map(comment => ({
      id: comment.id,
      content: comment.content,
      visibility: comment.visibility,
      createdAt: comment.createdAt,
      user: {
        id: comment.user_id,
        username: comment.user_username
      },
      article: {
        id: comment.article_id,
        title: comment.article_title
      }
    }));

    res.json({
      items: formattedComments,
      total: Number(total.count),
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

    await run(`
      UPDATE comments 
      SET visibility = ?
      WHERE id = ?
    `, [visibility, commentId]);

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

    const placeholders = commentIds.map(() => '?').join(',');
    await run(
      `DELETE FROM comments WHERE id IN (${placeholders})`,
      commentIds
    );

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

    const placeholders = articleIds.map(() => '?').join(',');

    await transaction(async (tx) => {
      // 删除文章的所有点赞
      await tx.run(
        `DELETE FROM article_reactions WHERE article_id IN (${placeholders})`,
        articleIds
      );
      
      // 删除文章的所有评论
      await tx.run(
        `DELETE FROM comments WHERE article_id IN (${placeholders})`,
        articleIds
      );
      
      // 获取要删除的文章列表（用于删除封面图）
      const articlesToDelete = await tx.query(
        `SELECT id, image_url as imageUrl FROM articles WHERE id IN (${placeholders})`,
        articleIds
      );
      
      // 删除文章
      await tx.run(
        `DELETE FROM articles WHERE id IN (${placeholders})`,
        articleIds
      );

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
    
    const user = await get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
      
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await run(
      'UPDATE users SET role = ? WHERE id = ?',
      ['admin', userId]
    );

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
    const [adminCount] = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );
      
    if (adminCount.count <= 1) {
      return res.status(400).json({ message: '系统必须保留至少一个管理员' });
    }

    await run(
      'UPDATE users SET role = ? WHERE id = ?',
      ['user', userId]
    );

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

    const user = await get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await run(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );

    res.json({ message: `已${role === 'admin' ? '设置' : '撤销'}管理员权限` });
  } catch (error) {
    res.status(500).json({ message: '更新用户角色失败' });
  }
});

export { router as adminRouter }; 