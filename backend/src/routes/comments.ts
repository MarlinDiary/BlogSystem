import { Router } from 'express';
import { db } from '../db';
import { comments, users, adminUsers, articles } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

interface CommentWithUser {
  id: number;
  content: string;
  createdAt: string;
  parentId: number | null;
  visibility: number;
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
  };
  children: CommentWithUser[];
}

const router = Router();

// 获取文章评论（支持嵌套结构）
router.get('/article/:articleId', async (req, res, next) => {
  try {
    // 获取所有评论
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
    // 构建评论树
    const commentTree = allComments.map(comment => ({
      ...comment,
      children: []
    }));

    // 构建评论树结构
    const commentMap = new Map();
    commentTree.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    commentTree.forEach(comment => {
      if (comment.parentId !== null) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.children.push(comment);
        }
      }
    });

    // 只返回顶层评论
    const rootComments = commentTree.filter(comment => comment.parentId === null);
    
    res.json(rootComments);
  } catch (error) {
    next(error);
  }
});

// 创建评论（支持最多3级嵌套）
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { articleId, content, parentId } = req.body;
    const userId = req.userId;

    if (parentId) {
      // 检查父评论是否存在
      const parentComment = await db
        .select()
        .from(comments)
        .where(eq(comments.id, parentId))
        .get();

      if (!parentComment) {
        return res.status(404).json({ message: '父评论不存在' });
      }

      // 检查嵌套层级
      const level = await getCommentLevel(parentId);
      if (level >= 3) {
        return res.status(400).json({ message: '评论嵌套层级不能超过3级' });
      }
    }

    const newComment = await db
      .insert(comments)
      .values({
        articleId,
        userId: userId!,
        content,
        parentId,
        createdAt: new Date().toISOString(),
        visibility: 1
      })
      .returning();

    res.status(201).json(newComment[0]);
  } catch (error) {
    next(error);
  }
});

// 切换评论可见性
router.patch('/:id/visibility', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId!;

    // 获取评论
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 检查权限（评论作者或管理员可以修改可见性）
    const isAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.userId, userId))
      .get();

    if (comment.userId !== userId && !isAdmin) {
      return res.status(403).json({ message: '无权限修改此评论' });
    }

    // 切换可见性
    const newVisibility = comment.visibility === 1 ? 0 : 1;
    
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

// 删除评论
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId!;

    // 获取评论及其所属文章的信息
    const comment = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        articleId: comments.articleId,
        article: {
          authorId: articles.authorId
        }
      })
      .from(comments)
      .leftJoin(articles, eq(articles.id, comments.articleId))
      .where(eq(comments.id, commentId))
      .get();

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 检查权限（评论作者或文章作者可以删除评论）
    const isCommentAuthor = comment.userId === userId;
    const isArticleAuthor = comment.article?.authorId === userId;

    if (!isCommentAuthor && !isArticleAuthor) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// 辅助函数：构建评论树
function buildCommentTree(comments: CommentWithUser[]): CommentWithUser[] {
  const commentMap = new Map<number, CommentWithUser>();
  const roots: CommentWithUser[] = [];

  // 首先将所有评论放入 Map
  comments.forEach(comment => {
    comment.children = [];
    commentMap.set(comment.id, comment);
  });

  // 构建树结构
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

// 辅助函数：获取评论的嵌套层级
async function getCommentLevel(commentId: number): Promise<number> {
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

export const commentsRouter = router; 