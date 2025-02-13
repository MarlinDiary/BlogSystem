import express from 'express';
import { query, get, run, transaction } from '../db/index.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

//use the middleware
router.use(authMiddleware);
router.use(isAdmin);

//get all users
router.get('/users', async (req, res) => {
  try {
    const users = await query(
        `SELECT 
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
      ORDER BY u.created_at DESC`);

      //format the data
    const usersWithStats = users.map(user => 
        ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '',
      banExpireAt: user.banExpireAt ? new Date(user.banExpireAt).toLocaleString('zh-CN') : null,
      hasAvatar: !!user.avatarUrl
    })
);

    res.json(usersWithStats);

  } catch (error) {
    res.status(500).json({ error: 'Fail to get users.' });
  }
});


//get user by id
router.get('/users/:id', async (req, res) => {
  try {
    //get the user id, if it is not a number, return 400
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

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
      GROUP BY u.id`,
       [userId]);

    if (!user) 
        return res.status(404).json({ error: "User doesn't exists." });

    res.json(user);

  } catch (error) {
    res.status(500).json({ error: 'Fail to get user detail.' });
  }
});


//delete user by id
router.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

  try {
    console.log(`开始删除用户 ID: ${userId}`);
    
    // 检查用户是否存在
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.log(`用户 ${userId} 不存在`);
      return res.status(404).json({ error: "User doesn't exist." });
    }

    // 检查是否试图删除最后一个管理员
    if (user.role === 'admin') {
      const [adminCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount.count <= 1) {
        console.log('尝试删除最后一个管理员');
        return res.status(400).json({ error: "Cannot delete the last admin user." });
      }
    }

    try {
      await transaction(async (tx) => {
        console.log('开始事务');
        
        // 1. 删除用户的所有文章反应
        await tx.run(
          'DELETE FROM article_reactions WHERE user_id = ?',
          [userId]
        );
        console.log('已删除用户的文章反应');

        // 2. 删除用户文章的所有反应
        await tx.run(
          'DELETE FROM article_reactions WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)',
          [userId]
        );
        console.log('已删除用户文章的反应');

        // 3. 删除用户文章的标签关联
        await tx.run(
          'DELETE FROM article_tags WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)',
          [userId]
        );
        console.log('已删除用户文章的标签关联');

        // 4. 递归删除所有评论及其子评论
        // 4.1 首先获取所有相关评论ID
        const userComments = await tx.query(
          'WITH RECURSIVE comment_tree AS (SELECT id FROM comments WHERE user_id = ? UNION ALL SELECT c.id FROM comments c JOIN comment_tree ct ON c.parent_id = ct.id) SELECT id FROM comment_tree',
          [userId]
        );
        
        if (userComments.length > 0) {
          const commentIds = userComments.map(c => c.id);
          // 4.2 删除这些评论
          await tx.run(
            'DELETE FROM comments WHERE id IN (' + commentIds.join(',') + ')'
          );
          console.log('已删除用户的所有评论及其子评论');
        }

        // 5. 删除用户文章的所有评论
        await tx.run(
          'DELETE FROM comments WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)',
          [userId]
        );
        console.log('已删除用户文章的评论');

        // 6. 删除用户的所有文章
        await tx.run(
          'DELETE FROM articles WHERE author_id = ?',
          [userId]
        );
        console.log('已删除用户的文章');

        // 7. 删除用户的头像文件（如果有）
        if (user.avatar_url && !user.avatar_url.includes('default.png')) {
          console.log('删除用户头像');
          try {
            const avatarPath = path.join(process.cwd(), user.avatar_url);
            if (fs.existsSync(avatarPath)) {
              fs.unlinkSync(avatarPath);
            }
          } catch (fileError) {
            console.error('删除头像文件失败:', fileError);
            // 继续执行，不中断事务
          }
        }
        
        // 8. 删除管理员记录（如果存在）
        console.log('删除管理员记录');
        await tx.run('DELETE FROM admin_users WHERE user_id = ?', [userId]);
        
        // 9. 最后删除用户本身
        console.log('删除用户记录');
        await tx.run('DELETE FROM users WHERE id = ?', [userId]);
        
        console.log('事务完成');
      });

      console.log(`用户 ${userId} 删除成功`);
      res.json({ message: 'Successfully deleted user.' });

    } catch (txError) {
      console.error('事务执行错误:', txError);
      throw txError;
    }

  } catch (error) {
    console.error('删除用户时发生错误:', error);
    res.status(500).json({ 
      error: 'Failed to delete user.',
      details: error.message 
    });
  }
});

//get the statistics
router.get('/stats', async (req, res) => {
  try {
    //the query function will always return an array
    // userStats
    const [userStats]=await query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeUsers,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as bannedUsers
      FROM users`);

    //articleStats
    const [articleStats] = await query(`
      SELECT 
        COUNT(*) as totalArticles,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as publishedArticles,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingArticles,
        SUM(view_count) as totalViews
      FROM articles
    `);

    //commentStats
    const [commentStats] = await query(`
      SELECT 
        COUNT(*) as totalComments,
        COUNT(CASE WHEN visibility = 'visible' THEN 1 END) as visibleComments,
        COUNT(CASE WHEN visibility = 'hidden' THEN 1 END) as hiddenComments
      FROM comments
    `);

    // reactionStats
    const [reactionStats] = await query(`
      SELECT COUNT(*) as totalReactions
      FROM article_reactions
    `);

    //format the stats
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
      }});

  } catch (error) {
    res.status(500).json({ error: "Fail to get stats." });
  }

});

