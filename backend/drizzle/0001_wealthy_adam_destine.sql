/*
 SQLite does not support "Changing existing column type" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
/*
 SQLite does not support "Set not null to column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE articles ADD `html_content` text;--> statement-breakpoint
ALTER TABLE articles ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE articles ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE articles ADD `review_reason` text;--> statement-breakpoint
ALTER TABLE articles ADD `view_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE comments ADD `visibility` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE users ADD `password` text NOT NULL;--> statement-breakpoint
ALTER TABLE users ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE users ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE users ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE users ADD `ban_expire_at` text;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_hash`;