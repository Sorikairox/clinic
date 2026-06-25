CREATE TABLE `booking` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_start` text NOT NULL,
	`slot_end` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`customer_number` text,
	`first_visit` text NOT NULL,
	`patient_name` text NOT NULL,
	`patient_name_kana` text,
	`gender` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`patient_email` text NOT NULL,
	`patient_phone` text NOT NULL,
	`postal_code` text NOT NULL,
	`prefecture` text NOT NULL,
	`address` text NOT NULL,
	`locale` text DEFAULT 'ja' NOT NULL,
	`created_at` text NOT NULL,
	`decided_at` text,
	`decided_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `active_slot_unique` ON `booking` (`slot_start`) WHERE status != 'declined';--> statement-breakpoint
CREATE INDEX `booking_status_idx` ON `booking` (`status`);--> statement-breakpoint
CREATE INDEX `booking_slot_idx` ON `booking` (`slot_start`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_unique` ON `staff` (`email`);