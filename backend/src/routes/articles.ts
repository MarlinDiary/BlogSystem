import { Router } from 'express';
import { db } from '../db';
import { articles as articlesTable, users, articleLikes, comments, tags as tagsTable, articleTags } from '../db/schema';
import { eq, and, sql, like, desc, or, SQL, asc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadArticleCover } from '../middleware/upload';
import path from 'path';
import fs from 'fs';
import { checkUserStatus } from './users';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { upload } from '../middleware/upload';
import { uploadArticleImage } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: 获取文章列表
 *     description: 获取所有文章，支持搜索、排序和分页
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: 排序方式 (newest, title, views, likes)
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
 */
// 获取所有文章（支持搜索和排序）
router.get('/', async (req, res, next) => {
  try {
    const { 
      keyword,
      sort = 'newest',
      author,
      status = 'published',
      page = 1,
      pageSize = 10
    } = req.query;

    // 确保 status 是有效的枚举值
    const validStatus = status as 'published' | 'draft' | 'pending' | 'rejected';
    
    // 定义条件数组
    const conditions: SQL<unknown>[] = [eq(articlesTable.status, validStatus)];
    
    // 如果有 keyword，则添加搜索条件
    if (keyword) {
      const searchCondition = or(
        like(articlesTable.title, `%${keyword as string}%`),
        like(articlesTable.content, `%${keyword as string}%`)
      ) as SQL<unknown>;
      conditions.push(searchCondition);
    }

    // 如果有 author，则添加作者条件
    if (author) {
      conditions.push(eq(articlesTable.authorId, parseInt(author as string)));
    }

    // 处理多字段排序
    let orderBy: SQL<unknown>[] = [];
    if (typeof sort === 'string') {
      const sortFields = (sort as string).split(',');
      sortFields.forEach(field => {
        const isDesc = field.startsWith('-');
        const fieldName = isDesc ? field.slice(1) : field;
        
        switch (fieldName) {
          case 'title':
            orderBy.push(isDesc ? desc(articlesTable.title) : asc(articlesTable.title));
            break;
          case 'date':
            orderBy.push(isDesc ? desc(articlesTable.createdAt) : asc(articlesTable.createdAt));
            break;
          case 'views':
            orderBy.push(isDesc ? desc(articlesTable.viewCount) : asc(articlesTable.viewCount));
            break;
          case 'likes':
            // 子查询获取点赞数
            const likesCount = db
              .select({ count: sql<number>`count(*)` })
              .from(articleLikes)
              .where(eq(articleLikes.articleId, articlesTable.id))
              .as('likes_count');
            orderBy.push(isDesc ? desc(likesCount.count) : asc(likesCount.count));
            break;
          default:
            // 默认按创建时间倒序
            orderBy.push(desc(articlesTable.createdAt));
        }
      });
    }

    // 如果没有指定排序，默认按创建时间倒序
    if (orderBy.length === 0) {
      orderBy.push(desc(articlesTable.createdAt));
    }

    // 分页
    const offset = (Number(page) - 1) * Number(pageSize);
    
    // 并发查询：一条查列表、一条查总数
    const [articlesList, total] = await Promise.all([
      db.select({
        id: articlesTable.id,
        title: articlesTable.title,
        content: articlesTable.content,
        htmlContent: articlesTable.htmlContent,
        imageUrl: articlesTable.imageUrl,
        status: articlesTable.status,
        viewCount: articlesTable.viewCount,
        createdAt: articlesTable.createdAt,
        updatedAt: articlesTable.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl
        },
        commentCount: sql<number>`count(distinct ${comments.id})`,
        likeCount: sql<number>`count(distinct ${articleLikes.id})`
      })
        .from(articlesTable)
        .leftJoin(users, eq(users.id, articlesTable.authorId))
        .leftJoin(comments, eq(comments.articleId, articlesTable.id))
        .leftJoin(articleLikes, eq(articleLikes.articleId, articlesTable.id))
        .where(and(...conditions))
        .groupBy(articlesTable.id, users.id)
        .orderBy(...orderBy)
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
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
    next(error);
  }
});

/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: 创建新文章
 *     description: 创建一篇新文章
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               htmlContent:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, pending, rejected]
 *     responses:
 *       201:
 *         description: 文章创建成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 */
