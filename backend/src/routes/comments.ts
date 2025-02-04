import { Router } from 'express';
import { db } from '../db';
import { comments, users, adminUsers, articles } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         content:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         parentId:
 *           type: integer
 *           nullable: true
 *         visibility:
 *           type: integer
 *           enum: [0, 1]
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             username:
 *               type: string
 *             avatarUrl:
 *               type: string
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 */

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

/**
 * @swagger
 * /api/comments/article/{articleId}:
 *   get:
 *     summary: 获取文章评论
 *     description: 获取指定文章的所有评论（支持嵌套结构）
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *     responses:
 *       200:
 *         description: 成功返回评论列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
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

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: 创建评论
 *     description: 创建新评论（支持最多3级嵌套）
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articleId
 *               - content
 *             properties:
 *               articleId:
 *                 type: integer
 *               content:
 *                 type: string
 *               parentId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: 评论创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 */
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
        visibility: 'visible'
      })
      .returning();

    res.status(201).json(newComment[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/comments/{id}/visibility:
 *   patch:
 *     summary: 切换评论可见性
 *     description: 切换评论的可见状态（仅评论作者或管理员可操作）
 *     tags: [Comments]
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
 *         description: 可见性更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 评论不存在
 */
router.patch('/:id/visibility', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId!;

    console.log('[Comments] 尝试切换评论可见性:', {
      commentId,
      userId,
      requestBody: req.body
    });

    // 获取评论
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    console.log('[Comments] 找到评论:', comment);

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 获取当前用户信息
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    console.log('[Comments] 当前用户:', currentUser);

    if (!currentUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查权限（评论作者或管理员可以修改可见性）
    const isAdmin = currentUser.role === 'admin';
    const isAuthor = comment.userId === userId;

    console.log('[Comments] 权限检查:', {
      isAdmin,
      isAuthor,
      userRole: currentUser.role
    });

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权限修改此评论' });
    }

    // 切换可见性
    const newVisibility = comment.visibility === 'visible' ? 'hidden' : 'visible';
    console.log('[Comments] 切换可见性:', {
      oldVisibility: comment.visibility,
      newVisibility
    });
    
    const updatedComment = await db
      .update(comments)
      .set({ visibility: newVisibility })
      .where(eq(comments.id, commentId))
      .returning();

    console.log('[Comments] 更新结果:', updatedComment);

    res.json(updatedComment[0]);
  } catch (error) {
    console.error('[Comments] 切换可见性失败:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: 获取评论详情
 *     description: 获取指定评论的详细信息
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 评论ID
 *     responses:
 *       200:
 *         description: 成功返回评论详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: 评论不存在
 */
router.get('/:id', async (req, res, next) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: 更新评论
 *     description: 更新指定评论的内容（仅评论作者可操作）
 *     tags: [Comments]
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: 评论更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 评论不存在
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  // ... existing code ...
});

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: 删除评论
 *     description: 删除指定评论（仅评论作者可操作）
 *     tags: [Comments]
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
 *         description: 无权限
 *       404:
 *         description: 评论不存在
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.userId!;

    console.log('[Comments] Attempting to delete comment:', { commentId, userId });

    // 获取评论
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    console.log('[Comments] Found comment:', comment);

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 检查权限（仅评论作者可删除）
    if (comment.userId !== userId) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    try {
      // 开启事务以确保数据一致性
      await db.transaction(async (tx) => {
        console.log('[Comments] Starting transaction');
        
        // 先删除所有子评论
        const deleteChildrenResult = await tx
          .delete(comments)
          .where(eq(comments.parentId, commentId))
          .returning();
        
        console.log('[Comments] Deleted children:', deleteChildrenResult);

        // 再删除当前评论
        const deleteCommentResult = await tx
          .delete(comments)
          .where(eq(comments.id, commentId))
          .returning();
        
        console.log('[Comments] Deleted comment:', deleteCommentResult);
      });

      console.log('[Comments] Transaction completed successfully');
      res.json({ message: '评论已删除' });
    } catch (txError) {
      console.error('[Comments] Transaction failed:', txError);
      throw txError;
    }
  } catch (error) {
    console.error('[Comments] Error in delete route:', error);
    // 返回更具体的错误信息
    res.status(500).json({ 
      message: '删除评论失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @swagger
 * /api/comments/article/{articleId}/replies:
 *   get:
 *     summary: 获取文章评论回复
 *     description: 获取指定文章下某条评论的所有回复
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *       - in: query
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 父评论ID
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
 *         description: 成功返回评论回复列表
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
 *       404:
 *         description: 文章或父评论不存在
 */
router.get('/article/:articleId/replies', async (req, res, next) => {
  // ... existing code ...
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