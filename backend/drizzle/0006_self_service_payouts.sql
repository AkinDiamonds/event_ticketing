CREATE TABLE "organizer_payouts" (
	"organizer_id" uuid PRIMARY KEY NOT NULL,
	"subaccount_code" varchar(100) NOT NULL,
	"subaccount_id" varchar(32) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"bank_code" varchar(12) NOT NULL,
	"account_last4" varchar(4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizer_payouts_subaccount_code_unique" UNIQUE("subaccount_code"),
	CONSTRAINT "organizer_payouts_subaccount_id_unique" UNIQUE("subaccount_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organizer_suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "is_published" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "platform_fee_kobo" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paystack_subaccount" varchar(100);--> statement-breakpoint
ALTER TABLE "organizer_payouts" ADD CONSTRAINT "organizer_payouts_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
