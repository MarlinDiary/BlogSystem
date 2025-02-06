import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 获取上传根目录
const getUploadRoot = () => {
  return process.env.NODE_ENV === 'production'
    ? '/data/uploads'
    : 'uploads';
};

// 获取URL路径前缀
const getUrlPrefix = () => {
  return '/uploads';
};

// 确保上传目录存在
const createUploadDirs = () => {
  const uploadRoot = getUploadRoot();
  const dirs = [
    path.join(uploadRoot, 'covers'),
    path.join(uploadRoot, 'avatars'),
    path.join(uploadRoot, 'articles')
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// 文章封面图上传配置
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(getUploadRoot(), 'covers'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 文章内容图片上传配置
const articleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(getUploadRoot(), 'articles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 用户头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(getUploadRoot(), 'avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'));
  }
};

export const uploadArticleCover = multer({
  storage: coverStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter
}).single('cover');

export const uploadArticleImage = multer({
  storage: articleStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter
}).single('image');

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
}).single('avatar');

export const upload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
});

export { getUploadRoot, getUrlPrefix }; 