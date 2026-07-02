DROP INDEX "active_slot_unique";--> statement-breakpoint
DROP INDEX "booking_status_idx";--> statement-breakpoint
DROP INDEX "booking_slot_idx";--> statement-breakpoint
DROP INDEX "staff_email_unique";--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "first_visit" TO "first_visit" text;--> statement-breakpoint
CREATE UNIQUE INDEX `active_slot_unique` ON `booking` (`slot_start`) WHERE status != 'declined';--> statement-breakpoint
CREATE INDEX `booking_status_idx` ON `booking` (`status`);--> statement-breakpoint
CREATE INDEX `booking_slot_idx` ON `booking` (`slot_start`);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_unique` ON `staff` (`email`);--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "patient_name" TO "patient_name" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "gender" TO "gender" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "date_of_birth" TO "date_of_birth" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "patient_email" TO "patient_email" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "patient_phone" TO "patient_phone" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "postal_code" TO "postal_code" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "prefecture" TO "prefecture" text;--> statement-breakpoint
ALTER TABLE `booking` ALTER COLUMN "address" TO "address" text;--> statement-breakpoint
ALTER TABLE `booking` ADD `origin` text DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking` ADD `note` text;