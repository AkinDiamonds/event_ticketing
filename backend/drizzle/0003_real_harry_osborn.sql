ALTER TABLE "users" ADD COLUMN "whatsapp_number" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "whatsapp_number_set_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_whatsapp_number_unique" UNIQUE("whatsapp_number");