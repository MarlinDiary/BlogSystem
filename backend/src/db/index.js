import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users, articles, comments, tags, articleTags, articleReactions } from './schema.js';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// 检查数据库文件是否存在
const DB_FILE = 'blog.db';
const isNewDatabase = !fs.existsSync(DB_FILE);

console.log('数据库文件状态:', {
  path: DB_FILE,
  exists: !isNewDatabase
});

// 创建数据库连接
const sqlite = new Database(DB_FILE);
export const db = drizzle(sqlite);

// 初始化数据库表
export async function initializeDatabase() {
  try {
    // 只在数据库不存在时进行初始化
    if (isNewDatabase) {
      console.log('正在创建新数据库...');
      
      // 创建表
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          status TEXT NOT NULL DEFAULT 'active',
          ban_reason TEXT,
          ban_expire_at TEXT,
          real_name TEXT,
          date_of_birth TEXT,
          bio TEXT,
          avatar_url TEXT DEFAULT '/uploads/avatars/default.png',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          html_content TEXT,
          image_url TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          view_count INTEGER NOT NULL DEFAULT 0,
          author_id INTEGER,
          published_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          user_id INTEGER,
          article_id INTEGER,
          parent_id INTEGER,
          visibility TEXT DEFAULT 'visible',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (article_id) REFERENCES articles(id),
          FOREIGN KEY (parent_id) REFERENCES comments(id)
        );

        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS article_tags (
          article_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (article_id, tag_id),
          FOREIGN KEY (article_id) REFERENCES articles(id),
          FOREIGN KEY (tag_id) REFERENCES tags(id)
        );

        CREATE TABLE IF NOT EXISTS article_reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (article_id) REFERENCES articles(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      console.log('数据库表创建完成');

      // 创建管理员账号
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || '20020120';
      console.log('正在创建管理员账号:', { username: adminUsername });
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const result = await db
        .insert(users)
        .values({
          username: adminUsername,
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString()
        })
        .returning();

      console.log('管理员账号创建结果:', result);

      console.log('数据库初始化成功');
    } else {
      console.log('数据库已存在，跳过初始化');
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 初始化数据库
initializeDatabase().catch(console.error); 