// 创建文章
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { title, content, htmlContent, imageUrl, tags, status = 'pending' } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容不能为空' });
    }

    // 开启事务
    const result = await db.transaction(async (tx) => {
      // 1. 创建文章
      const [newArticle] = await tx
        .insert(articlesTable)
        .values({
          title,
          content,         // 纯文本内容
          htmlContent,     // 富文本 HTML 内容
          imageUrl,
          status,         // 使用传入的状态或默认为 pending
          authorId: req.userId!,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      // 2. 如果有标签，处理标签
      if (tags && Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          // 2.1 查找或创建标签
          const existingTags = await tx
            .select()
            .from(tagsTable)
            .where(eq(tagsTable.name, tagName));

          let tagId;
          if (existingTags.length > 0) {
            tagId = existingTags[0].id;
          } else {
            const [newTag] = await tx
              .insert(tagsTable)
              .values({ name: tagName })
              .returning();
            tagId = newTag.id;
          }

          // 2.2 创建文章-标签关联
          await tx
            .insert(articleTags)
            .values({
              articleId: newArticle.id,
              tagId: tagId
            });
        }
      }

      return newArticle;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: 获取文章详情
 *     description: 获取指定文章的详细信息
 *     tags: [Articles]
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
 *       404:
 *         description: 文章不存在
 */
router.get('/:id', async (req, res, next) => {
  try {
    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, parseInt(req.params.id)))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}:
 *   put:
 *     summary: 更新文章
 *     description: 更新指定文章的内容（仅作者可操作）
 *     tags: [Articles]
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
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               htmlContent:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: 文章更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 文章不存在
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { title, content, imageUrl } = req.body;
    const userId = req.userId;

    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, parseInt(req.params.id)))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 检查权限：作者本人或管理员可以修改文章
    if (article.authorId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: '无权限修改此文章' });
    }

    const updatedArticle = await db
      .update(articlesTable)
      .set({
        title,
        content,
        imageUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(articlesTable.id, parseInt(req.params.id)))
      .returning();

    res.json(updatedArticle[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}:
 *   delete:
 *     summary: 删除文章
 *     description: 删除指定文章（仅作者可操作）
 *     tags: [Articles]
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
 *         description: 无权限
 *       404:
 *         description: 文章不存在
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId;

    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, parseInt(req.params.id)))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 检查权限：作者本人或管理员可以删除文章
    if (article.authorId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: '无权限删除此文章' });
    }

    await db
      .delete(articlesTable)
      .where(eq(articlesTable.id, parseInt(req.params.id)));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// 获取点赞状态
router.get('/:id/like', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId;
    const articleId = parseInt(req.params.id);

    // 并发查询点赞状态和总点赞数
    const [existingLike, totalLikes] = await Promise.all([
      db
        .select()
        .from(articleLikes)
        .where(
          and(
            eq(articleLikes.articleId, articleId),
            eq(articleLikes.userId, userId!)
          )
        )
        .get(),
      db
        .select({ count: sql<number>`count(*)` })
        .from(articleLikes)
        .where(eq(articleLikes.articleId, articleId))
    ]);

    res.json({
      liked: !!existingLike,
      totalLikes: totalLikes[0].count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}/like:
 *   post:
 *     summary: 点赞文章
 *     description: 为指定文章点赞或取消点赞
 *     tags: [Articles]
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
 *         description: 操作成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:
 *                   type: boolean
 *                   description: 当前点赞状态
 *                 likeCount:
 *                   type: integer
 *                   description: 当前点赞数
 *       401:
 *         description: 未授权
 *       404:
 *         description: 文章不存在
 */
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId;
    const articleId = parseInt(req.params.id);

    // 检查文章是否存在
    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 检查是否已点赞
    const existingLike = await db
      .select()
      .from(articleLikes)
      .where(
        and(
          eq(articleLikes.articleId, articleId),
          eq(articleLikes.userId, userId!)
        )
      )
      .get();

    if (existingLike) {
      // 如果已点赞，则取消点赞
      await db
        .delete(articleLikes)
        .where(
          and(
            eq(articleLikes.articleId, articleId),
            eq(articleLikes.userId, userId!)
          )
        );
    } else {
      // 添加点赞
      await db.insert(articleLikes).values({
        articleId,
        userId: userId!
      });
    }

    // 获取最新点赞总数
    const [totalLikes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articleLikes)
      .where(eq(articleLikes.articleId, articleId));

    res.json({ 
      liked: !existingLike,
      totalLikes: totalLikes.count
    });
  } catch (error) {
    next(error);
  }
});

