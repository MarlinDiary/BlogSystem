# API Implementation Guide

## Frontend Implementation (Svelte)

### 1. Authentication API
```typescript
// stores/auth.ts
interface AuthStore {
  token: string;
  register: (userData: RegisterData) => Promise<void>;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  checkUsername: (username: string) => Promise<boolean>;
}

// API Endpoints
const AUTH_API = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  checkUsername: '/api/auth/check-username'
};
```

### 2. User API
```typescript
// stores/user.ts
interface UserStore {
  getCurrentUser: () => Promise<User>;
  updateUser: (userData: UpdateUserData) => Promise<User>;
  uploadAvatar: (file: File) => Promise<string>;
  getUserList: (page: number, pageSize: number) => Promise<PageData<User>>;
  getUserDetail: (userId: string) => Promise<User>;
  getUserArticles: (userId: string, page: number) => Promise<PageData<Article>>;
  getUserComments: (userId: string, page: number) => Promise<PageData<Comment>>;
}

// API Endpoints
const USER_API = {
  me: '/api/users/me',
  avatar: '/api/users/avatar',
  users: '/api/users',
  userDetail: '/api/users/:id',
  userArticles: '/api/users/:id/articles',
  userComments: '/api/users/:id/comments'
};
```

### 3. Article API
```typescript
// stores/article.ts
interface ArticleStore {
  getArticles: (params: ArticleQueryParams) => Promise<PageData<Article>>;
  createArticle: (articleData: CreateArticleData) => Promise<Article>;
  getArticleDetail: (articleId: string) => Promise<Article>;
  updateArticle: (articleId: string, data: UpdateArticleData) => Promise<Article>;
  deleteArticle: (articleId: string) => Promise<void>;
  uploadCover: (articleId: string, file: File) => Promise<string>;
  deleteCover: (articleId: string) => Promise<void>;
  getLikeStatus: (articleId: string) => Promise<LikeStatus>;
  toggleLike: (articleId: string) => Promise<LikeStatus>;
  getLikes: (articleId: string, page: number) => Promise<PageData<Like>>;
  updateStatus: (articleId: string, status: string) => Promise<Article>;
  increaseView: (articleId: string) => Promise<void>;
  previewMarkdown: (content: string) => Promise<string>;
}

// API Endpoints
const ARTICLE_API = {
  articles: '/api/articles',
  article: '/api/articles/:id',
  cover: '/api/articles/:id/cover',
  like: '/api/articles/:id/like',
  likes: '/api/articles/:id/likes',
  status: '/api/articles/:id/status',
  view: '/api/articles/:id/view',
  preview: '/api/articles/preview'
};
```

### 4. Comment API
```typescript
// stores/comment.ts
interface CommentStore {
  getArticleComments: (articleId: string) => Promise<Comment[]>;
  createComment: (commentData: CreateCommentData) => Promise<Comment>;
  toggleVisibility: (commentId: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
}

// API Endpoints
const COMMENT_API = {
  articleComments: '/api/comments/article/:articleId',
  comments: '/api/comments',
  visibility: '/api/comments/:id/visibility'
};
```

### 5. Admin API
```typescript
// stores/admin.ts
interface AdminStore {
  getStats: () => Promise<SiteStats>;
  getUsers: () => Promise<User[]>;
  deleteUser: (userId: string) => Promise<void>;
  banUser: (userId: string, data: BanData) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  reviewArticle: (articleId: string, data: ReviewData) => Promise<void>;
  deleteArticle: (articleId: string) => Promise<void>;
  batchDeleteArticles: (articleIds: string[]) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  batchDeleteComments: (commentIds: string[]) => Promise<void>;
}

// API Endpoints
const ADMIN_API = {
  stats: '/api/admin/stats',
  users: '/api/admin/users',
  user: '/api/admin/users/:id',
  userBan: '/api/admin/users/:id/ban',
  userUnban: '/api/admin/users/:id/unban',
  articleReview: '/api/admin/articles/:id/review',
  article: '/api/admin/articles/:id',
  articleBatchDelete: '/api/admin/articles/batch-delete',
  comment: '/api/admin/comments/:id',
  commentBatchDelete: '/api/admin/comments/batch-delete'
};
```

