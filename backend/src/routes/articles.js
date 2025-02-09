import express from 'express';
import { query, get, run, transaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { upload, uploadArticleImage, uploadArticleCover, getUrlPrefix } from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// 处理图片URL的函数
function getFullImageUrl(imageUrl, options = {}) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  
  // 获取后端 API URL
  const apiUrl = process.env.SERVER_URL || 'http://localhost:3000';
  
  // 如果 imageUrl 已经包含了完整的路径，直接返回
  if (imageUrl.startsWith('/api/')) {
    return imageUrl;
  }
  
  // 确保 imageUrl 以 / 开头
  const normalizedImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // 处理图片参数
  const { quality, size } = options;
  const params = new URLSearchParams();
  if (quality) params.append('quality', quality);
  if (size) params.append('size', size);
  
  // 返回完整的图片 URL
  const baseUrl = `${apiUrl}${normalizedImageUrl}`;
  return params.toString() ? `${baseUrl}?${params}` : baseUrl;
}

// 获取图片 ETag
function getImageETag(filePath) {
  const stats = fs.statSync(filePath);
  return `W/"${stats.size}-${stats.mtime.getTime()}"`;
}

// 设置图片缓存头
function setImageCacheHeaders(res, etag) {
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.setHeader('ETag', etag);
}

// 处理图片请求
function handleImageRequest(req, res, filePath) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: '图片文件不存在' });
  }

  const stats = fs.statSync(filePath);
  const etag = `W/"${stats.size}-${stats.mtime.getTime()}"`;

  // 设置缓存控制头
  res.setHeader('Cache-Control', 'public, max-age=604800, must-revalidate');
  res.setHeader('ETag', etag);

  // 检查条件请求
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    return res.status(304).end();
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 
                     ext === '.gif' ? 'image/gif' :
                     ext === '.webp' ? 'image/webp' :
                     ext === '.avif' ? 'image/avif' :
                     'image/jpeg';
  res.setHeader('Content-Type', contentType);
  
  // 使用 stream 发送文件以提高性能
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}

