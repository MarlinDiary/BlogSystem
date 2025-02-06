import express from 'express';
import { db } from '../db/index.js';
import { articles, users, comments, articleTags, tags, articleReactions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, and, desc, sql, like, asc, inArray } from 'drizzle-orm';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { upload, uploadArticleImage, uploadArticleCover } from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 获取文章列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, search, sort = 'createdAt', order = 'desc', status = 'all' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建排序条件
    const orderBy = [desc(articles.createdAt)]; // 默认排序
    if (sort === 'createdAt') {
      orderBy[0] = order === 'desc' ? desc(articles.createdAt) : asc(articles.createdAt);
    } else if (sort === 'viewCount') {
      orderBy[0] = order === 'desc' ? desc(articles.viewCount) : asc(articles.viewCount);
    }

    // 构建查询条件
    const conditions = [];
    if (status !== 'all') {
      conditions.push(eq(articles.status, status));
    }
    if (search) {
      conditions.push(
        sql`(${articles.title} LIKE ${'%' + search + '%'} OR ${articles.content} LIKE ${'%' + search + '%'})`
      );
    }

    // 获取文章列表
    const articlesList = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        imageUrl: articles.imageUrl,
        status: articles.status,
        viewCount: articles.viewCount,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(articles)
      .leftJoin(users, eq(users.id, articles.authorId))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(Number(pageSize))
      .offset(offset);

    // 获取总数
    const [total] = await db
      .select({ count: sql`count(*)` })
      .from(articles)
      .where(and(...conditions));

    // 获取每篇文章的评论数和反应数
    const articleIds = articlesList.map(article => article.id);
    
    // 获取评论数
    const commentCounts = await db
      .select({
        articleId: comments.articleId,
        count: sql`count(*)`
      })
      .from(comments)
      .where(inArray(comments.articleId, articleIds))
      .groupBy(comments.articleId);

    // 获取反应数
    const reactionCounts = await db
      .select({
        articleId: articleReactions.articleId,
        count: sql`count(*)`
      })
      .from(articleReactions)
      .where(inArray(articleReactions.articleId, articleIds))
      .groupBy(articleReactions.articleId);

    // 将评论数和反应数添加到文章列表中
    const articlesWithCounts = articlesList.map(article => {
      const commentCount = commentCounts.find(c => c.articleId === article.id)?.count || 0;
      const reactionCount = reactionCounts.find(r => r.articleId === article.id)?.count || 0;
      return {
        ...article,
        commentCount: Number(commentCount),
        reactionCount: Number(reactionCount)
      };
    });

    res.json({
      items: articlesWithCounts,
      total: Number(total.count),
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    next(error);
  }
});

