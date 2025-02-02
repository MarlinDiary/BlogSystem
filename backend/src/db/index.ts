import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import path from 'path';

dotenv.config();

const sqlite = new Database('sqlite.db');

// 初始化数据库表
const initDatabase = () => {
  // 创建用户表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      real_name TEXT,
      date_of_birth TEXT,
      bio TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      ban_reason TEXT,
      ban_expire_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'draft',
      view_count INTEGER DEFAULT 0,
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
};

// 初始化数据库
initDatabase();

export const db = drizzle(sqlite);

// 初始化管理员账号
async function initAdminUser() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('请在 .env 文件中设置 ADMIN_USERNAME 和 ADMIN_PASSWORD');
      return;
    }

    // 检查管理员账号是否已存在
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, adminUsername))
      .get();

    if (!existingAdmin) {
      // 创建管理员账号
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await db.insert(users).values({
        username: adminUsername,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        createdAt: sql`CURRENT_TIMESTAMP`
      });
      console.log('管理员账号创建成功');
    }
  } catch (error) {
    console.error('初始化管理员账号失败:', error);
  }
}

// 在应用启动时初始化管理员账号
initAdminUser().catch(console.error); 