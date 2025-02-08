import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, get, run } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getUrlPrefix, getUploadRoot } from '../middleware/upload.js';

/**
 * @typedef {import('express').Request & { userId?: string }} AuthRequest
 */

const router = express.Router();

// 下载并保存头像
async function downloadAndSaveAvatar(username) {
  try {
    // 确保头像目录存在
    const avatarDir = path.join(getUploadRoot(), 'avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    // 生成文件名
    const fileName = `${username}-${Date.now()}.png`;
    const filePath = path.join(avatarDir, fileName);

    // 下载 RoboHash 头像
    const response = await axios({
      method: 'get',
      url: `https://robohash.org/${encodeURIComponent(username)}`,
      responseType: 'stream'
    });

    // 保存到本地文件
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`${getUrlPrefix()}/avatars/${fileName}`));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('下载头像失败:', error);
    return `${getUrlPrefix()}/avatars/default.png`;
  }
}

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, realName, dateOfBirth, bio } = req.body;
    
    // 验证必填字段
    if (!username || !password || !realName || !dateOfBirth) {
      return res.status(400).json({ 
        message: '用户名、密码、真实姓名和出生日期为必填项' 
      });
    }

    // 验证用户名格式（字母、数字、下划线，6-20位）
    if (!/^[a-zA-Z0-9_]{6,20}$/.test(username)) {
      return res.status(400).json({ 
        message: '用户名必须是6-20位的字母、数字或下划线组合' 
      });
    }

    // 验证密码强度（至少8位，包含字母和数字）
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
      return res.status(400).json({ 
        message: '密码必须至少8位，且包含字母和数字' 
      });
    }

    // 验证出生日期格式
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ 
        message: '出生日期格式无效' 
      });
    }

    // 检查用户是否已存在
    const existingUser = await get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUser) {
      return res.status(409).json({ message: '用户名已存在' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 下载并保存 RoboHash 头像
    const avatarUrl = await downloadAndSaveAvatar(username);
    
    const result = await run(
      `INSERT INTO users (username, password, real_name, date_of_birth, bio, status, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)`,
      [username, hashedPassword, realName, birthDate.toISOString(), bio || null, avatarUrl]
    );

    const newUser = await get(
      'SELECT * FROM users WHERE id = ?',
      [result.lastID]
    );

    // 生成 JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: '用户创建成功',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        realName: newUser.real_name,
        dateOfBirth: newUser.date_of_birth,
        bio: newUser.bio,
        avatarUrl: newUser.avatar_url,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const user = await get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        dateOfBirth: user.date_of_birth,
        bio: user.bio,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// 用户登出
router.post('/logout', authMiddleware, (req, res) => {
  // 由于使用 JWT，客户端需要删除 token
  res.json({ message: '登出成功' });
});

// 检查用户名是否可用
router.get('/check-username/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    const existingUser = await get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    res.json({ available: !existingUser });
  } catch (error) {
    next(error);
  }
});

// 验证 token
router.get('/validate', authMiddleware, async (req, res, next) => {
  try {
    const user = await get(
      `SELECT id, username, real_name, date_of_birth, bio, avatar_url, role, created_at
       FROM users WHERE id = ?`,
      [req.userId]
    );

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        dateOfBirth: user.date_of_birth,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await get(
      `SELECT id, username, real_name, date_of_birth, bio, avatar_url, role, created_at
       FROM users WHERE id = ?`,
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        dateOfBirth: user.date_of_birth,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// 刷新 token
router.post('/refresh-token', authMiddleware, async (req, res, next) => {
  try {
    const user = await get(
      `SELECT id, username, real_name, date_of_birth, bio, avatar_url, role, created_at
       FROM users WHERE id = ?`,
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        dateOfBirth: user.date_of_birth,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 验证新密码强度
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(newPassword)) {
      return res.status(400).json({ 
        message: '新密码必须至少8位，且包含字母和数字' 
      });
    }

    const user = await get(
      'SELECT * FROM users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.userId]
    );

    res.json({ message: '密码修改成功' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter }; 