// 获取文章列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, search, sort = 'createdAt', order = 'desc', status = 'all' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建基础查询
    let sql = `
      SELECT 
        a.id, a.title, SUBSTRING(a.content, 1, 200) as content, a.image_url as imageUrl, 
        a.status, a.view_count as viewCount, 
        a.created_at as createdAt, a.updated_at as updatedAt,
        u.id as author_id, u.username as author_username, 
        u.avatar_url as author_avatarUrl,
        COUNT(DISTINCT c.id) as commentCount,
        (
          SELECT COUNT(*)
          FROM article_reactions ar2
          WHERE ar2.article_id = a.id
          AND ar2.type IN ('like', 'love', 'haha', 'angry')
        ) as reactionCount
      FROM articles a
      LEFT JOIN users u ON u.id = a.author_id
      LEFT JOIN comments c ON c.article_id = a.id
      WHERE 1=1
    `;
    const params = [];

    // 添加状态过滤
    if (status !== 'all') {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    // 添加搜索条件
    if (search) {
      sql += ' AND (a.title LIKE ? OR a.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 添加分组
    sql += ' GROUP BY a.id';

    // 添加排序
    if (sort === 'createdAt') {
      sql += ` ORDER BY a.created_at ${order === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sort === 'viewCount') {
      sql += ` ORDER BY a.view_count ${order === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sort === 'commentCount') {
      sql += ` ORDER BY commentCount ${order === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sort === 'reactionCount') {
      sql += ` ORDER BY reactionCount ${order === 'desc' ? 'DESC' : 'ASC'}`;
    }

    // 添加分页
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    // 获取文章列表
    const articlesList = await query(sql, params);

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as count 
      FROM articles a 
      WHERE 1=1 
      ${status !== 'all' ? 'AND a.status = ?' : ''}
      ${search ? 'AND (a.title LIKE ? OR a.content LIKE ?)' : ''}
    `;
    const countParams = [];
    if (status !== 'all') countParams.push(status);
    if (search) countParams.push(`%${search}%`, `%${search}%`);
    
    const [total] = await query(countSql, countParams);

    // 如果有文章，获取评论数和反应数
    if (articlesList.length > 0) {
      const articleIds = articlesList.map(article => article.id);
      
      // 获取评论数
      const commentCounts = await query(
        `SELECT article_id, COUNT(*) as count 
         FROM comments 
         WHERE article_id IN (${articleIds.map(() => '?').join(',')})
         GROUP BY article_id`,
        articleIds
      );

      // 获取反应数
      const reactionCounts = await query(
        `SELECT article_id, COUNT(*) as count 
         FROM article_reactions 
         WHERE article_id IN (${articleIds.map(() => '?').join(',')})
         GROUP BY article_id`,
        articleIds
      );

      // 将评论数和反应数添加到文章列表中
      const articlesWithCounts = articlesList.map(article => ({
        ...article,
        author: {
          id: article.author_id,
          username: article.author_username,
          avatarUrl: article.author_avatarUrl
        },
        commentCount: Number(commentCounts.find(c => c.article_id === article.id)?.count || 0),
        reactionCount: Number(reactionCounts.find(r => r.article_id === article.id)?.count || 0)
      }));

      // 清理临时字段
      articlesWithCounts.forEach(article => {
        delete article.author_id;
        delete article.author_username;
        delete article.author_avatarUrl;
      });

      res.json({
        items: articlesWithCounts,
        total: Number(total.count),
        page: Number(page),
        pageSize: Number(pageSize)
      });
    } else {
      res.json({
        items: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize)
      });
    }
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
    const result = await transaction(async (tx) => {
      try {
        console.log('开始创建文章事务');
        
        // 1. 创建文章
        const result = await tx.run(
          `INSERT INTO articles (
            title, content, html_content, image_url, status, 
            author_id, published_at, created_at, updated_at, view_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)`,
          [
            title.trim(),
            content.trim(),
            htmlContent || '',
            processedImageUrl,
            status,
            req.userId,
            status === 'published' ? new Date().toISOString() : null
          ]
        );

        const articleId = result.lastID;
        console.log('文章创建成功:', { id: articleId });

        // 2. 处理标签
        const uniqueTags = [...new Set(tagNames.map(tag => tag.trim()).filter(Boolean))];
        console.log('处理标签:', uniqueTags);

        for (const tagName of uniqueTags) {
          // 2.1 查找或创建标签
          let tag = await tx.get('SELECT * FROM tags WHERE name = ?', [tagName]);

          if (!tag) {
            console.log('创建新标签:', tagName);
            const result = await tx.run(
              'INSERT INTO tags (name, created_at) VALUES (?, CURRENT_TIMESTAMP)',
              [tagName]
            );
            tag = { id: result.lastID };
          }

          // 2.2 创建文章-标签关联
          console.log('创建文章-标签关联:', { articleId, tagId: tag.id });
          await tx.run(
            'INSERT INTO article_tags (article_id, tag_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [articleId, tag.id]
          );
        }

        return { id: articleId };
      } catch (error) {
        console.error('事务执行失败:', error);
        throw error;
      }
    });

    console.log('事务执行完成，获取完整文章信息');

    // 获取完整的文章信息（包括作者信息）
    const article = await query(
      `
        SELECT 
          a.id, a.title, a.content, a.html_content as htmlContent,
          a.image_url as imageUrl, a.status, a.view_count as viewCount,
          a.created_at as createdAt, a.updated_at as updatedAt,
          u.id as author_id, u.username as author_username,
          u.avatar_url as author_avatarUrl, u.real_name as author_realName,
          u.bio as author_bio, u.date_of_birth as author_dateOfBirth
        FROM articles a
        LEFT JOIN users u ON u.id = a.author_id
        WHERE a.id = ?
      `,
      [result.id]
    );

    if (!article || article.length === 0) {
      throw new Error('文章创建成功但获取详情失败');
    }

    // 格式化返回数据
    const articleData = article[0];
    
    // 获取评论数
    const [commentCount] = await query(
      `
        SELECT COUNT(*) as count 
        FROM comments 
        WHERE article_id = ?
      `,
      [articleData.id]
    );

    console.log('评论数:', commentCount);

    // 获取反应数
    const [reactionCount] = await query(
      `
        SELECT COUNT(*) as count 
        FROM article_reactions 
        WHERE article_id = ?
      `,
      [articleData.id]
    );

    console.log('反应数:', reactionCount);

    // 获取文章标签
    const tagResults = await query(
      `
        SELECT 
          t.id, t.name, t.created_at
        FROM article_tags at
        LEFT JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = ?
        ORDER BY t.created_at DESC
      `,
      [articleData.id]
    );

    console.log('文章标签:', tagResults);

    // 增加浏览量
    await query(
      `
        UPDATE articles
        SET view_count = view_count + 1
        WHERE id = ?
      `,
      [articleData.id]
    );

    // 在返回给前端时，添加服务器地址前缀
    const responseArticle = {
      id: articleData.id,
      title: articleData.title,
      content: articleData.content,
      htmlContent: articleData.htmlContent,
      imageUrl: getFullImageUrl(articleData.imageUrl),
      status: articleData.status,
      viewCount: articleData.viewCount,
      createdAt: articleData.createdAt,
      updatedAt: articleData.updatedAt,
      author: {
        id: articleData.author_id,
        username: articleData.author_username,
        avatarUrl: getFullImageUrl(articleData.author_avatarUrl),
        realName: articleData.author_realName,
        bio: articleData.author_bio,
        dateOfBirth: articleData.author_dateOfBirth
      },
      commentCount: Number(commentCount.count),
      reactionCount: Number(reactionCount.count),
      tags: tagResults
    };

    console.log('返回创建成功的文章:', responseArticle);
    res.status(201).json(responseArticle);
  } catch (error) {
    console.error('创建文章失败:', error);
    next(error);
  }
});

