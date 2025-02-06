import express from 'express';
import { db } from '../db/index.js';
import { comments, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 获取文章评论
router.get('/article/:articleId', async (req, res, next) => {
  try {
    const allComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        visibility: comments.visibility,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.articleId, parseInt(req.params.articleId)));
    
    const rootComments = buildCommentTree(allComments);
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
      const parentComment = await db
        .select()
        .from(comments)
        .where(eq(comments.id, parentId))
        .get();

      if (!parentComment) {
        return res.status(404).json({ message: '父评论不存在' });
      }

      const level = await getCommentLevel(parentId);
      if (level >= 3) {
        return res.status(400).json({ message: '评论嵌套层级不能超过3级' });
      }
    }

    const newComment = await db
      .insert(comments)
      .values({
        articleId,
        userId,
        content,
        parentId,
        createdAt: new Date().toISOString(),
        visibility: 'visible'
      })
      .returning();

    res.status(201).json(newComment[0]);
  } catch (error) {
    next(error);
  }
});

// 切换评论可见性
router.patch('/:id/visibility', authMiddleware, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId;

    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!currentUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isAdmin = currentUser.role === 'admin';
    const isAuthor = comment.userId === userId;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权限修改此评论' });
    }

    const newVisibility = comment.visibility === 'visible' ? 'hidden' : 'visible';
    
    const updatedComment = await db
      .update(comments)
      .set({ visibility: newVisibility })
      .where(eq(comments.id, commentId))
      .returning();

    res.json(updatedComment[0]);
  } catch (error) {
    next(error);
  }
});

// 获取单个评论
router.get('/:id', async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

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

    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: '无权限更新此评论' });
    }

    const updatedComment = await db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, commentId))
      .returning();

    res.json(updatedComment[0]);
  } catch (error) {
    next(error);
  }
});

// 删除评论
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId;

    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    await db.transaction(async (tx) => {
      // 先删除子评论
      await tx
        .delete(comments)
        .where(eq(comments.parentId, commentId));

      // 再删除当前评论
      await tx
        .delete(comments)
        .where(eq(comments.id, commentId));
    });

    res.json({ message: '评论已删除' });
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

    const commentsList = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        visibility: comments.visibility,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.articleId, articleId))
      .andWhere(eq(comments.parentId, parentId));

    res.json(commentsList);
  } catch (error) {
    next(error);
  }
});

// 构建评论树
function buildCommentTree(comments) {
  const commentMap = new Map();
  const roots = [];

  comments.forEach(comment => {
    comment.children = [];
    commentMap.set(comment.id, comment);
  });

  comments.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.children.push(comment);
      }
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

// 获取评论嵌套层级
async function getCommentLevel(commentId) {
  let level = 0;
  let currentComment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .get();

  while (currentComment?.parentId) {
    level++;
    currentComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, currentComment.parentId))
      .get();
  }

  return level;
}

export { router as commentsRouter }; 