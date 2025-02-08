import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcryptjs';

// 默认用户数据
const defaultUsers = [
  {
    username: 'Leo',
    password: 'Leo1234',
    realName: '李奥',
    dateOfBirth: '1990-03-15',
    bio: '热爱技术和创新的全栈开发者，专注于构建优秀的用户体验。'
  },
  {
    username: 'Kevin',
    password: 'Kevin1234',
    realName: '凯文',
    dateOfBirth: '1988-07-22',
    bio: '资深系统架构师，对分布式系统和云原生技术充满热情。'
  },
  {
    username: 'Mia',
    password: 'Mia1234',
    realName: '米娅',
    dateOfBirth: '1992-11-30',
    bio: 'UI/UX设计师，追求简约而不简单的设计美学。'
  },
  {
    username: 'Joy',
    password: 'Joy1234',
    realName: '乔伊',
    dateOfBirth: '1991-05-18',
    bio: '产品经理，致力于将创意转化为实际解决方案。'
  },
  {
    username: 'Vita',
    password: 'Vita1234',
    realName: '维塔',
    dateOfBirth: '1993-09-25',
    bio: '前端开发专家，热衷于探索最新的Web技术。'
  },
  {
    username: 'Tyne',
    password: 'Tyne1234',
    realName: '泰恩',
    dateOfBirth: '1989-12-10',
    bio: '后端工程师，专注于高性能服务端开发。'
  },
  {
    username: 'Dewey',
    password: 'Dewey1234',
    realName: '杜威',
    dateOfBirth: '1987-04-05',
    bio: 'DevOps工程师，追求自动化和效率的完美结合。'
  },
  {
    username: 'Cameron',
    password: 'Cameron1234',
    realName: '卡梅伦',
    dateOfBirth: '1994-08-20',
    bio: '全栈开发者，热爱尝试新技术和分享技术经验。'
  },
  {
    username: 'Karson',
    password: 'Karson1234',
    realName: '卡森',
    dateOfBirth: '1990-06-15',
    bio: '技术主管，专注于团队管理和技术架构设计。'
  }
];

// 根据环境使用不同的数据库路径
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join('/data', 'blog.db')
  : path.join(process.cwd(), 'blog.db');

let db;

async function initializeDatabase() {
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

    // 初始化默认用户
    for (const user of defaultUsers) {
      const existingUser = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [user.username]
      );
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.run(
          `INSERT INTO users (
            username, password, role, status, real_name, 
            date_of_birth, bio, avatar_url, created_at
          ) VALUES (?, ?, 'admin', 'active', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            user.username,
            hashedPassword,
            user.realName,
            user.dateOfBirth,
            user.bio,
            '/uploads/avatars/default.png'
          ]
        );
        console.log(`默认用户 ${user.username} 创建成功`);
      }
    }
    
    console.log('数据库初始化完成');
    return db;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initializeDatabase()');
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