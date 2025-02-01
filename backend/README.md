# 博客系统后端API文档

## 基础信息

- 基础URL: `http://localhost:3000/api`
- 所有请求和响应均使用JSON格式
- 认证方式：Bearer Token（在请求头中添加 `Authorization: Bearer <token>`）
- 默认分页大小：10条/页

## 目录
1. [认证相关](#认证相关)
2. [用户相关](#用户相关)
3. [文章相关](#文章相关)
4. [评论相关](#评论相关)
5. [管理员相关](#管理员相关)

## 认证相关

### 用户注册
```http
POST /auth/register
```

请求体：
```json
{
  "username": "string",
  "password": "string",
  "realName": "string",
  "dateOfBirth": "string (YYYY-MM-DD)",
  "bio": "string"
}
```

响应：
```json
{
  "token": "string"
}
```

### 用户登录
```http
POST /auth/login
```

请求体：
```json
{
  "username": "string",
  "password": "string"
}
```

响应：
```json
{
  "token": "string"
}
```

### 用户登出
```http
POST /auth/logout
```

需要认证：是

响应：
```json
{
  "message": "登出成功"
}
```

### 检查用户名是否可用
```http
GET /auth/check-username/:username
```

响应：
```json
{
  "available": boolean
}
```

## 用户相关

### 获取当前用户信息
```http
GET /users/me
```

需要认证：是

响应：
```json
{
  "id": number,
  "username": "string",
  "realName": "string",
  "dateOfBirth": "string",
  "bio": "string",
  "avatarUrl": "string",
  "createdAt": "string"
}
```

### 更新用户信息
```http
PUT /users/me
```

需要认证：是

请求体：
```json
{
  "username": "string",
  "realName": "string",
  "dateOfBirth": "string",
  "bio": "string",
  "avatarUrl": "string"
}
```

### 上传用户头像
```http
POST /users/avatar
```

需要认证：是

请求体：
- Content-Type: multipart/form-data
- 字段名：avatar

响应：
```json
{
  "avatarUrl": "string"
}
```

### 获取用户列表
```http
GET /users
```

查询参数：
- page: 页码（默认1）
- pageSize: 每页数量（默认10）

响应：
```json
{
  "items": [
    {
      "id": number,
      "username": "string",
      "realName": "string",
      "bio": "string",
      "avatarUrl": "string",
      "createdAt": "string",
      "articleCount": number,
      "commentCount": number
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### 获取用户详情
```http
GET /users/:id
```

响应：
```json
{
  "id": number,
  "username": "string",
  "realName": "string",
  "bio": "string",
  "avatarUrl": "string",
  "createdAt": "string",
  "articleCount": number,
  "commentCount": number
}
```

### 获取用户的文章列表
```http
GET /users/:id/articles
```

查询参数：
- page: 页码（默认1）
- pageSize: 每页数量（默认10）

响应：
```json
{
  "items": [
    {
      "id": number,
      "title": "string",
      "content": "string",
      "imageUrl": "string",
      "status": "string",
      "viewCount": number,
      "createdAt": "string",
      "updatedAt": "string",
      "commentCount": number,
      "likeCount": number
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### 获取用户的评论列表
```http
GET /users/:id/comments
```

查询参数：
- page: 页码（默认1）
- pageSize: 每页数量（默认10）

响应：
```json
{
  "items": [
    {
      "id": number,
      "content": "string",
      "createdAt": "string",
      "visibility": number,
      "article": {
        "id": number,
        "title": "string"
      }
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

## 文章相关

### 获取文章列表
```http
GET /articles
```

查询参数：
- page: 页码（默认1）
- pageSize: 每页数量（默认10）
- search: 搜索关键词
- sort: 排序字段（createdAt/viewCount/likeCount）
- order: 排序方向（asc/desc）
- status: 文章状态（published/draft/pending_review）

响应：
```json
{
  "items": [
    {
      "id": number,
      "title": "string",
      "content": "string",
      "htmlContent": "string",
      "imageUrl": "string",
      "status": "string",
      "viewCount": number,
      "createdAt": "string",
      "updatedAt": "string",
      "author": {
        "id": number,
        "username": "string",
        "avatarUrl": "string"
      },
      "commentCount": number,
      "likeCount": number
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### 创建文章
```http
POST /articles
```

需要认证：是

请求体：
```json
{
  "title": "string",
  "content": "string",
  "htmlContent": "string",
  "imageUrl": "string"
}
```

### 获取文章详情
```http
GET /articles/:id
```

响应：
```json
{
  "id": number,
  "title": "string",
  "content": "string",
  "htmlContent": "string",
  "imageUrl": "string",
  "status": "string",
  "viewCount": number,
  "createdAt": "string",
  "updatedAt": "string",
  "author": {
    "id": number,
    "username": "string",
    "avatarUrl": "string"
  }
}
```

### 更新文章
```http
PUT /articles/:id
```

需要认证：是

请求体：
```json
{
  "title": "string",
  "content": "string",
  "imageUrl": "string"
}
```

### 删除文章
```http
DELETE /articles/:id
```

需要认证：是

### 上传文章封面
```http
POST /articles/:id/cover
```

需要认证：是

请求体：
- Content-Type: multipart/form-data
- 字段名：cover

响应：
```json
{
  "imageUrl": "string"
}
```

### 删除文章封面
```http
DELETE /articles/:id/cover
```

需要认证：是

### 获取文章点赞状态
```http
GET /articles/:id/like
```

需要认证：是

响应：
```json
{
  "liked": boolean,
  "totalLikes": number
}
```

### 点赞/取消点赞文章
```http
POST /articles/:id/like
```

需要认证：是

响应：
```json
{
  "liked": boolean,
  "totalLikes": number
}
```

### 获取文章点赞用户列表
```http
GET /articles/:id/likes
```

查询参数：
- page: 页码（默认1）
- pageSize: 每页数量（默认10）

响应：
```json
{
  "items": [
    {
      "user": {
        "id": number,
        "username": "string",
        "avatarUrl": "string"
      }
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### 更新文章状态
```http
PATCH /articles/:id/status
```

需要认证：是

请求体：
```json
{
  "status": "string" // draft/published/pending_review
}
```

### 增加文章浏览量
```http
POST /articles/:id/view
```

### Markdown预览
```http
POST /articles/preview
```

请求体：
```json
{
  "content": "string"
}
```

响应：
```json
{
  "html": "string"
}
```

## 评论相关

### 获取文章评论
```http
GET /comments/article/:articleId
```

响应：
```json
[
  {
    "id": number,
    "content": "string",
    "createdAt": "string",
    "parentId": number | null,
    "visibility": number,
    "user": {
      "id": number,
      "username": "string",
      "avatarUrl": "string"
    },
    "children": [
      // 嵌套的子评论，结构相同
    ]
  }
]
```

### 发表评论
```http
POST /comments
```

需要认证：是

请求体：
```json
{
  "articleId": number,
  "content": "string",
  "parentId": number | null
}
```

### 切换评论可见性
```http
PATCH /comments/:id/visibility
```

需要认证：是

响应：
```json
{
  "id": number,
  "visibility": number
}
```

### 删除评论
```http
DELETE /comments/:id
```

需要认证：是

## 管理员相关

所有管理员API都需要管理员权限。

### 获取站点统计数据
```http
GET /admin/stats
```

响应：
```json
{
  "users": {
    "total": number,
    "active": number,
    "banned": number
  },
  "articles": {
    "total": number,
    "published": number,
    "pending": number,
    "totalViews": number
  },
  "comments": {
    "total": number,
    "visible": number,
    "hidden": number
  },
  "likes": {
    "total": number
  }
}
```

### 获取所有用户列表
```http
GET /admin/users
```

响应：
```json
[
  {
    "id": number,
    "username": "string",
    "realName": "string",
    "dateOfBirth": "string",
    "bio": "string",
    "avatarUrl": "string",
    "createdAt": "string",
    "articleCount": number,
    "commentCount": number,
    "hasAvatar": boolean
  }
]
```

### 获取用户详情（管理员视图）
```http
GET /admin/users/:id
```

### 删除用户
```http
DELETE /admin/users/:id
```

### 封禁用户
```http
POST /admin/users/:id/ban
```

请求体：
```json
{
  "reason": "string",
  "duration": number // 小时
}
```

### 解封用户
```http
POST /admin/users/:id/unban
```

### 审核文章
```http
POST /admin/articles/:id/review
```

请求体：
```json
{
  "status": "string", // published/rejected
  "reason": "string"
}
```

### 删除文章（管理员）
```http
DELETE /admin/articles/:id
```

### 删除评论（管理员）
```http
DELETE /admin/comments/:id
```

### 批量删除评论
```http
POST /admin/comments/batch-delete
```

请求体：
```json
{
  "commentIds": number[]
}
```

### 批量删除文章
```http
POST /admin/articles/batch-delete
```

请求体：
```json
{
  "articleIds": number[]
}
```

## 错误响应

所有API在发生错误时会返回以下格式：

```json
{
  "message": "错误信息",
  "error": "详细错误信息（仅在开发环境）"
}
```

常见HTTP状态码：
- 200: 请求成功
- 201: 创建成功
- 204: 删除成功
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器错误 