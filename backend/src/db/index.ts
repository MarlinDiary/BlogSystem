import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { users } from './schema';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import path from 'path';

dotenv.config();

const client = createClient({
  url: 'file:./sqlite.db',
});

export const db = drizzle(client);

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