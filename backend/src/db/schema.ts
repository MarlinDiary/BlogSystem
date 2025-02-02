import { sql } from 'drizzle-orm';
import { 
  sqliteTable, 
  text, 
  integer, 
  unique, 
  foreignKey,
  SQLiteTableWithColumns
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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
} as const);

// 文章表
export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  status: text('status', { enum: ['draft', 'pending', 'published', 'rejected'] }).notNull().default('draft'),
  viewCount: integer('view_count').notNull().default(0),
  authorId: integer('author_id').references(() => users.id),
  publishedAt: text('published_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
} as const);

// 评论表
export let comments: SQLiteTableWithColumns<any>;
comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  userId: integer('user_id').references(() => users.id),
  articleId: integer('article_id').references(() => articles.id),
  parentId: integer('parent_id').references((): any => comments.id),
  visibility: text('visibility').default('visible'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
} as const);

// 标签表
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
} as const);

// 文章标签关联表
export const articleTags = sqliteTable('article_tags', {
  articleId: integer('article_id').notNull().references(() => articles.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: unique().on(table.articleId, table.tagId),
}) as const);

// 文章反应表
export const articleReactions = sqliteTable('article_reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id').notNull().references(() => articles.id),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
} as const);

// 管理员表（标记用户为管理员）
export const adminUsers = sqliteTable('admin_users', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('admin'),
} as const);