// 上传文章封面图
router.post('/:id/cover', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    
    // 检查文章是否存在且属于当前用户
    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article.authorId !== req.userId) {
      return res.status(403).json({ message: '无权限修改此文章' });
    }

    uploadArticleCover(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: '请选择封面图片' });
      }

      const imageUrl = `/uploads/covers/${req.file.filename}`;

      // 更新文章封面图
      await db
        .update(articlesTable)
        .set({ imageUrl })
        .where(eq(articlesTable.id, articleId));

      // 删除旧的封面图
      if (article.imageUrl) {
        const oldImagePath = path.join(__dirname, '../../uploads/covers', 
          path.basename(article.imageUrl));
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error('删除旧封面图失败:', err);
        });
      }

      res.json({ imageUrl });
    });
  } catch (error) {
    next(error);
  }
});

// 增加文章浏览量
router.post('/:id/view', async (req, res, next) => {
  try {
    await db
      .update(articlesTable)
      .set({
        viewCount: sql`${articlesTable.viewCount} + 1`
      })
      .where(eq(articlesTable.id, parseInt(req.params.id)));
    
    res.json({ message: '浏览量已更新' });
  } catch (error) {
    next(error);
  }
});

// 删除文章封面
router.delete('/:id/cover', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await db
      .select()
      .from(articlesTable)
      .where(
        and(
          eq(articlesTable.id, parseInt(req.params.id)),
          eq(articlesTable.authorId, req.userId!)
        )
      )
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在或无权限' });
    }

    if (article.imageUrl) {
      const imagePath = path.join(__dirname, '../../uploads/covers', 
        path.basename(article.imageUrl));
      fs.unlink(imagePath, (err) => {
        if (err) console.error('删除封面图失败:', err);
      });

      await db
        .update(articlesTable)
        .set({ imageUrl: null })
        .where(eq(articlesTable.id, article.id));
    }

    res.json({ message: '封面已删除' });
  } catch (error) {
    next(error);
  }
});

// 获取文章点赞用户列表
router.get('/:id/likes', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    if (isNaN(articleId)) {
      return res.status(400).json({ message: '无效的文章ID' });
    }

    // 并发查询：点赞用户列表和总数
    const [likesList, total] = await Promise.all([
      db.select({
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl
        }
      })
        .from(articleLikes)
        .leftJoin(users, eq(users.id, articleLikes.userId))
        .where(eq(articleLikes.articleId, articleId))
        .orderBy(desc(articleLikes.id))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(articleLikes)
        .where(eq(articleLikes.articleId, articleId))
    ]);

    res.json({
      items: likesList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}/status:
 *   patch:
 *     summary: 更新文章状态
 *     description: 更新指定文章的状态（仅管理员可操作）
 *     tags: [Articles]
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
 *                 enum: [draft, published, pending, rejected]
 *     responses:
 *       200:
 *         description: 状态更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 文章不存在
 */
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const articleId = parseInt(req.params.id);
    const userId = req.userId!;

    // 验证状态值
    const validStatuses = ['draft', 'published', 'pending_review'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 检查文章所有权
    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 检查权限：作者本人或管理员可以修改文章状态
    if (article.authorId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: '无权限修改此文章' });
    }

    const updatedArticle = await db
      .update(articlesTable)
      .set({ 
        status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(articlesTable.id, articleId))
      .returning();

    res.json(updatedArticle[0]);
  } catch (error) {
    res.status(500).json({ error: '更新状态失败' });
  }
});

// Markdown 预览
router.post('/preview', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    // 将 Markdown 转换为 HTML
    const htmlContent = marked(content);

    // 净化 HTML 以防止 XSS 攻击
    const sanitizedHtml = sanitizeHtml(htmlContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title']
      }
    });

    res.json({ html: sanitizedHtml });
  } catch (error) {
    res.status(500).json({ message: 'Markdown 预览生成失败' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         htmlContent:
 *           type: string
 *         imageUrl:
 *           type: string
 *         status:
 *           type: string
 *           enum: [published, draft, pending, rejected]
 *         viewCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         author:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             username:
 *               type: string
 *             avatarUrl:
 *               type: string
 */

/**
 * @swagger
 * /api/articles/images:
 *   post:
 *     summary: 上传文章图片
 *     description: 上传文章中使用的图片
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 图片上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
router.post('/images', authMiddleware, uploadArticleImage, async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }

    // 生成图片URL
    const imageUrl = `/uploads/articles/${req.file.filename}`;
    
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ message: '图片上传失败' });
  }
});

/**
 * @swagger
 * /api/articles/cover:
 *   post:
 *     summary: 上传文章封面
 *     description: 上传文章封面图片
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cover
 *             properties:
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 封面上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
router.post('/cover', authMiddleware, uploadArticleCover, async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }

    // 生成图片URL
    const imageUrl = `/uploads/covers/${req.file.filename}`;
    
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('封面上传失败:', error);
    res.status(500).json({ message: '封面上传失败' });
  }
});

export const articlesRouter = router;