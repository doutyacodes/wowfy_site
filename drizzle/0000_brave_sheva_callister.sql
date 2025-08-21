CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role` varchar(20) DEFAULT 'admin',
	`venue_id` int,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`logo` varchar(255),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenge_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`challenge_id` int NOT NULL,
	`session_id` int NOT NULL,
	`is_completed` boolean DEFAULT false,
	`points_earned` int DEFAULT 0,
	`attempt_data` json,
	`completed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `challenge_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL,
	`difficulty` varchar(20) DEFAULT 'medium',
	`points` int DEFAULT 10,
	`data` json,
	`moderator_code` varchar(20),
	`is_global` boolean DEFAULT false,
	`venue_id` int,
	`brand_id` int,
	`is_active` boolean DEFAULT true,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venue_id` int NOT NULL,
	`code` varchar(6) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`is_used` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`points` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`source` varchar(50),
	`reference_id` int,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `point_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`table_id` int NOT NULL,
	`venue_id` int NOT NULL,
	`is_active` boolean DEFAULT true,
	`joined_at` timestamp DEFAULT (now()),
	`left_at` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venue_id` int NOT NULL,
	`table_number` varchar(20) NOT NULL,
	`capacity` int DEFAULT 4,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password` varchar(255),
	`is_guest` boolean DEFAULT false,
	`is_verified` boolean DEFAULT false,
	`points` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(20) NOT NULL,
	`code` varchar(10) NOT NULL,
	`brand_id` int,
	`location` varchar(255),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `venues_id` PRIMARY KEY(`id`),
	CONSTRAINT `venues_code_unique` UNIQUE(`code`)
);
