CREATE TABLE `submission_limits` (
	`identity` text PRIMARY KEY NOT NULL,
	`minute` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending-import' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`book` text NOT NULL,
	`voter` text NOT NULL,
	`stars` integer NOT NULL,
	PRIMARY KEY(`book`, `voter`)
);