// 创建文章
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    console.log('收到创建文章请求:', req.body);
    const { title, content, htmlContent, imageUrl, tags: tagNames = [], status = 'published' } = req.body;
    
    // 数据验证
    if (!title?.trim()) {
      return res.status(400).json({ message: '标题不能为空' });
    }
    
    if (!content?.trim()) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    if (!imageUrl) {
      return res.status(400).json({ message: '请上传封面图片' });
    }

    if (!Array.isArray(tagNames) || tagNames.length === 0) {
      return res.status(400).json({ message: '请至少添加一个标签' });
    }

    // 处理图片URL，移除服务器地址前缀
    const processedImageUrl = imageUrl.replace(/^http:\/\/localhost:3000/, '');

    // 开启事务
    const result = await db.transaction(async (tx) => {
      try {
        console.log('开始创建文章事务');
        // 1. 创建文章
        const [newArticle] = await tx
          .insert(articles)
          .values({
            title: title.trim(),
            content: content.trim(),
            htmlContent: htmlContent || '',
            imageUrl: processedImageUrl,
            status,
            authorId: req.userId,
            publishedAt: status === 'published' ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            viewCount: 0
          })
          .returning();

        console.log('文章创建成功:', newArticle);

        // 2. 处理标签
        const uniqueTags = [...new Set(tagNames.map(tag => tag.trim()).filter(Boolean))];
        console.log('处理标签:', uniqueTags);

        for (const tagName of uniqueTags) {
          // 2.1 查找或创建标签
          const existingTags = await tx
            .select()
            .from(tags)
            .where(eq(tags.name, tagName))
            .execute();

          let tagId;
          if (existingTags.length > 0) {
            console.log('找到已存在的标签:', existingTags[0]);
            tagId = existingTags[0].id;
          } else {
            console.log('创建新标签:', tagName);
            const [newTag] = await tx
              .insert(tags)
              .values({ 
                name: tagName,
                createdAt: new Date().toISOString()
              })
              .returning();
            tagId = newTag.id;
          }

          // 2.2 创建文章-标签关联
          console.log('创建文章-标签关联:', { articleId: newArticle.id, tagId });
          await tx
            .insert(articleTags)
            .values({
              articleId: newArticle.id,
              tagId: tagId,
              createdAt: new Date().toISOString()
            })
            .execute();
        }

        return newArticle;
      } catch (error) {
        console.error('事务执行失败:', error);
        throw error;
      }
    });

    console.log('事务执行完成，获取完整文章信息');

    // 获取完整的文章信息（包括作者信息）
    const articleResult = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        htmlContent: articles.htmlContent,
        imageUrl: articles.imageUrl,
        status: articles.status,
        viewCount: articles.viewCount,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          realName: users.realName,
          bio: users.bio,
          dateOfBirth: users.dateOfBirth,
        }
      })
      .from(articles)
      .leftJoin(users, eq(users.id, articles.authorId))
      .where(eq(articles.id, result.id))
      .execute();

    const article = articleResult[0];
    if (!article) {
      throw new Error('文章创建成功但获取详情失败');
    }

    // 在返回给前端时，添加服务器地址前缀
    const responseArticle = {
      ...article,
      imageUrl: `http://localhost:3000${article.imageUrl}`
    };

    console.log('返回创建成功的文章:', responseArticle);
    res.status(201).json(responseArticle);
  } catch (error) {
    console.error('创建文章失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      message: error.message || '创建文章失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 获取文章详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const articleId = Number(id);

    console.log('获取文章详情:', { articleId });

    // 获取文章基本信息
    const articleResult = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        htmlContent: articles.htmlContent,
        imageUrl: articles.imageUrl,
        status: articles.status,
        viewCount: articles.viewCount,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          realName: users.realName,
          bio: users.bio,
          dateOfBirth: users.dateOfBirth,
        }
      })
      .from(articles)
      .leftJoin(users, eq(users.id, articles.authorId))
      .where(eq(articles.id, articleId))
      .execute();

    console.log('文章查询结果:', articleResult);

    if (!articleResult || articleResult.length === 0) {
      console.log('文章不存在:', articleId);
      return res.status(404).json({ message: '文章不存在' });
    }

    const article = articleResult[0];
    
    // 获取评论数
    const [commentCount] = await db
      .select({
        count: sql`count(*)`
      })
      .from(comments)
      .where(eq(comments.articleId, articleId));

    console.log('评论数:', commentCount);

    // 获取反应数
    const [reactionCount] = await db
      .select({
        count: sql`count(*)`
      })
      .from(articleReactions)
      .where(eq(articleReactions.articleId, articleId));

    console.log('反应数:', reactionCount);

    // 获取文章标签
    const tagResults = await db
      .select({
        id: tags.id,
        name: tags.name,
        createdAt: tags.createdAt
      })
      .from(articleTags)
      .leftJoin(tags, eq(tags.id, articleTags.tagId))
      .where(eq(articleTags.articleId, articleId))
      .orderBy(desc(tags.createdAt));

    console.log('文章标签:', tagResults);

    // 增加浏览量
    await db
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, articleId));

    // 在返回给前端时，添加服务器地址前缀
    const responseArticle = {
      ...article,
      imageUrl: article.imageUrl ? `http://localhost:3000${article.imageUrl}` : null,
      commentCount: Number(commentCount.count),
      reactionCount: Number(reactionCount.count),
      tags: tagResults
    };

    console.log('返回文章数据:', responseArticle);

    res.json(responseArticle);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      message: '获取文章详情失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 更新文章
