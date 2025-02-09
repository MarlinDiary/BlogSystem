import express from 'express';
import { query, get, run, transaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { upload, getUrlPrefix, getUploadRoot } from '../middleware/upload.js';

const router = express.Router();

// 获取用户列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 获取用户列表
    const usersList = await query(`
      SELECT 
        u.id, u.username, u.real_name as realName,
        u.bio, u.avatar_url as avatarUrl, u.role,
        u.created_at as createdAt,
        COUNT(DISTINCT a.id) as articleCount,
        COUNT(DISTINCT c.id) as commentCount
      FROM users u
      LEFT JOIN articles a ON a.author_id = u.id
      LEFT JOIN comments c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [Number(pageSize), offset]);

    // 获取总数
    const [total] = await query(
      'SELECT COUNT(*) as count FROM users'
    );

    res.json({
      items: usersList,
      total: Number(total.count),
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
    const user = await get(`
      SELECT 
        id, username, real_name as realName,
        date_of_birth as dateOfBirth, bio,
        avatar_url as avatarUrl, role,
        created_at as createdAt
      FROM users
      WHERE id = ?
    `, [req.userId]);

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
      const existingUser = await get(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, req.userId]
      );

      if (existingUser) {
        return res.status(400).json({ message: '用户名已被使用' });
      }
    }

    const updateFields = [];
    const params = [];
    
    if (username) {
      updateFields.push('username = ?');
      params.push(username);
    }
    if (realName !== undefined) {
      updateFields.push('real_name = ?');
      params.push(realName);
    }
    if (dateOfBirth !== undefined) {
      updateFields.push('date_of_birth = ?');
      params.push(dateOfBirth);
    }
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      params.push(bio);
    }

    params.push(req.userId);

    await run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    const updatedUser = await get(`
      SELECT 
        id, username, real_name as realName,
        date_of_birth as dateOfBirth, bio,
        avatar_url as avatarUrl, role,
        created_at as createdAt
      FROM users
      WHERE id = ?
    `, [req.userId]);

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// 删除当前用户账号
router.delete('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId;
    console.log('开始删除用户账号:', { userId });
    
    const { password, deleteArticles = true, deleteComments = true } = req.body;
    if (!password) {
      console.log('删除账号失败: 未提供密码');
      return res.status(400).json({ message: '请提供密码以确认删除' });
    }
    
    const user = await get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      console.log('删除账号失败: 用户不存在');
      return res.status(404).json({ message: '用户不存在' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('删除账号失败: 密码错误');
      return res.status(401).json({ message: '密码错误' });
    }

    console.log('开始删除用户数据事务:', { userId, deleteArticles, deleteComments });
    await transaction(async (tx) => {
      try {
        // 先删除用户的所有点赞
        console.log('删除用户点赞');
        await tx.run(
          'DELETE FROM article_reactions WHERE user_id = ?',
          [userId]
        );
        
        // 删除用户的所有评论
        if (deleteComments) {
          console.log('删除用户评论');
          // 先删除子评论
          await tx.run(
            'DELETE FROM comments WHERE parent_id IN (SELECT id FROM comments WHERE user_id = ?)',
            [userId]
          );
          // 再删除用户的评论
          await tx.run(
            'DELETE FROM comments WHERE user_id = ?',
            [userId]
          );
        } else {
          console.log('标记用户评论为已删除');
          // 将评论标记为已删除用户
          await tx.run(
            'UPDATE comments SET user_id = NULL WHERE user_id = ?',
            [userId]
          );
        }
        
        // 删除用户的所有文章
        if (deleteArticles) {
          console.log('删除用户文章');
          // 先删除文章的评论
          await tx.run(
            'DELETE FROM comments WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)',
            [userId]
          );
          // 删除文章的标签关联
          await tx.run(
            'DELETE FROM article_tags WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)',
            [userId]
          );
          // 删除文章的点赞
          await tx.run(
            'DELETE FROM article_reactions WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)',
            [userId]
          );
          // 最后删除文章
          await tx.run(
            'DELETE FROM articles WHERE author_id = ?',
            [userId]
          );
        } else {
          console.log('标记用户文章为已删除');
          // 将文章标记为已删除用户
          await tx.run(
            'UPDATE articles SET author_id = NULL, status = ? WHERE author_id = ?',
            ['pending', userId]
          );
        }

        // 删除用户头像文件
        if (user.avatar_url && !user.avatar_url.includes('default.png')) {
          console.log('删除用户头像文件');
          const avatarPath = path.join(process.cwd(), user.avatar_url);
          if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
          }
        }
        
        console.log('删除用户账号');
        // 最后删除用户账号
        await tx.run(
          'DELETE FROM users WHERE id = ?',
          [userId]
        );

        console.log('用户账号删除成功:', { userId });
      } catch (error) {
        console.error('删除用户数据事务失败:', error);
        throw error;
      }
    });

    res.json({ message: '账号删除成功' });
  } catch (error) {
    console.error('删除账号失败:', error);
    next(error);
  }
});

// 上传用户头像
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传头像图片' });
    }

    const user = await get(
      'SELECT * FROM users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      // 删除上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: '用户未找到' });
    }

    // 如果用户已有头像，删除旧文件
    if (user.avatar_url && !user.avatar_url.includes('default.png')) {
      const oldAvatarPath = path.join(process.cwd(), user.avatar_url);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarUrl = `${getUrlPrefix()}/avatars/${req.file.filename}`;

    await run(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, req.userId]
    );

    const updatedUser = await get(`
      SELECT 
        id, username, real_name as realName,
        date_of_birth as dateOfBirth, bio,
        avatar_url as avatarUrl,
        created_at as createdAt
      FROM users
      WHERE id = ?
    `, [req.userId]);

    res.json(updatedUser);
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
      return res.status(400).json({ message: '当前密码和新密码都是必填项' });
    }

    // 验证新密码强度（至少8位，包含字母和数字）
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(newPassword)) {
      return res.status(400).json({ 
        message: '新密码必须至少8位，且包含字母和数字' 
      });
    }

    const user = await get(
      'SELECT * FROM users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.userId]
    );

    res.json({ message: '密码修改成功' });
  } catch (error) {
    next(error);
  }
});

// 获取用户详情
router.get('/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await get(`
      SELECT 
        u.id, u.username, u.real_name as realName,
        u.bio, u.avatar_url as avatarUrl,
        u.created_at as createdAt,
        COUNT(DISTINCT a.id) as articleCount,
        COUNT(DISTINCT c.id) as commentCount
      FROM users u
      LEFT JOIN articles a ON a.author_id = u.id
      LEFT JOIN comments c ON c.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

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

    const articles = await query(`
      SELECT 
        a.id, a.title, a.content,
        a.image_url as imageUrl, a.status,
        a.view_count as viewCount,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        u.id as author_id,
        u.username as author_username,
        u.avatar_url as author_avatarUrl,
        COUNT(DISTINCT c.id) as commentCount,
        COUNT(DISTINCT ar.id) as reactionCount
      FROM articles a
      LEFT JOIN users u ON u.id = a.author_id
      LEFT JOIN comments c ON c.article_id = a.id
      LEFT JOIN article_reactions ar ON ar.article_id = a.id
      WHERE a.author_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, Number(pageSize), offset]);

    const [total] = await query(
      'SELECT COUNT(*) as count FROM articles WHERE author_id = ?',
      [userId]
    );

    // 格式化文章数据
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      imageUrl: article.imageUrl,
      status: article.status,
      viewCount: article.viewCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      author: {
        id: article.author_id,
        username: article.author_username,
        avatarUrl: article.author_avatarUrl
      },
      commentCount: Number(article.commentCount),
      reactionCount: Number(article.reactionCount)
    }));

    res.json({
      items: formattedArticles,
      total: Number(total.count),
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

    const user = await get(`
      SELECT 
        avatar_url as avatarUrl
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const uploadRoot = getUploadRoot();
    const defaultAvatarPath = path.join(uploadRoot, 'avatars', 'default.png');
    const avatarPath = user.avatarUrl 
      ? path.join(uploadRoot, user.avatarUrl.replace('/uploads/', ''))
      : defaultAvatarPath;

    if (!fs.existsSync(avatarPath)) {
      return res.status(404).json({ message: '头像文件不存在' });
    }

    const ext = path.extname(avatarPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.sendFile(path.resolve(avatarPath));
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

    const comments = await query(`
      SELECT 
        c.id, c.content, c.created_at as createdAt,
        c.visibility, a.id as articleId, a.title as articleTitle
      FROM comments c
      LEFT JOIN articles a ON a.id = c.article_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, Number(pageSize), offset]);

    const [total] = await query(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ?',
      [userId]
    );

    // 格式化评论数据
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      visibility: comment.visibility,
      articleId: comment.articleId,
      articleTitle: comment.articleTitle
    }));

    res.json({
      items: formattedComments,
      total: Number(total.count),
      page: Number(page),
      pageSize: Number(pageSize)
    });
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

    const user = await get(`
      SELECT 
        id, status, ban_expire_at as banExpireAt,
        ban_reason as banReason
      FROM users
      WHERE id = ?
    `, [req.userId]);

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
        await run(
          'UPDATE users SET status = ?, ban_reason = NULL, ban_expire_at = NULL WHERE id = ?',
          ['active', req.userId]
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export { router as usersRouter }; 