// ban user by id
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { reason, durationInHours } = req.body; 

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

    if (!reason||!durationInHours) {
      return res.status(400).json({ message: "Please provide both reason and duration" });
    }

    //ban_expire_at
    const banExpireAt = new Date(Date.now() + durationInHours * 60 * 60 * 1000).toISOString();

    await run(`UPDATE users 
      SET status = 'banned',
          ban_reason = ?,
          ban_expire_at = ?
      WHERE id = ?`, [reason, banExpireAt, userId]);

    res.json({ message: 'The user has been banned.' });

  } catch (error) {
    res.status(500).json({ error: 'Fail to ban user.' });
  }

});

// unban user by id
router.post('/users/:id/unban', async (req, res) => {
  try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

    await run(`UPDATE users 
            SET status = 'active',
          ban_reason = NULL,
          ban_expire_at = NULL
      WHERE id = ?`, [userId]);

    res.json({ message: 'The user has been unbanned.' });

  } catch (error) {
    res.status(500).json({ error: 'Fail to unban user.' });
  }

});

//promote user to admin
router.post('/users/:id/promote', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    //if the id is not a number, return 400
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

    const user = await get('SELECT role FROM users WHERE id = ?', [userId]);

    //if the user doesn't exist, return 404
    if(!user) return res.status(404).json({ error: "User doesn't exists." });

    await run(`UPDATE users 
      SET role = 'admin'
      WHERE id = ?`, [userId]);

    res.json({ message: 'The user has been promoted to admin.' });

  } catch (error) {
    res.status(500).json({ error: "Fail to promote user." });
  }

});

//demote admin to user
router.post('/users/:id/demote', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

    const user = await get('SELECT role FROM users WHERE id = ?', [userId]);

    if(!user) return res.status(404).json({ error: "User doesn't exists." });


    //calculate the number of admins. If there is only one admin, return 400
    const [adminCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');

    if(adminCount.count <= 1) {
      return res.status(400).json({ error: "There must be at least one admin." });
    }

    await run(`UPDATE users 
      SET role = 'user'
      WHERE id = ?`, [userId]);

    res.json({ message: 'The user has been demoted to user.' });

  } catch (error) {
    res.status(500).json({ error: "Fail to demote user." });
  }

});


//set the role of the user
router.post('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid Id. The Id must be an interger.' });

    const { role } = req.body;

    //The role must either be 'admin' or 'user.'
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: "The role must either be 'admin' or 'user.' " });

    const user = await get('SELECT role FROM users WHERE id = ?', [userId]);

    if(!user) return res.status(404).json({ error: "User doesn't exists." });

    await run(`UPDATE users 
      SET role = ?
      WHERE id = ?`, [role, userId]);

    if(role === 'admin') {
        res.json({ message: 'The user has been promoted to admin.' });
      } else {
        res.json({ message: 'The user has been demoted to user.' });
      }

  } catch (error) {
    res.status(500).json({ error: "Fail to update role." });
  }

});

// 获取所有文章
router.get('/articles', async (req, res) => {
  try {
    const articles = await query(`
      SELECT 
        a.id, a.title, SUBSTRING(a.content, 1, 200) as content,
        a.status, a.view_count as viewCount,
        a.created_at as createdAt,
        u.username as authorUsername,
        COUNT(DISTINCT c.id) as commentCount
      FROM articles a
      LEFT JOIN users u ON u.id = a.author_id
      LEFT JOIN comments c ON c.article_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC`);

    const formattedArticles = articles.map(article => ({
      ...article,
      createdAt: new Date(article.createdAt).toLocaleString('zh-CN')
    }));

    res.json(formattedArticles);
  } catch (error) {
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 删除文章
router.delete('/articles/:id', async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return res.status(400).json({ error: '无效的文章ID' });
    }

    const article = await get('SELECT * FROM articles WHERE id = ?', [articleId]);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    await transaction(async (tx) => {
      // 删除文章相关的所有数据
      await tx.run('DELETE FROM article_tags WHERE article_id = ?', [articleId]);
      await tx.run('DELETE FROM article_reactions WHERE article_id = ?', [articleId]);
      await tx.run('DELETE FROM comments WHERE article_id = ?', [articleId]);
      await tx.run('DELETE FROM articles WHERE id = ?', [articleId]);
    });

    res.json({ message: '文章删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除文章失败' });
  }
});

// 获取所有评论
router.get('/comments', async (req, res) => {
  try {
    const comments = await query(`
      SELECT 
        c.id, c.content,
        c.created_at as createdAt,
        u.username as authorUsername,
        a.title as articleTitle
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN articles a ON a.id = c.article_id
      ORDER BY c.created_at DESC`);

    const formattedComments = comments.map(comment => ({
      ...comment,
      createdAt: new Date(comment.createdAt).toLocaleString('zh-CN')
    }));

    res.json(formattedComments);
  } catch (error) {
    res.status(500).json({ error: '获取评论列表失败' });
  }
});

// 删除评论
router.delete('/comments/:id', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: '无效的评论ID' });
    }

    const comment = await get('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    await run('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: '评论删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除评论失败' });
  }
});

export { router as adminRouter }; 