## Backend Implementation (Java Swing)

### 1. Authentication Controller
```java
public class AuthController {
    @Route("/api/auth/register")
    public Response register(RegisterRequest request);

    @Route("/api/auth/login")
    public Response login(LoginRequest request);

    @Route("/api/auth/logout")
    public Response logout();

    @Route("/api/auth/check-username/{username}")
    public Response checkUsername(String username);
}
```

### 2. User Controller
```java
public class UserController {
    @Route("/api/users/me")
    public Response getCurrentUser();

    @Route("/api/users/me")
    public Response updateUser(UpdateUserRequest request);

    @Route("/api/users/avatar")
    public Response uploadAvatar(MultipartFile file);

    @Route("/api/users")
    public Response getUsers(PageRequest pageRequest);

    @Route("/api/users/{id}")
    public Response getUserDetail(String id);

    @Route("/api/users/{id}/articles")
    public Response getUserArticles(String id, PageRequest pageRequest);

    @Route("/api/users/{id}/comments")
    public Response getUserComments(String id, PageRequest pageRequest);
}
```

### 3. Article Controller
```java
public class ArticleController {
    @Route("/api/articles")
    public Response getArticles(ArticleQueryParams params);

    @Route("/api/articles")
    public Response createArticle(CreateArticleRequest request);

    @Route("/api/articles/{id}")
    public Response getArticle(String id);

    @Route("/api/articles/{id}")
    public Response updateArticle(String id, UpdateArticleRequest request);

    @Route("/api/articles/{id}")
    public Response deleteArticle(String id);

    @Route("/api/articles/{id}/cover")
    public Response uploadCover(String id, MultipartFile file);

    @Route("/api/articles/{id}/cover")
    public Response deleteCover(String id);

    @Route("/api/articles/{id}/like")
    public Response getLikeStatus(String id);

    @Route("/api/articles/{id}/like")
    public Response toggleLike(String id);

    @Route("/api/articles/{id}/likes")
    public Response getLikes(String id, PageRequest pageRequest);

    @Route("/api/articles/{id}/status")
    public Response updateStatus(String id, UpdateStatusRequest request);

    @Route("/api/articles/{id}/view")
    public Response increaseView(String id);

    @Route("/api/articles/preview")
    public Response previewMarkdown(PreviewRequest request);
}
```

### 4. Comment Controller
```java
public class CommentController {
    @Route("/api/comments/article/{articleId}")
    public Response getArticleComments(String articleId);

    @Route("/api/comments")
    public Response createComment(CreateCommentRequest request);

    @Route("/api/comments/{id}/visibility")
    public Response toggleVisibility(String id);

    @Route("/api/comments/{id}")
    public Response deleteComment(String id);
}
```

### 5. Admin Controller
```java
public class AdminController {
    @Route("/api/admin/stats")
    public Response getStats();

    @Route("/api/admin/users")
    public Response getUsers();

    @Route("/api/admin/users/{id}")
    public Response deleteUser(String id);

    @Route("/api/admin/users/{id}/ban")
    public Response banUser(String id, BanRequest request);

    @Route("/api/admin/users/{id}/unban")
    public Response unbanUser(String id);

    @Route("/api/admin/articles/{id}/review")
    public Response reviewArticle(String id, ReviewRequest request);

    @Route("/api/admin/articles/{id}")
    public Response deleteArticle(String id);

    @Route("/api/admin/articles/batch-delete")
    public Response batchDeleteArticles(BatchDeleteRequest request);

    @Route("/api/admin/comments/{id}")
    public Response deleteComment(String id);

    @Route("/api/admin/comments/batch-delete")
    public Response batchDeleteComments(BatchDeleteRequest request);
}
``` 