import express from 'express';
import { query, get, run, transaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 获取文章评论
router.get('/article/:articleId', async (req, res, next) => {
  try {
    const allComments = await query(`
      SELECT 
        c.id, c.content, c.created_at as createdAt,
        c.parent_id as parentId, c.visibility,
        u.id as user_id, u.username, u.avatar_url as avatarUrl
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.article_id = ?
    `, [parseInt(req.params.articleId)]);
    
    // 格式化评论数据
    const formattedComments = allComments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      visibility: comment.visibility,
      user: {
        id: comment.user_id,
        username: comment.username,
        avatarUrl: comment.avatarUrl
      }
    }));
    
    const rootComments = buildCommentTree(formattedComments);
    res.json(rootComments);
  } catch (error) {
    next(error);
  }
});

// 创建评论
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { articleId, content, parentId } = req.body;
    const userId = req.userId;

    if (parentId) {
      const parentComment = await get(
        'SELECT * FROM comments WHERE id = ?',
        [parentId]
      );

      if (!parentComment) {
        return res.status(404).json({ message: '父评论不存在' });
      }

      const level = await getCommentLevel(parentId);
      if (level >= 3) {
        return res.status(400).json({ message: '评论嵌套层级不能超过3级' });
      }
    }

    const result = await run(
      `INSERT INTO comments (article_id, user_id, content, parent_id, created_at, visibility)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'visible')`,
      [articleId, userId, content, parentId]
    );

    // 获取新创建的评论（包括用户信息）
    const [newComment] = await query(
      `SELECT 
        c.id, c.content, c.created_at as createdAt,
        c.parent_id as parentId, c.visibility,
        u.id as user_id, u.username, u.avatar_url as avatarUrl
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [result.lastID]
    );

    // 格式化评论数据
    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      createdAt: newComment.createdAt,
      parentId: newComment.parentId,
      visibility: newComment.visibility,
      user: {
        id: newComment.user_id,
        username: newComment.username,
        avatarUrl: newComment.avatarUrl
      }
    };

    res.status(201).json(formattedComment);
  } catch (error) {
    next(error);
  }
});

// 切换评论可见性
router.patch('/:id/visibility', authMiddleware, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId;

    const comment = await get(
      'SELECT c.*, a.author_id FROM comments c LEFT JOIN articles a ON a.id = c.article_id WHERE c.id = ?',
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    const currentUser = await get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!currentUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isAdmin = currentUser.role === 'admin';
    const isAuthor = comment.author_id === userId;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权限修改此评论' });
    }

    const newVisibility = comment.visibility === 'visible' ? 'hidden' : 'visible';
    
    await run(
      'UPDATE comments SET visibility = ? WHERE id = ?',
      [newVisibility, commentId]
    );

    // 获取更新后的评论（包括用户信息）
    const [updatedComment] = await query(
      `SELECT 
        c.id, c.content, c.created_at as createdAt,
        c.parent_id as parentId, c.visibility,
        u.id as user_id, u.username, u.avatar_url as avatarUrl
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [commentId]
    );

    // 格式化评论数据
    const formattedComment = {
      id: updatedComment.id,
      content: updatedComment.content,
      createdAt: updatedComment.createdAt,
      parentId: updatedComment.parentId,
      visibility: updatedComment.visibility,
      user: {
        id: updatedComment.user_id,
        username: updatedComment.username,
        avatarUrl: updatedComment.avatarUrl
      }
    };

    res.json(formattedComment);
  } catch (error) {
    next(error);
  }
});

// 获取单个评论
router.get('/:id', async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = await get(
      'SELECT * FROM comments WHERE id = ?',
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    res.json(comment);
  } catch (error) {
    next(error);
  }
});

// 更新评论
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.userId;

    const comment = await get(
      'SELECT * FROM comments WHERE id = ?',
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ message: '无权限更新此评论' });
    }

    await run(
      'UPDATE comments SET content = ? WHERE id = ?',
      [content, commentId]
    );

    const updatedComment = await get(
      'SELECT * FROM comments WHERE id = ?',
      [commentId]
    );

    res.json(updatedComment);
  } catch (error) {
    next(error);
  }
});

// 删除评论
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId;

    const comment = await get(
      'SELECT c.*, a.author_id FROM comments c LEFT JOIN articles a ON a.id = c.article_id WHERE c.id = ?',
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    const currentUser = await get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!currentUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isAdmin = currentUser.role === 'admin';
    const isAuthor = comment.author_id === userId;
    const isCommentOwner = comment.user_id === userId;

    if (!isCommentOwner && !isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    await transaction(async (tx) => {
      // 先删除子评论
      await tx.run(
        'DELETE FROM comments WHERE parent_id = ?',
        [commentId]
      );

      // 再删除当前评论
      await tx.run(
        'DELETE FROM comments WHERE id = ?',
        [commentId]
      );
    });

    res.json({ message: '评论已删除', id: commentId });
  } catch (error) {
    res.status(500).json({ 
      message: '删除评论失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取评论回复
router.get('/article/:articleId/replies', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.articleId);
    const parentId = parseInt(req.query.parentId);

    const replies = await query(`
      SELECT 
        c.id, c.content, c.created_at as createdAt,
        c.parent_id as parentId, c.visibility,
        u.id as user_id, u.username, u.avatar_url as avatarUrl
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.article_id = ? AND c.parent_id = ?
    `, [articleId, parentId]);

    // 格式化回复数据
    const formattedReplies = replies.map(reply => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      parentId: reply.parentId,
      visibility: reply.visibility,
      user: {
        id: reply.user_id,
        username: reply.username,
        avatarUrl: reply.avatarUrl
      }
    }));

    res.json(formattedReplies);
  } catch (error) {
    next(error);
  }
});

// 构建评论树
function buildCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];

  // 首先将所有评论添加到 Map 中
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // 然后构建树结构
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id);
    if (comment.parentId) {
      const parentComment = commentMap.get(comment.parentId);
      if (parentComment) {
        parentComment.children.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  return rootComments;
}

// 获取评论层级
async function getCommentLevel(commentId, level = 1) {
  const comment = await get(
    'SELECT parent_id FROM comments WHERE id = ?',
    [commentId]
  );

  if (!comment || !comment.parent_id) {
    return level;
  }

  return getCommentLevel(comment.parent_id, level + 1);
}

export { router as commentsRouter }; 