router.put('/:id', authMiddleware, uploadArticleCover, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, htmlContent, imageUrl, status } = req.body;

    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, Number(id)))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article.authorId !== req.userId) {
      return res.status(403).json({ message: '无权修改此文章' });
    }

    const updatedArticle = await db
      .update(articles)
      .set({
        title: title || article.title,
        content: content || article.content,
        htmlContent: htmlContent || article.htmlContent,
        imageUrl: imageUrl || article.imageUrl,
        status: status || article.status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(articles.id, Number(id)))
      .returning();

    res.json(updatedArticle[0]);
  } catch (error) {
    next(error);
  }
});

// 删除文章
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, Number(id)))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article.authorId !== req.userId) {
      return res.status(403).json({ message: '无权删除此文章' });
    }

    await db.delete(articles).where(eq(articles.id, Number(id)));

    res.json({ message: '文章删除成功' });
  } catch (error) {
    next(error);
  }
});

// 上传文章封面
router.post('/:id/cover', authMiddleware, upload.single('cover'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: '请上传封面图片' });
    }

    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, Number(id)))
      .get();

    if (!article) {
      // 删除上传的文件
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article.authorId !== req.userId) {
      // 删除上传的文件
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: '无权修改此文章' });
    }

    // 如果文章已有封面，删除旧文件
    if (article.imageUrl) {
      const oldImagePath = path.join(process.cwd(), article.imageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const imageUrl = `/uploads/covers/${file.filename}`;

    const updatedArticle = await db
      .update(articles)
      .set({ imageUrl })
      .where(eq(articles.id, Number(id)))
      .returning();

    res.json({
      message: '封面上传成功',
      imageUrl,
      article: updatedArticle[0]
    });
  } catch (error) {
    // 发生错误时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// 添加新的封面上传路由
router.post('/cover', authMiddleware, uploadArticleCover, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: 0,
        message: '请上传封面图片' 
      });
    }
    
    // 返回图片URL
    const imageUrl = `/uploads/covers/${req.file.filename}`;
    res.json({ 
      success: 1,
      url: imageUrl,
      file: {
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('封面上传失败:', error);
    // 发生错误时删除上传的文件
    if (req.file) {
      const filePath = path.join(process.cwd(), 'uploads/covers', req.file.filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error('删除失败的上传文件时出错:', err);
      });
    }
    res.status(500).json({ 
      success: 0,
      message: error.message || '封面上传失败'
    });
  }
});

// 修改文章图片上传路由
router.post('/images', authMiddleware, uploadArticleImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: 0,
        message: '没有上传文件' 
      });
    }
    
    // 返回图片URL
    const imageUrl = `/uploads/articles/${req.file.filename}`;
    res.json({ 
      success: 1,
      url: imageUrl,
      file: {
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('文章图片上传失败:', error);
    res.status(500).json({ 
      success: 0,
      message: error.message || '图片上传失败'
    });
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

// 增加文章浏览量
router.post('/:id/view', async (req, res, next) => {
  try {
    await db
      .update(articles)
      .set({
        viewCount: sql`${articles.viewCount} + 1`
      })
      .where(eq(articles.id, parseInt(req.params.id)));
    
    res.json({ message: '浏览量已更新' });
  } catch (error) {
    next(error);
  }
});

// 更新文章状态
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    const articleId = parseInt(req.params.id);
    const userId = req.userId;

    // 验证状态值
    const validStatuses = ['draft', 'published', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 检查权限
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    const isAdmin = currentUser?.role === 'admin';
    const isAuthor = article.authorId === userId;

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ message: '无权限修改此文章状态' });
    }

    const updatedArticle = await db
      .update(articles)
      .set({ 
        status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(articles.id, articleId))
      .returning();

    res.json(updatedArticle[0]);
  } catch (error) {
    next(error);
  }
});

// 获取文章反应状态
router.get('/:id/reaction', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId; // 如果用户未登录，这里会是 undefined

    // 获取所有反应计数
    const reactionCounts = await db
      .select({
        type: articleReactions.type,
        count: sql`count(*)`
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
      counts[count.type] = Number(count.count);
    });

    // 如果用户已登录，获取用户的反应状态
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
      
      if (reaction) {
        userReaction = reaction.type;
      }
    }

    res.json({
      userReaction,
      reactionCounts: counts
    });
  } catch (error) {
    console.error('获取文章反应状态失败:', error);
    next(error);
  }
});

