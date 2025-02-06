import { initializeDatabase, getDb, run } from './index.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || '20020120';
  
  try {
    // 初始化数据库
    await initializeDatabase();
    
    // 检查管理员是否已存在
    const db = getDb();
    const existingAdmin = await db.get(
      'SELECT * FROM users WHERE username = ? AND role = ?',
      [adminUsername, 'admin']
    );
    
    if (existingAdmin) {
      console.log('管理员账号已存在，跳过创建');
      return;
    }
    
    // 创建管理员账号
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await run(
      `INSERT INTO users (username, password, role, status, created_at)
       VALUES (?, ?, 'admin', 'active', CURRENT_TIMESTAMP)`,
      [adminUsername, hashedPassword]
    );
    
    console.log('管理员账号创建成功:', { username: adminUsername });
  } catch (error) {
    console.error('创建管理员账号失败:', error);
    process.exit(1);
  }
}

// 运行初始化
createAdminUser(); 