// 获取文章详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const articleId = Number(id);

    console.log('获取文章详情:', { articleId });

    // 获取文章基本信息
    const article = await query(
      `
        SELECT 
          a.id, a.title, a.content, a.html_content as htmlContent,
          a.image_url as imageUrl, a.status, a.view_count as viewCount,
          a.created_at as createdAt, a.updated_at as updatedAt,
          u.id as author_id, u.username as author_username,
          u.avatar_url as author_avatarUrl, u.real_name as author_realName,
          u.bio as author_bio, u.date_of_birth as author_dateOfBirth
        FROM articles a
        LEFT JOIN users u ON u.id = a.author_id
        WHERE a.id = ?
      `,
      [articleId]
    );

    console.log('文章查询结果:', article);

    if (!article || article.length === 0) {
      console.log('文章不存在:', articleId);
      return res.status(404).json({ message: '文章不存在' });
    }

    const articleData = article[0];
    
    // 获取评论数
    const [commentCount] = await query(
      `
        SELECT COUNT(*) as count 
        FROM comments 
        WHERE article_id = ?
      `,
      [articleId]
    );

    console.log('评论数:', commentCount);

    // 获取反应数
    const [reactionCount] = await query(
      `
        SELECT COUNT(*) as count 
        FROM article_reactions 
        WHERE article_id = ?
      `,
      [articleId]
    );

    console.log('反应数:', reactionCount);

    // 获取文章标签
    const tagResults = await query(
      `
        SELECT 
          t.id, t.name, t.created_at
        FROM article_tags at
        LEFT JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = ?
        ORDER BY t.created_at DESC
      `,
      [articleId]
    );

    console.log('文章标签:', tagResults);

    // 增加浏览量
    await query(
      `
        UPDATE articles
        SET view_count = view_count + 1
        WHERE id = ?
      `,
      [articleId]
    );

    // 在返回给前端时，添加服务器地址前缀
    const responseArticle = {
      id: articleData.id,
      title: articleData.title,
      content: articleData.content,
      htmlContent: articleData.htmlContent,
      imageUrl: getFullImageUrl(articleData.imageUrl),
      status: articleData.status,
      viewCount: articleData.viewCount,
      createdAt: articleData.createdAt,
      updatedAt: articleData.updatedAt,
      author: {
        id: articleData.author_id,
        username: articleData.author_username,
        avatarUrl: getFullImageUrl(articleData.author_avatarUrl),
        realName: articleData.author_realName,
        bio: articleData.author_bio,
        dateOfBirth: articleData.author_dateOfBirth
      },
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

    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ?
      `,
      [Number(id)]
    );

    if (!article || article.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article[0].author_id !== req.userId) {
      return res.status(403).json({ message: '无权修改此文章' });
    }

    const updatedArticle = await query(
      `
        UPDATE articles
        SET title = ?, content = ?, html_content = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `,
      [
        title || article[0].title,
        content || article[0].content,
        htmlContent || article[0].html_content,
        imageUrl || article[0].image_url,
        status || article[0].status,
        Number(id)
      ]
    );

    res.json(updatedArticle[0]);
  } catch (error) {
    next(error);
  }
});

// 删除文章
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ?
      `,
      [Number(id)]
    );

    if (!article || article.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article[0].author_id !== req.userId) {
      return res.status(403).json({ message: '无权删除此文章' });
    }

    await transaction(async (tx) => {
      // 删除文章的所有点赞
      await tx.run(
        'DELETE FROM article_reactions WHERE article_id = ?',
        [Number(id)]
      );
      
      // 删除文章的所有评论
      await tx.run(
        'DELETE FROM comments WHERE article_id = ?',
        [Number(id)]
      );
      
      // 删除文章的所有标签关联
      await tx.run(
        'DELETE FROM article_tags WHERE article_id = ?',
        [Number(id)]
      );

      // 如果文章有封面图，删除封面图文件
      if (article[0].image_url) {
        const imagePath = path.join(process.cwd(), article[0].image_url);
        fs.unlink(imagePath, (err) => {
          if (err) console.error(`删除文章 ${id} 的封面图失败:`, err);
        });
      }
      
      // 最后删除文章
      await tx.run(
        'DELETE FROM articles WHERE id = ?',
        [Number(id)]
      );
    });

    res.json({ message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
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

    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ?
      `,
      [Number(id)]
    );

    if (!article || article.length === 0) {
      // 删除上传的文件
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: '文章不存在' });
    }

    if (article[0].author_id !== req.userId) {
      // 删除上传的文件
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: '无权修改此文章' });
    }

    // 如果文章已有封面，删除旧文件
    if (article[0].image_url) {
      const oldImagePath = path.join(process.cwd(), article[0].image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const imageUrl = `/uploads/covers/${file.filename}`;

    const updatedArticle = await query(
      `
        UPDATE articles
        SET image_url = ?
        WHERE id = ?
        RETURNING *
      `,
      [imageUrl, Number(id)]
    );

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
    const imageUrl = `${getUrlPrefix()}/covers/${req.file.filename}`;
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
    const imageUrl = `${getUrlPrefix()}/articles/${req.file.filename}`;
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
    await query(
      `
        UPDATE articles
        SET view_count = view_count + 1
        WHERE id = ?
      `,
      [parseInt(req.params.id)]
    );
    
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

    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ?
      `,
      [articleId]
    );

    if (!article || article.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 检查权限
    const currentUser = await query(
      `
        SELECT *
        FROM users
        WHERE id = ?
      `,
      [userId]
    );

    const isAdmin = currentUser[0]?.role === 'admin';
    const isAuthor = article[0].author_id === userId;

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ message: '无权限修改此文章状态' });
    }

    const updatedArticle = await query(
      `
        UPDATE articles
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `,
      [status, articleId]
    );

    res.json(updatedArticle[0]);
  } catch (error) {
    next(error);
  }
});

