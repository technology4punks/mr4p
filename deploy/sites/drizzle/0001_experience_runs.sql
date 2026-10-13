CREATE TABLE `experience_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`capability_hash` text NOT NULL,
	`revision` integer NOT NULL,
	`started_at` integer NOT NULL,
	`elapsed_seconds` integer NOT NULL,
	`state` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`guided` integer NOT NULL,
	`active_interventions` text NOT NULL,
	`final_message` text NOT NULL,
	`reason` text NOT NULL,
	`consent_to_store` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `experience_runs_updated` ON `experience_runs` (`updated_at`);--> statement-breakpoint
CREATE INDEX `experience_runs_expiry` ON `experience_runs` (`expires_at`);