// 获取文章反应状态
router.get('/:id/reactions', async (req, res, next) => {
  try {
    const { type, page = 1, pageSize = 10 } = req.query;
    const articleId = parseInt(req.params.id);
    const offset = (Number(page) - 1) * Number(pageSize);

    const conditions = [eq(articleReactions.articleId, articleId)];
    if (type && ['like', 'love', 'haha', 'angry'].includes(type)) {
      conditions.push(eq(articleReactions.type, type));
    }

    // 获取反应列表和总数
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
      db.select({ count: sql`count(*)` })
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

// 获取文章标签
router.get('/:id/tags', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);

    const tags = await db
      .select({
        id: tags.id,
        name: tags.name,
        createdAt: tags.createdAt
      })
      .from(articleTags)
      .leftJoin(tags, eq(tags.id, articleTags.tagId))
      .where(eq(articleTags.articleId, articleId))
      .orderBy(desc(tags.createdAt));

    res.json(tags);
  } catch (error) {
    next(error);
  }
});

// 更新文章标签
router.put('/:id/tags', authMiddleware, async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: '标签必须是数组' });
    }

    // 检查文章所有权
    const article = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, articleId),
          eq(articles.authorId, req.userId)
        )
      )
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在或无权限' });
    }

    // 开启事务处理标签更新
    await db.transaction(async (tx) => {
      // 1. 删除原有标签
      await tx
        .delete(articleTags)
        .where(eq(articleTags.articleId, articleId));

      // 2. 添加新标签
      for (const tagName of tags) {
        // 查找或创建标签
        let [tag] = await tx
          .select()
          .from(tags)
          .where(eq(tags.name, tagName));

        if (!tag) {
          [tag] = await tx
            .insert(tags)
            .values({
              name: tagName,
              createdAt: new Date().toISOString()
            })
            .returning();
        }

        // 创建文章-标签关联
        await tx
          .insert(articleTags)
          .values({
            articleId,
            tagId: tag.id,
            createdAt: new Date().toISOString()
          });
      }
    });

    // 获取更新后的标签列表
    const updatedTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        createdAt: tags.createdAt
      })
      .from(articleTags)
      .leftJoin(tags, eq(tags.id, articleTags.tagId))
      .where(eq(articleTags.articleId, articleId))
      .orderBy(desc(tags.createdAt));

    res.json(updatedTags);
  } catch (error) {
    next(error);
  }
});

// 获取文章评论
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const articleId = parseInt(req.params.id);
    const offset = (Number(page) - 1) * Number(pageSize);

    // 并发查询评论列表和总数
    const [commentsList, total] = await Promise.all([
      db.select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        }
      })
        .from(comments)
        .leftJoin(users, eq(users.id, comments.userId))
        .where(eq(comments.articleId, articleId))
        .orderBy(desc(comments.createdAt))
        .limit(Number(pageSize))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(comments)
        .where(eq(comments.articleId, articleId))
    ]);

    res.json({
      items: commentsList,
      total: total[0].count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    next(error);
  }
});

// 添加文章评论
router.post('/:id/comments', authMiddleware, async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.userId;

    if (!content) {
      return res.status(400).json({ message: '评论内容不能为空' });
    }

    // 检查文章是否存在
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 创建评论
    const [newComment] = await db
      .insert(comments)
      .values({
        content,
        articleId,
        userId,
        createdAt: new Date().toISOString()
      })
      .returning();

    // 获取评论详情（包括用户信息）
    const commentWithUser = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.id, newComment.id))
      .get();

    res.status(201).json(commentWithUser);
  } catch (error) {
    next(error);
  }
});

// 删除文章评论
router.delete('/:articleId/comments/:commentId', authMiddleware, async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.articleId);
    const commentId = parseInt(req.params.commentId);
    const userId = req.userId;

    // 检查评论是否存在
    const comment = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.articleId, articleId)
        )
      )
      .get();

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 检查权限（评论作者或文章作者可以删除评论）
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .get();

    if (comment.userId !== userId && article.authorId !== userId) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    // 删除评论
    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    res.json({ message: '评论已删除' });
  } catch (error) {
    next(error);
  }
});

