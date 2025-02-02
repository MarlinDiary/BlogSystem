-- 创建标签表
CREATE TABLE `tags` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP
);

-- 创建文章标签关联表
CREATE TABLE `article_tags` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `article_id` integer NOT NULL,
  `tag_id` integer NOT NULL,
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 创建唯一索引，确保文章和标签的组合是唯一的
CREATE UNIQUE INDEX `article_tags_article_id_tag_id_unique` ON `article_tags` (`article_id`,`tag_id`);
-- 创建标签名称唯一索引
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`); 