import { Router } from 'express';
import { db } from '../db';
import { articles as articlesTable, articleReactions, users, tags as tagsTable, articleTags, comments } from '../db/schema';
import { eq, and, sql, like, desc, or, SQL, asc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload, uploadArticleCover } from '../middleware/upload';
import path from 'path';
import fs from 'fs';
import { checkUserStatus } from './users';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
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
    const { page = 1, pageSize = 10, search, sort = 'createdAt', order = 'desc', status = 'all' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建排序条件
    const orderBy: SQL<unknown>[] = [desc(articlesTable.createdAt)]; // 默认排序
    if (sort === 'createdAt') {
      orderBy[0] = order === 'desc' ? desc(articlesTable.createdAt) : asc(articlesTable.createdAt);
    } else if (sort === 'viewCount') {
      orderBy[0] = order === 'desc' ? desc(articlesTable.viewCount) : asc(articlesTable.viewCount);
    }

    // 构建查询条件
    const conditions: SQL<unknown>[] = [];
    if (status !== 'all') {
      conditions.push(eq(articlesTable.status, status as 'published' | 'draft' | 'pending' | 'rejected'));
    }
    if (search) {
      conditions.push(
        sql`(${articlesTable.title} LIKE ${'%' + search + '%'} OR ${articlesTable.content} LIKE ${'%' + search + '%'})`
      );
    }

    // 并发查询：文章列表和总数
    const [articlesList, total] = await Promise.all([
      db.select({
        id: articlesTable.id,
        title: articlesTable.title,
        content: articlesTable.content,
        imageUrl: articlesTable.imageUrl,
        status: articlesTable.status,
        viewCount: articlesTable.viewCount,
        createdAt: articlesTable.createdAt,
        updatedAt: articlesTable.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
        commentCount: sql<number>`count(distinct ${comments.id})`,
        reactionCount: sql<number>`count(distinct ${articleReactions.id})`
      })
        .from(articlesTable)
        .leftJoin(users, eq(users.id, articlesTable.authorId))
        .leftJoin(comments, eq(comments.articleId, articlesTable.id))
        .leftJoin(articleReactions, eq(articleReactions.articleId, articlesTable.id))
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
    const { title, content, htmlContent, imageUrl, tags, status = 'published' } = req.body;
    
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
          content,
          htmlContent,  // 保存 HTML 内容
          imageUrl,
          status,
          authorId: req.userId!,
          publishedAt: status === 'published' ? new Date().toISOString() : null,
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
 *     description: 根据文章ID获取文章详细信息
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
 *       404:
 *         description: 文章不存在
 */
router.get('/:id', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    
    // 查询文章详情，包括作者信息、评论数和点赞数
    const [article] = await db.select({
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
      likeCount: sql<number>`count(distinct ${articleReactions.id})`
    })
    .from(articlesTable)
    .leftJoin(users, eq(users.id, articlesTable.authorId))
    .leftJoin(comments, eq(comments.articleId, articlesTable.id))
    .leftJoin(articleReactions, eq(articleReactions.articleId, articlesTable.id))
    .where(eq(articlesTable.id, articleId))
    .groupBy(articlesTable.id, users.id);

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 获取文章的标签
    const tags = await db
      .select({
        id: tagsTable.id,
        name: tagsTable.name
      })
      .from(articleTags)
      .leftJoin(tagsTable, eq(tagsTable.id, articleTags.tagId))
      .where(eq(articleTags.articleId, articleId));

    // 将标签添加到文章对象中
    const articleWithTags = {
      ...article,
      tags: tags
    };

    // 如果没有保存的 HTML 内容，则从 Markdown 生成
    if (!article.htmlContent) {
      const renderer = new marked.Renderer();
      
      // 生成标题ID的函数
      function generateHeadingId(text: string): string {
        return 'heading-' + text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-');
      }

      renderer.heading = (text, level) => {
        const id = generateHeadingId(text);
        console.log('后端生成标题:', { text, level, id });
        return `<h${level} id="${id}">${text}</h${level}>`;
      };

      marked.setOptions({
        renderer,
        gfm: true,
        breaks: true
      });

      articleWithTags.htmlContent = marked(articleWithTags.content);
      
      // 验证生成的HTML内容
      const headings = articleWithTags.htmlContent.match(/<h[1-6][^>]*id="[^"]*"[^>]*>.*?<\/h[1-6]>/g);
      console.log('生成的HTML标题:', headings);
    }

    // 更新浏览量
    await db.update(articlesTable)
      .set({ 
        viewCount: sql`${articlesTable.viewCount} + 1`,
        updatedAt: new Date().toISOString()
      })
      .where(eq(articlesTable.id, articleId));

    res.json(articleWithTags);
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
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
    const { title, content, htmlContent, imageUrl, tags } = req.body;
    const userId = req.userId;
    const articleId = parseInt(req.params.id);

    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 检查权限：作者本人或管理员可以修改文章
    if (article.authorId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: '无权限修改此文章' });
    }

    // 开启事务以确保数据一致性
    const result = await db.transaction(async (tx) => {
      // 1. 更新文章基本信息
      const [updatedArticle] = await tx
        .update(articlesTable)
        .set({
          title,
          content,
          htmlContent,
          imageUrl,
          updatedAt: new Date().toISOString()
        })
        .where(eq(articlesTable.id, articleId))
        .returning();

      // 2. 如果提供了标签，更新标签
      if (tags && Array.isArray(tags)) {
        // 2.1 删除原有的标签关联
        await tx
          .delete(articleTags)
          .where(eq(articleTags.articleId, articleId));

        // 2.2 添加新的标签
        for (const tagName of tags) {
          // 查找或创建标签
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

          // 创建文章-标签关联
          await tx
            .insert(articleTags)
            .values({
              articleId,
              tagId
            });
        }
      }

      // 3. 获取更新后的标签
      const updatedTags = await tx
        .select({
          id: tagsTable.id,
          name: tagsTable.name
        })
        .from(articleTags)
        .leftJoin(tagsTable, eq(tagsTable.id, articleTags.tagId))
        .where(eq(articleTags.articleId, articleId));

      return {
        ...updatedArticle,
        tags: updatedTags
      };
    });

    res.json(result);
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
    const articleId = parseInt(req.params.id);

    // 验证文章ID
    if (isNaN(articleId)) {
      return res.status(400).json({ message: '无效的文章ID' });
    }

    // 查询文章及其关联数据
    const article = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        authorId: articlesTable.authorId,
        imageUrl: articlesTable.imageUrl,
        commentCount: sql<number>`count(distinct ${comments.id})`,
        reactionCount: sql<number>`count(distinct ${articleReactions.id})`
      })
      .from(articlesTable)
      .leftJoin(comments, eq(comments.articleId, articlesTable.id))
      .leftJoin(articleReactions, eq(articleReactions.articleId, articlesTable.id))
      .where(eq(articlesTable.id, articleId))
      .groupBy(articlesTable.id)
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 检查权限：作者本人或管理员可以删除文章
    if (article.authorId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: '无权限删除此文章' });
    }

    // 开启事务以确保数据一致性
    await db.transaction(async (tx) => {
      // 1. 删除文章的所有标签关联
      await tx
        .delete(articleTags)
        .where(eq(articleTags.articleId, articleId));

      // 2. 删除文章的所有点赞
      await tx
        .delete(articleReactions)
        .where(eq(articleReactions.articleId, articleId));
      
      // 3. 删除文章的所有评论
      await tx
        .delete(comments)
        .where(eq(comments.articleId, articleId));
      
      // 4. 删除文章
      await tx
        .delete(articlesTable)
        .where(eq(articlesTable.id, articleId));

      // 5. 如果文章有封面图，同步删除封面图文件
      if (article.imageUrl) {
        try {
          const imagePath = path.join(__dirname, '../../uploads/covers', 
            path.basename(article.imageUrl));
          await fs.promises.unlink(imagePath);
        } catch (error) {
          console.error('删除封面图失败:', error);
          // 记录错误但不中断事务
        }
      }
    });

    // 返回删除成功的消息，包含一些统计信息
    res.status(200).json({
      message: '文章删除成功',
      details: {
        title: article.title,
        commentCount: article.commentCount,
        reactionCount: article.reactionCount
      }
    });
  } catch (error) {
    console.error('删除文章失败:', error);
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

/**
 * @swagger
 * /api/articles/{id}/reaction:
 *   get:
 *     summary: 获取文章反应状态
 *     description: 获取当前用户对文章的反应状态和所有反应统计
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
 *         description: 成功返回反应状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userReaction:
 *                   type: string
 *                   enum: [like, love, haha, angry]
 *                   nullable: true
 *                 reactionCounts:
 *                   type: object
 *                   properties:
 *                     like:
 *                       type: integer
 *                     love:
 *                       type: integer
 *                     haha:
 *                       type: integer
 *                     angry:
 *                       type: integer
 */
router.get('/:id/reaction', async (req: AuthRequest, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId;

    // 检查文章是否存在
    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 获取所有反应的统计
    const reactionCounts = await db
      .select({
        type: articleReactions.type,
        count: sql<number>`count(*)`
      })
      .from(articleReactions)
      .where(eq(articleReactions.articleId, articleId))
      .groupBy(articleReactions.type);

    // 构建反应计数对象
    const counts = {
      like: 0,
      love: 0,
      haha: 0,
      angry: 0
    };
    
    reactionCounts.forEach(count => {
      counts[count.type as keyof typeof counts] = count.count;
    });

    // 如果用户已登录，获取用户的反应
    let userReaction = null;
    if (userId) {
      const reaction = await db
        .select()
        .from(articleReactions)
        .where(
          and(
            eq(articleReactions.articleId, articleId),
            eq(articleReactions.userId, userId)
          )
        )
        .get();
      
      userReaction = reaction?.type || null;
    }

    res.json({
      userReaction,
      reactionCounts: counts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}/reaction:
 *   post:
 *     summary: 添加或更新文章反应
 *     description: 为文章添加新的反应或更新现有反应
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
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [like, love, haha, angry]
 *     responses:
 *       200:
 *         description: 反应更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userReaction:
 *                   type: string
 *                   enum: [like, love, haha, angry]
 *                   nullable: true
 *                 reactionCounts:
 *                   type: object
 *                   properties:
 *                     like:
 *                       type: integer
 *                     love:
 *                       type: integer
 *                     haha:
 *                       type: integer
 *                     angry:
 *                       type: integer
 */
router.post('/:id/reaction', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId;
    const articleId = parseInt(req.params.id);
    const { type } = req.body;

    if (!['like', 'love', 'haha', 'angry'].includes(type)) {
      return res.status(400).json({ message: '无效的反应类型' });
    }

    // 检查文章是否存在
    const article = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章未找到' });
    }

    // 检查是否已有反应
    const existingReaction = await db
      .select()
      .from(articleReactions)
      .where(
        and(
          eq(articleReactions.articleId, articleId),
          eq(articleReactions.userId, userId!)
        )
      )
      .get();

    if (existingReaction) {
      if (existingReaction.type === type) {
        // 如果是相同的反应类型，则删除反应
        await db
          .delete(articleReactions)
          .where(
            and(
              eq(articleReactions.articleId, articleId),
              eq(articleReactions.userId, userId!)
            )
          );
      } else {
        // 如果是不同的反应类型，则更新反应
        await db
          .update(articleReactions)
          .set({ type, createdAt: new Date().toISOString() })
          .where(
            and(
              eq(articleReactions.articleId, articleId),
              eq(articleReactions.userId, userId!)
            )
          );
      }
    } else {
      // 添加新反应
      await db.insert(articleReactions).values({
        articleId,
        userId: userId!,
        type,
        createdAt: new Date().toISOString()
      });
    }

    // 获取最新的反应统计
    const reactionCounts = await db
      .select({
        type: articleReactions.type,
        count: sql<number>`count(*)`
      })
      .from(articleReactions)
      .where(eq(articleReactions.articleId, articleId))
      .groupBy(articleReactions.type);

    // 构建反应计数对象
    const counts = {
      like: 0,
      love: 0,
      haha: 0,
      angry: 0
    };
    
    reactionCounts.forEach(count => {
      counts[count.type as keyof typeof counts] = count.count;
    });

    // 获取用户当前的反应状态
    const currentReaction = await db
      .select()
      .from(articleReactions)
      .where(
        and(
          eq(articleReactions.articleId, articleId),
          eq(articleReactions.userId, userId!)
        )
      )
      .get();

    res.json({
      userReaction: currentReaction?.type || null,
      reactionCounts: counts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/articles/{id}/reactions:
 *   get:
 *     summary: 获取文章反应用户列表
 *     description: 获取对文章做出特定反应的用户列表
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [like, love, haha, angry]
 *         description: 反应类型（可选）
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
 *         description: 成功返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           avatarUrl:
 *                             type: string
 *                       type:
 *                         type: string
 *                         enum: [like, love, haha, angry]
 *                       createdAt:
 *                         type: string
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 */
router.get('/:id/reactions', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const { type, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建查询条件
    const conditions = [eq(articleReactions.articleId, articleId)];
    if (type && ['like', 'love', 'haha', 'angry'].includes(type as string)) {
      conditions.push(eq(articleReactions.type, type as 'like' | 'love' | 'haha' | 'angry'));
    }

    // 并发查询：反应列表和总数
    const [reactionsList, total] = await Promise.all([
      db.select({
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
        type: articleReactions.type,
        createdAt: articleReactions.createdAt,
      })
        .from(articleReactions)
        .leftJoin(users, eq(users.id, articleReactions.userId))
        .where(and(...conditions))
        .orderBy(desc(articleReactions.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(articleReactions)
        .where(and(...conditions))
    ]);

    res.json({
      items: reactionsList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    next(error);
  }
});

export const articlesRouter = router;