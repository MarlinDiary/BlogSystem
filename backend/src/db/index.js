import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

const dbPath = path.join(process.cwd(), 'blog.db');

let db;

export async function initializeDatabase() {
  try {
    // 确保数据库目录存在
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    
    // 打开数据库连接
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // 启用外键约束
    await db.run('PRAGMA foreign_keys = ON');
    
    // 读取并执行 schema.sql
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // 执行建表语句
    await db.exec(schema);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// 导出一些通用的数据库操作辅助函数
export async function query(sql, params = []) {
  return await getDb().all(sql, params);
}

export async function get(sql, params = []) {
  return await getDb().get(sql, params);
}

export async function run(sql, params = []) {
  return await getDb().run(sql, params);
}

// 事务辅助函数
export async function transaction(callback) {
  const db = getDb();
  try {
    await db.run('BEGIN');
    const result = await callback(db);
    await db.run('COMMIT');
    return result;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

// 初始化数据库
initializeDatabase().catch(console.error); 