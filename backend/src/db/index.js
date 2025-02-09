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

// 默认文章数据
const defaultArticles = [
  {
    title: 'Exploring the History of the Macintosh',
    content: `The Macintosh, or Mac, has revolutionized personal computing since its introduction in 1984. This iconic product line from Apple has consistently pushed the boundaries of technology and design, creating a legacy that spans nearly four decades.

The story of Mac begins with Steve Jobs and his vision for creating a computer that anyone could use. The original Macintosh 128K was unveiled on January 24, 1984, during Super Bowl XVIII, with the now-famous "1984" commercial directed by Ridley Scott. This groundbreaking advertisement, which cost $1.5 million to produce, portrayed Apple as the rebellious alternative to IBM's dominant but rigid computing paradigm.

The first Macintosh featured a 9-inch monochrome display, a Motorola 68000 processor running at 8 MHz, 128KB of RAM, and a 400KB floppy disk drive. While these specifications might seem modest by today's standards, the machine's graphical user interface and mouse-based interaction model were revolutionary for their time. The Macintosh was the first mass-market personal computer to popularize these now-ubiquitous features.

Throughout the late 1980s and early 1990s, the Mac lineup expanded with various models catering to different market segments. The Macintosh II, released in 1987, brought color display support and expandability to the platform. The PowerBook series, introduced in 1991, set new standards for laptop design with its palm rest and trackball placement.

However, Apple faced significant challenges in the mid-1990s. The transition to the PowerPC architecture, while technically impressive, couldn't keep pace with Intel's rapid advancement. The company's market share dwindled, and many predicted its demise. The turning point came with Steve Jobs' return to Apple in 1997 and the introduction of the iMac G3 in 1998.

The iMac G3's translucent, colorful design wasn't just about aesthetics; it represented a fundamental shift in how computers could be perceived - not as beige boxes for offices, but as personal expressions of creativity. This philosophy of merging technology with design would become a hallmark of Apple's approach to product development.

The Mac's evolution continued with several pivotal transitions. The switch to OS X (now macOS) in 2001 provided a modern, Unix-based foundation that remains at the core of Apple's operating systems today. The 2006 transition from PowerPC to Intel processors dramatically expanded the Mac's software ecosystem and performance capabilities.

Perhaps the most significant recent development is the introduction of Apple Silicon. The M1 chip, launched in 2020, marked the beginning of a new era in Mac history. This custom-designed ARM-based processor delivers unprecedented performance and energy efficiency, while maintaining the Mac's tradition of user-friendly operation and seamless integration with Apple's ecosystem.

The Mac's influence extends far beyond its market share. Its emphasis on typography and consistent user interface guidelines helped establish desktop publishing as a viable industry. The Mac's support for multimedia capabilities made it the preferred platform for creative professionals, a position it largely maintains today.

Looking ahead, the Mac continues to evolve while maintaining its core principles of user-friendly design and innovative technology. The integration of iOS features into macOS, the advancement of Apple Silicon, and the continued refinement of the user experience suggest that the Mac's influence on computing will persist well into the future.`,
    html_content: `<p>The Macintosh, or Mac, has revolutionized personal computing since its introduction in 1984. This iconic product line from Apple has consistently pushed the boundaries of technology and design, creating a legacy that spans nearly four decades.</p>

<h2>The Birth of Macintosh</h2>

<p>The story of Mac begins with Steve Jobs and his vision for creating a computer that anyone could use. The original Macintosh 128K was unveiled on January 24, 1984, during Super Bowl XVIII, with the now-famous "1984" commercial directed by Ridley Scott. This groundbreaking advertisement, which cost $1.5 million to produce, portrayed Apple as the rebellious alternative to IBM's dominant but rigid computing paradigm.</p>

<p>The first Macintosh featured a 9-inch monochrome display, a Motorola 68000 processor running at 8 MHz, 128KB of RAM, and a 400KB floppy disk drive. While these specifications might seem modest by today's standards, the machine's graphical user interface and mouse-based interaction model were revolutionary for their time. The Macintosh was the first mass-market personal computer to popularize these now-ubiquitous features.</p>

<h2>Evolution Through the Years</h2>

<p>Throughout the late 1980s and early 1990s, the Mac lineup expanded with various models catering to different market segments. The Macintosh II, released in 1987, brought color display support and expandability to the platform. The PowerBook series, introduced in 1991, set new standards for laptop design with its palm rest and trackball placement.</p>

<p>However, Apple faced significant challenges in the mid-1990s. The transition to the PowerPC architecture, while technically impressive, couldn't keep pace with Intel's rapid advancement. The company's market share dwindled, and many predicted its demise. The turning point came with Steve Jobs' return to Apple in 1997 and the introduction of the iMac G3 in 1998.</p>

<p>The iMac G3's translucent, colorful design wasn't just about aesthetics; it represented a fundamental shift in how computers could be perceived - not as beige boxes for offices, but as personal expressions of creativity. This philosophy of merging technology with design would become a hallmark of Apple's approach to product development.</p>

<p>The Mac's evolution continued with several pivotal transitions. The switch to OS X (now macOS) in 2001 provided a modern, Unix-based foundation that remains at the core of Apple's operating systems today. The 2006 transition from PowerPC to Intel processors dramatically expanded the Mac's software ecosystem and performance capabilities.</p>

<p>Perhaps the most significant recent development is the introduction of Apple Silicon. The M1 chip, launched in 2020, marked the beginning of a new era in Mac history. This custom-designed ARM-based processor delivers unprecedented performance and energy efficiency, while maintaining the Mac's tradition of user-friendly operation and seamless integration with Apple's ecosystem.</p>

<h2>Impact on Modern Computing</h2>

<p>The Mac's influence extends far beyond its market share. Its emphasis on typography and consistent user interface guidelines helped establish desktop publishing as a viable industry. The Mac's support for multimedia capabilities made it the preferred platform for creative professionals, a position it largely maintains today.</p>

<p>Looking ahead, the Mac continues to evolve while maintaining its core principles of user-friendly design and innovative technology. The integration of iOS features into macOS, the advancement of Apple Silicon, and the continued refinement of the user experience suggest that the Mac's influence on computing will persist well into the future.</p>`,
    image_url: 'https://images.unsplash.com/photo-1611262588019-db6cc2032da3?q=80&w=2874&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Technology', 'Apple', 'Computing History', 'Innovation'],
    author: 'Leo',
    published_at: '2024-01-15',
    created_at: '2024-01-15'
  },
  {
    title: 'Unveiling the Age of Constant Monitoring',
    content: `In a world where technology continues to evolve at an exponential pace, constant monitoring has become an inescapable reality. From surveillance cameras on every corner to digital tracking embedded in our personal devices, the Age of Constant Monitoring has arrived.

The Rise of Digital Surveillance
In the last decade, advancements in artificial intelligence, big data, and cloud computing have enabled organizations to monitor individuals and environments on an unprecedented scale. Governments deploy smart city technologies to enhance public safety, while corporations analyze user data to deliver targeted advertisements. However, the rise of digital surveillance is not without its challenges. Critics argue that it creates a culture of overreach, where personal freedoms are increasingly restricted.

Benefits of Constant Monitoring
Despite privacy concerns, constant monitoring offers tangible benefits. In healthcare, wearable devices track vital signs, enabling early detection of potential health issues. Smart home systems provide convenience and energy efficiency, responding to our habits and needs in real-time. Public safety has also seen improvements, with law enforcement using predictive analytics to prevent crimes before they occur. Such applications highlight the potential for technology to enhance human life when used responsibly.

Ethical Implications and Privacy Concerns
The ethical implications of constant monitoring cannot be overstated. Who owns the data collected about us? How is it being used, and by whom? Without clear regulations, the potential for misuse is significant. Privacy advocates warn that without transparency and accountability, individuals may lose control over their personal information. The growing use of facial recognition technology, for example, has sparked debates about racial bias, false positives, and the erosion of anonymity.

Navigating the Future of Monitoring
As the Age of Constant Monitoring unfolds, finding a balance between innovation and privacy is paramount. Governments and organizations must work together to establish ethical guidelines, ensuring technology serves humanity rather than exploiting it. Public awareness and education are also crucial. By understanding the technologies that shape our lives, individuals can make informed decisions and advocate for policies that protect their rights.

In conclusion, constant monitoring is a double-edged sword. While it offers opportunities to improve our lives, it also poses significant challenges. The key lies in harnessing its potential responsibly, ensuring it aligns with societal values and ethical standards.`,
    html_content: `<p>In a world where technology continues to evolve at an exponential pace, constant monitoring has become an inescapable reality. From surveillance cameras on every corner to digital tracking embedded in our personal devices, the Age of Constant Monitoring has arrived.</p>

<h2>The Rise of Digital Surveillance</h2>
<p>In the last decade, advancements in artificial intelligence, big data, and cloud computing have enabled organizations to monitor individuals and environments on an unprecedented scale...</p>

<h2>Benefits of Constant Monitoring</h2>
<p>Despite privacy concerns, constant monitoring offers tangible benefits. In healthcare, wearable devices track vital signs...</p>

<h2>Ethical Implications and Privacy Concerns</h2>
<p>The ethical implications of constant monitoring cannot be overstated...</p>

<h2>Navigating the Future of Monitoring</h2>
<p>As the Age of Constant Monitoring unfolds, finding a balance between innovation and privacy is paramount...</p>`,
    image_url: 'https://images.unsplash.com/photo-1546803073-23568b8c98e6?q=80&w=2400&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Surveillance', 'Privacy', 'Technology', 'Ethics'],
    author: 'Kevin',
    published_at: '2024-02-10',
    created_at: '2024-02-10',
  },
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
    
    // 初始化默认用户后，创建默认文章
    for (const article of defaultArticles) {
      const existingArticle = await db.get(
        'SELECT * FROM articles WHERE title = ?',
        [article.title]
      );

      if (!existingArticle) {
        await transaction(async ({ run, get }) => {
          // 获取作者ID
          const author = await get('SELECT id FROM users WHERE username = ?', [article.author]);
          
          // 插入文章
          const result = await run(
            `INSERT INTO articles (
              title, content, html_content, image_url, status, 
              view_count, author_id, published_at, created_at
            ) VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)`,
            [
              article.title,
              article.content,
              article.html_content,
              article.image_url,
              Math.floor(Math.random() * 1000) + 500, // 随机浏览量
              author.id,
              new Date(article.published_at).toISOString(),
              new Date(article.created_at).toISOString()
            ]
          );

          const articleId = result.lastID;

          // 创建标签
          for (const tagName of article.tags) {
            // 检查标签是否存在，不存在则创建
            let tag = await get('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (!tag) {
              const tagResult = await run('INSERT INTO tags (name) VALUES (?)', [tagName]);
              tag = { id: tagResult.lastID };
            }

            // 关联文章和标签
            await run(
              'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
              [articleId, tag.id]
            );
          }

          // 添加更多反应
          const reactions = ['like', 'love', 'celebrate', 'insightful', 'support'];
          const users = await db.all('SELECT id FROM users');
          for (const user of users) {
            // 每个用户有70%的概率添加反应
            if (Math.random() < 0.7) {
              const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
              await run(
                'INSERT INTO article_reactions (article_id, user_id, type) VALUES (?, ?, ?)',
                [articleId, user.id, randomReaction]
              );
            }
          }

          // 添加评论模板池
          const commentTemplates = {
            tech: [
              {
                main: [
                  "Excellent analysis! The technical depth really shows your expertise in this area.",
                  "This is a fascinating perspective on the evolution of technology. Really enjoyed reading it.",
                  "Great article! The historical context you've provided really helps understand the current state.",
                  "Very comprehensive overview. I particularly appreciate the technical details you've included.",
                  "This is exactly the kind of in-depth analysis I've been looking for on this topic.",
                  "Brilliant piece! The way you've connected different aspects of tech evolution is enlightening.",
                  "Your insights on this topic are spot-on. Really helped clarify some concepts for me."
                ],
                replies: [
                  "Completely agree with your points. Would love to see more articles like this.",
                  "You've raised some interesting points. I think this deserves more discussion.",
                  "This perspective adds a lot to the conversation. Thanks for sharing!",
                  "Your analysis is quite thorough. I've learned something new today.",
                  "Really insightful comment. It's great to see such informed discussion.",
                  "This is a great addition to the main article. Thanks for the detailed explanation."
                ],
                deepReplies: [
                  "That's an excellent point! Hadn't considered that aspect before.",
                  "Thanks for the additional context. Really helps complete the picture.",
                  "Your technical knowledge really shines through in this explanation.",
                  "This kind of detailed discussion is what makes these comments valuable.",
                  "Appreciate you sharing your expertise on this matter.",
                  "Very well explained. This adds another layer to the discussion."
                ]
              }
            ],
            privacy: [
              {
                main: [
                  "Important discussion on privacy concerns in the digital age.",
                  "The balance between security and privacy is crucial - great analysis.",
                  "This raises some critical points about data protection.",
                  "Thoughtful examination of modern surveillance challenges.",
                  "Really appreciate the balanced perspective on this sensitive topic.",
                  "The ethical implications discussed here are particularly relevant today."
                ],
                replies: [
                  "Privacy is indeed becoming increasingly important in our connected world.",
                  "These concerns need more attention in public discourse.",
                  "The technical safeguards mentioned are crucial for future developments.",
                  "This kind of awareness is essential for informed decision-making.",
                  "The regulatory aspects discussed here are particularly interesting."
                ],
                deepReplies: [
                  "Regulation definitely needs to keep pace with technology.",
                  "User awareness is key to maintaining digital privacy.",
                  "The technical solutions proposed here are promising.",
                  "This kind of detailed analysis helps inform better policy.",
                  "Security and privacy don't have to be mutually exclusive."
                ]
              }
            ]
          };

          // 随机选择评论函数
          function getRandomComment(type = 'tech') {
            const templates = commentTemplates[type];
            const template = templates[Math.floor(Math.random() * templates.length)];
            const mainComments = template.main;
            const replies = template.replies;
            const deepReplies = template.deepReplies;

            return {
              content: mainComments[Math.floor(Math.random() * mainComments.length)],
              replies: Array(Math.floor(Math.random() * 3) + 1).fill(null).map(() => ({
                content: replies[Math.floor(Math.random() * replies.length)],
                replies: Array(Math.floor(Math.random() * 2)).fill(null).map(() => ({
                  content: deepReplies[Math.floor(Math.random() * deepReplies.length)]
                }))
              }))
            };
          }

          // 在文章创建部分，替换原有的静态评论数组
          const comments = Array(Math.floor(Math.random() * 3) + 2).fill(null).map(() => 
            getRandomComment(article.title.toLowerCase().includes('monitoring') ? 'privacy' : 'tech')
          );

          // 递归函数来插入评论
          async function insertComment(comment, parentId = null) {
            // 随机选择一个用户作为评论作者
            const randomUser = users[Math.floor(Math.random() * users.length)];
            
            const commentResult = await run(
              'INSERT INTO comments (content, user_id, article_id, parent_id) VALUES (?, ?, ?, ?)',
              [comment.content, randomUser.id, articleId, parentId]
            );

            if (comment.replies) {
              for (const reply of comment.replies) {
                await insertComment(reply, commentResult.lastID);
              }
            }
          }

          // 插入所有评论
          for (const comment of comments) {
            await insertComment(comment);
          }
        });
        
        console.log(`默认文章 "${article.title}" 创建成功`);
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
export async function transaction(callback, maxRetries = 3) {
  const db = getDb();
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await db.run('BEGIN');
      console.log('事务开始');

      const result = await callback({
        run: async (sql, params = []) => {
          console.log('执行 SQL:', sql, '参数:', params);
          return await db.run(sql, params);
        },
        get: async (sql, params = []) => {
          console.log('执行 SQL:', sql, '参数:', params);
          return await db.get(sql, params);
        },
        query: async (sql, params = []) => {
          console.log('执行 SQL:', sql, '参数:', params);
          return await db.all(sql, params);
        }
      });

      await db.run('COMMIT');
      console.log('事务提交成功');
      return result;
    } catch (error) {
      console.error(`事务执行失败 (尝试 ${retryCount + 1}/${maxRetries}):`, error);
      
      try {
        await db.run('ROLLBACK');
        console.log('事务回滚成功');
      } catch (rollbackError) {
        console.error('事务回滚失败:', rollbackError);
      }

      if (error.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
        retryCount++;
        console.log(`等待后重试 (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      throw error;
    }
  }
}

// 初始化数据库
initializeDatabase().catch(console.error); 