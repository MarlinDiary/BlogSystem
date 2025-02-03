import { sql } from 'drizzle-orm';
import { db } from '..';

export async function addHtmlContent() {
  try {
    await db.run(sql`
      ALTER TABLE articles 
      ADD COLUMN html_content TEXT;
    `);
    console.log('成功添加 html_content 列');
  } catch (error) {
    console.error('添加 html_content 列失败:', error);
    throw error;
  }
} 