// 获取文章反应状态
router.get('/:id/reaction', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.user?.id; // 从 auth 中间件添加的 user 对象获取

    // 获取所有反应计数
    const reactionCounts = await query(
      `SELECT type, COUNT(*) as count
       FROM article_reactions
       WHERE article_id = ?
       GROUP BY type`,
      [articleId]
    );

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
      const reaction = await get(
        `SELECT type
         FROM article_reactions
         WHERE article_id = ? AND user_id = ?`,
        [articleId, userId]
      );
      
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

// 获取文章反应列表
router.get('/:id/reactions', async (req, res, next) => {
  try {
    const { type, page = 1, pageSize = 10 } = req.query;
    const articleId = parseInt(req.params.id);
    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建基础查询
    let sql = `
      SELECT 
        u.id as user_id, u.username, u.avatar_url,
        ar.type, ar.created_at
      FROM article_reactions ar
      LEFT JOIN users u ON u.id = ar.user_id
      WHERE ar.article_id = ?
    `;
    const params = [articleId];

    // 添加类型过滤
    if (type && ['like', 'love', 'haha', 'angry'].includes(type)) {
      sql += ' AND ar.type = ?';
      params.push(type);
    }

    // 添加排序和分页
    sql += ' ORDER BY ar.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    // 获取反应列表
    const reactionsList = await query(sql, params);

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as count 
      FROM article_reactions 
      WHERE article_id = ?
      ${type ? 'AND type = ?' : ''}
    `;
    const countParams = [articleId];
    if (type) countParams.push(type);
    
    const [total] = await query(countSql, countParams);

    // 格式化返回数据
    const formattedReactions = reactionsList.map(reaction => ({
      user: {
        id: reaction.user_id,
        username: reaction.username,
        avatarUrl: reaction.avatar_url
      },
      type: reaction.type,
      createdAt: reaction.created_at
    }));

    res.json({
      items: formattedReactions,
      total: Number(total[0].count),
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取文章反应列表失败:', error);
    next(error);
  }
});

// 获取文章标签
router.get('/:id/tags', async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);

    const tags = await query(
      `
        SELECT 
          t.id, t.name, t.created_at
        FROM article_tags at
        LEFT JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = ?
        ORDER BY t.created_at DESC
      `,
      [articleId]
    );

    res.json(tags);
  } catch (error) {
    next(error);
  }
});

// 更新文章标签
router.put('/:id/tags', authMiddleware, async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id);
    const { tags: tagNames } = req.body;

    console.log('Updating tags for article:', articleId);
    console.log('Received tags:', tagNames);

    if (!Array.isArray(tagNames)) {
      console.error('Invalid tags format:', tagNames);
      return res.status(400).json({ message: '标签必须是数组' });
    }

    // 检查文章所有权
    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ? AND author_id = ?
      `,
      [articleId, req.userId]
    );

    if (!article || article.length === 0) {
      console.error('Article not found or unauthorized:', { articleId, userId: req.userId });
      return res.status(404).json({ message: '文章不存在或无权限' });
    }

    try {
      // 开启事务处理标签更新
      await transaction(async (connection) => {
        console.log('Starting tag update transaction');
        
        // 1. 删除原有标签
        await query(
          `
            DELETE FROM article_tags
            WHERE article_id = ?
          `,
          [articleId],
          connection
        );
        console.log('Deleted existing tags');

        // 2. 添加新标签
        for (const tagName of tagNames) {
          // 查找或创建标签
          let [tag] = await query(
            `
              SELECT *
              FROM tags
              WHERE name = ?
            `,
            [tagName],
            connection
          );

          if (!tag) {
            console.log('Creating new tag:', tagName);
            [tag] = await query(
              `
                INSERT INTO tags (name, created_at)
                VALUES (?, CURRENT_TIMESTAMP)
                RETURNING *
              `,
              [tagName],
              connection
            );
          }

          // 创建文章-标签关联
          await query(
            `
              INSERT INTO article_tags (article_id, tag_id, created_at)
              VALUES (?, ?, CURRENT_TIMESTAMP)
            `,
            [articleId, tag.id],
            connection
          );
          console.log('Added tag association:', { articleId, tagId: tag.id, tagName });
        }
      });
      console.log('Tag update transaction completed successfully');

      // 获取更新后的标签列表
      const updatedTags = await query(
        `
          SELECT 
            t.id, t.name, t.created_at
          FROM article_tags at
          LEFT JOIN tags t ON t.id = at.tag_id
          WHERE at.article_id = ?
          ORDER BY t.created_at DESC
        `,
        [articleId]
      );
      console.log('Retrieved updated tags:', updatedTags);

      res.json(updatedTags);
    } catch (txError) {
      console.error('Transaction error:', txError);
      throw new Error(`标签更新事务失败: ${txError.message}`);
    }
  } catch (error) {
    console.error('Tag update failed:', error);
    res.status(500).json({ message: error.message || '服务器内部错误' });
  }
});

