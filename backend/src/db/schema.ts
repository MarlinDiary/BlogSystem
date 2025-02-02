import { sql } from 'drizzle-orm';
import { 
  sqliteTable, 
  text, 
  integer, 
  unique, 
  foreignKey 
} from 'drizzle-orm/sqlite-core';

// 用户表
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  status: text('status', { enum: ['active', 'banned'] }).notNull().default('active'),
  banReason: text('ban_reason'),
  banExpireAt: text('ban_expire_at'),
  realName: text('real_name'),
  dateOfBirth: text('date_of_birth'),
  bio: text('bio'),
  avatarUrl: text('avatar_url').default('/uploads/avatars/default.png'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
} as const);

// 文章表
export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),      // 纯文本内容
  htmlContent: text('html_content'),       // 富文本 HTML 内容
  imageUrl: text('image_url'),
  status: text('status', { enum: ['draft', 'pending', 'published', 'rejected'] }).notNull().default('pending'),
  reviewedAt: text('reviewed_at'),
  reviewReason: text('review_reason'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at'),
  viewCount: integer('view_count').notNull().default(0),
} as const);

// 文章反应表
export const articleReactions = sqliteTable('article_reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['like', 'love', 'haha', 'angry'] }).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueReaction: unique().on(table.articleId, table.userId),
}) as const);

// 评论表（支持嵌套评论）
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  visibility: integer('visibility').notNull().default(1), // 1: 显示, 0: 隐藏
}, (table) => {
  return {
    parentIdFK: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id]
    })
  };
});

// 管理员表（标记用户为管理员）
export const adminUsers = sqliteTable('admin_users', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('admin'),
} as const);

// 标签表
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
} as const);

// 文章标签关联表
export const articleTags = sqliteTable('article_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueTag: unique().on(table.articleId, table.tagId),
}) as const);