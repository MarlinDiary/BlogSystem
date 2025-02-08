import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import bcrypt from 'bcryptjs';
import axios from 'axios';

// 下载并保存头像
async function downloadAndSaveAvatar(username) {
  try {
    const avatarDir = path.join(process.env.NODE_ENV === 'production' ? '/data/uploads/avatars' : 'uploads/avatars');
    await fsPromises.mkdir(avatarDir, { recursive: true });

    // 生成随机种子
    const randomSeed = Math.random().toString(36).substring(2, 15);
    
    // 生成文件名
    const fileName = `${username}-${Date.now()}.png`;
    const filePath = path.join(avatarDir, fileName);

    // 下载 DiceBear Bottts Neutral 头像
    const response = await axios({
      method: 'get',
      url: `https://api.dicebear.com/7.x/bottts-neutral/png?seed=${randomSeed}&size=200`,
      responseType: 'stream'
    });

    // 保存到本地文件
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`/uploads/avatars/${fileName}`));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('下载头像失败:', error);
    return '/uploads/avatars/default.png';
  }
}

// 生成随机创建日期（2023年1月到2024年2月之间）
function getRandomCreatedAt() {
  const start = new Date('2023-01-01').getTime();
  const end = new Date('2024-02-08').getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime).toISOString();
}

// 默认用户数据
const defaultUsers = [
  {
    username: 'Leo',
    password: 'Leo1234',
    realName: 'Leonardo Mitchell',
    dateOfBirth: '1990-03-15',
    bio: 'Full-stack developer passionate about technology and innovation, focused on building excellent user experiences.'
  },
  {
    username: 'Kevin',
    password: 'Kevin1234',
    realName: 'Kevin Anderson',
    dateOfBirth: '1988-07-22',
    bio: 'Senior System Architect with a passion for distributed systems and cloud-native technologies.'
  },
  {
    username: 'Mia',
    password: 'Mia1234',
    realName: 'Mia Thompson',
    dateOfBirth: '1992-11-30',
    bio: 'UI/UX Designer pursuing minimalist yet sophisticated design aesthetics.'
  },
  {
    username: 'Joy',
    password: 'Joy1234',
    realName: 'Joy Williams',
    dateOfBirth: '1991-05-18',
    bio: 'Product Manager dedicated to transforming creative ideas into practical solutions.'
  },
  {
    username: 'Vita',
    password: 'Vita1234',
    realName: 'Vita Parker',
    dateOfBirth: '1993-09-25',
    bio: 'Frontend Expert passionate about exploring cutting-edge web technologies.'
  },
  {
    username: 'Tyne',
    password: 'Tyne1234',
    realName: 'Tyne Harrison',
    dateOfBirth: '1989-12-10',
    bio: 'Backend Engineer focused on high-performance server-side development.'
  },
  {
    username: 'Dewey',
    password: 'Dewey1234',
    realName: 'Dewey Cooper',
    dateOfBirth: '1987-04-05',
    bio: 'DevOps Engineer pursuing the perfect blend of automation and efficiency.'
  },
  {
    username: 'Cameron',
    password: 'Cameron1234',
    realName: 'Cameron Foster',
    dateOfBirth: '1994-08-20',
    bio: 'Full-stack Developer who loves trying new technologies and sharing technical experiences.'
  },
  {
    username: 'Karson',
    password: 'Karson1234',
    realName: 'Karson Blake',
    dateOfBirth: '1990-06-15',
    bio: 'Technical Lead specializing in team management and technical architecture design.'
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
    await fsPromises.mkdir(path.dirname(dbPath), { recursive: true });
    
    // 打开数据库连接
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // 启用外键约束
    await db.run('PRAGMA foreign_keys = ON');
    
    // 读取并执行 schema.sql
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const schema = await fsPromises.readFile(schemaPath, 'utf-8');
    
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
        const avatarUrl = await downloadAndSaveAvatar(user.username);
        const createdAt = getRandomCreatedAt();
        
        await db.run(
          `INSERT INTO users (
            username, password, role, status, real_name, 
            date_of_birth, bio, avatar_url, created_at
          ) VALUES (?, ?, 'admin', 'active', ?, ?, ?, ?, ?)`,
          [
            user.username,
            hashedPassword,
            user.realName,
            user.dateOfBirth,
            user.bio,
            avatarUrl,
            createdAt
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