// 删除文章封面
router.delete('/:id/cover', authMiddleware, async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId;

    const article = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, articleId),
          eq(articles.authorId, userId)
        )
      )
      .get();

    if (!article) {
      return res.status(404).json({ message: '文章不存在或无权限' });
    }

    if (article.imageUrl) {
      const imagePath = path.join(process.cwd(), article.imageUrl);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('删除封面图失败:', err);
      });

      await db
        .update(articles)
        .set({ imageUrl: null })
        .where(eq(articles.id, articleId));
    }

    res.json({ message: '封面已删除' });
  } catch (error) {
    next(error);
  }
});

// 添加或更新文章反应
router.post('/:id/reaction', authMiddleware, async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId;

    console.log('收到反应请求:', {
      articleId,
      userId,
      body: req.body,
      rawBody: JSON.stringify(req.body),
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'authorization': req.headers['authorization'] ? '存在' : '不存在'
      }
    });

    // 验证请求体
    if (!req.body || typeof req.body !== 'object') {
      console.error('无效的请求体:', req.body);
      return res.status(400).json({ message: '无效的请求体' });
    }

    const { type } = req.body;
    console.log('解析的反应类型:', type);

    if (!type || typeof type !== 'string') {
      console.error('缺少反应类型或类型无效');
      return res.status(400).json({ message: '缺少反应类型或类型无效' });
    }

    // 验证反应类型
    const validTypes = ['like', 'love', 'haha', 'angry'];
    if (!validTypes.includes(type)) {
      console.error('无效的反应类型:', type);
      return res.status(400).json({ message: '无效的反应类型' });
    }

    // 检查文章是否存在
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .get();

    if (!article) {
      console.error('文章不存在:', articleId);
      return res.status(404).json({ message: '文章不存在' });
    }

    try {
      // 检查用户是否已经对这篇文章有反应
      const existingReaction = await db
        .select()
        .from(articleReactions)
        .where(
          and(
            eq(articleReactions.articleId, articleId),
            eq(articleReactions.userId, userId)
          )
        )
        .get();

      console.log('现有反应:', existingReaction);

      let action = '';
      if (existingReaction) {
        // 如果已有反应，先删除现有反应
        console.log('删除现有反应');
        await db
          .delete(articleReactions)
          .where(eq(articleReactions.id, existingReaction.id));

        // 如果新的反应类型与旧的不同，则创建新反应
        if (existingReaction.type !== type) {
          console.log('创建新的反应:', type);
          action = 'create';
          await db
            .insert(articleReactions)
            .values({
              articleId,
              userId,
              type,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
        } else {
          action = 'delete';
        }
      } else {
        // 如果没有现有反应，则创建新反应
        console.log('创建新的反应');
        action = 'create';
        await db
          .insert(articleReactions)
          .values({
            articleId,
            userId,
            type,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
      }

      // 获取更新后的反应统计
      const reactionCounts = await db
        .select({
          type: articleReactions.type,
          count: sql`count(*)`
        })
        .from(articleReactions)
        .where(eq(articleReactions.articleId, articleId))
        .groupBy(articleReactions.type);

      console.log('反应统计:', reactionCounts);

      // 构建反应计数对象
      const counts = {
        like: 0,
        love: 0,
        haha: 0,
        angry: 0
      };
      
      reactionCounts.forEach(count => {
        counts[count.type] = Number(count.count);
      });

      // 获取用户当前的反应状态
      const userReaction = action === 'delete' ? null : await db
        .select()
        .from(articleReactions)
        .where(
          and(
            eq(articleReactions.articleId, articleId),
            eq(articleReactions.userId, userId)
          )
        )
        .get();

      const response = {
        userReaction: action === 'delete' ? null : userReaction?.type || null,
        reactionCounts: counts
      };

      console.log('返回更新后的反应状态:', {
        action,
        response,
        reactionCounts
      });
      
      return res.json(response);
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('处理文章反应失败:', error);
    console.error('错误堆栈:', error.stack);
    return res.status(500).json({ 
      message: '处理文章反应失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export { router as articlesRouter }; 