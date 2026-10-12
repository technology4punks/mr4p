CREATE TABLE `future_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`experience_version` text NOT NULL,
	`decision_sequence` text NOT NULL,
	`active_interventions` text NOT NULL,
	`triggered_interdependencies` text NOT NULL,
	`revised_decision` text,
	`final_reflection` text NOT NULL,
	`generated_future_message` text NOT NULL,
	`consent_to_store` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`deletion_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `future_sessions_expiry` ON `future_sessions` (`expires_at`);