// 获取文章评论
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const articleId = parseInt(req.params.id);
    const offset = (Number(page) - 1) * Number(pageSize);

    // 获取评论列表
    const commentsList = await query(
      `
        SELECT 
          c.id, c.content, c.created_at,
          u.id as user_id, u.username, u.avatar_url
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.article_id = ?
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [articleId, Number(pageSize), offset]
    );

    // 获取总数
    const [total] = await query(
      `
        SELECT COUNT(*) as count
        FROM comments
        WHERE article_id = ?
      `,
      [articleId]
    );

    // 格式化返回数据
    const formattedComments = commentsList.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      user: {
        id: comment.user_id,
        username: comment.username,
        avatarUrl: comment.avatar_url
      }
    }));

    res.json({
      items: formattedComments,
      total: Number(total[0].count),
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
    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ?
      `,
      [articleId]
    );

    if (!article || article.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 创建评论
    const result = await query(
      `
        INSERT INTO comments (content, article_id, user_id, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        RETURNING *
      `,
      [content, articleId, userId]
    );

    // 获取评论详情（包括用户信息）
    const comment = await query(
      `
        SELECT 
          c.id, c.content, c.created_at,
          u.id as user_id, u.username, u.avatar_url
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.id = ?
      `,
      [result.id]
    );

    res.status(201).json(comment[0]);
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
    const comment = await query(
      `
        SELECT *
        FROM comments
        WHERE id = ? AND article_id = ?
      `,
      [commentId, articleId]
    );

    if (!comment || comment.length === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 检查权限（评论作者或文章作者可以删除评论）
    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ?
      `,
      [articleId]
    );

    if (comment[0].user_id !== userId && article[0].author_id !== userId) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    // 删除评论
    await query(
      `
        DELETE FROM comments
        WHERE id = ?
      `,
      [commentId]
    );

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

    const article = await query(
      `
        SELECT *
        FROM articles
        WHERE id = ? AND author_id = ?
      `,
      [articleId, userId]
    );

    if (!article || article.length === 0) {
      return res.status(404).json({ message: '文章不存在或无权限' });
    }

    if (article[0].image_url) {
      const imagePath = path.join(process.cwd(), article[0].image_url);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('删除封面图失败:', err);
      });

      await query(
        `
          UPDATE articles
          SET image_url = NULL
          WHERE id = ?
        `,
        [articleId]
      );
    }

    res.json({ message: '封面已删除' });
  } catch (error) {
    next(error);
  }
});

// 添加或更新文章反应
router.post('/:id/reaction', authMiddleware, async (req, res, next) => {
  try {
    const { type } = req.body;
    const articleId = parseInt(req.params.id);
    const userId = req.user.id;

    console.log('处理文章反应:', { articleId, userId, type });

    // 验证反应类型
    if (!['like', 'love', 'haha', 'angry'].includes(type)) {
      return res.status(400).json({ message: '无效的反应类型' });
    }

    // 检查文章是否存在
    const article = await get(
      'SELECT * FROM articles WHERE id = ?',
      [articleId]
    );

    if (!article) {
      return res.status(404).json({ message: '文章不存在' });
    }

    // 检查是否已经有反应
    const existingReaction = await get(
      'SELECT * FROM article_reactions WHERE article_id = ? AND user_id = ?',
      [articleId, userId]
    );

    let action;
    if (existingReaction) {
      if (existingReaction.type === type) {
        // 如果是相同的反应类型，则删除反应
        await run(
          'DELETE FROM article_reactions WHERE id = ?',
          [existingReaction.id]
        );
        action = 'removed';
      } else {
        // 如果是不同的反应类型，则更新反应
        await run(
          'UPDATE article_reactions SET type = ? WHERE id = ?',
          [type, existingReaction.id]
        );
        action = 'updated';
      }
    } else {
      // 添加新反应
      await run(
        'INSERT INTO article_reactions (article_id, user_id, type) VALUES (?, ?, ?)',
        [articleId, userId, type]
      );
      action = 'added';
    }

    // 获取更新后的反应计数
    const reactionCounts = await query(
      `SELECT type, COUNT(*) as count
       FROM article_reactions
       WHERE article_id = ?
       GROUP BY type`,
      [articleId]
    );

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

    // 返回完整的响应
    res.json({
      action,
      type: action !== 'removed' ? type : undefined,
      reactionCounts: counts
    });
  } catch (error) {
    console.error('处理文章反应失败:', error);
    next(error);
  }
});

export { router as articlesRouter }; 