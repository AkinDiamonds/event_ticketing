CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"banner_image_url" text,
	"venue" varchar(255) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" integer NOT NULL,
	"quantity_available" integer NOT NULL,
	"quantity_reserved" integer DEFAULT 0 NOT NULL,
	"quantity_sold" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_tiers_event_id_name_unique" UNIQUE("event_id","name"),
	CONSTRAINT "ticket_tiers_price_nonnegative" CHECK ("ticket_tiers"."price" >= 0),
	CONSTRAINT "ticket_tiers_quantity_available_positive" CHECK ("ticket_tiers"."quantity_available" > 0),
	CONSTRAINT "ticket_tiers_quantity_reserved_nonnegative" CHECK ("ticket_tiers"."quantity_reserved" >= 0),
	CONSTRAINT "ticket_tiers_quantity_sold_nonnegative" CHECK ("ticket_tiers"."quantity_sold" >= 0),
	CONSTRAINT "ticket_tiers_inventory_within_available" CHECK ("ticket_tiers"."quantity_reserved" + "ticket_tiers"."quantity_sold" <= "ticket_tiers"."quantity_available")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tiers" ADD CONSTRAINT "ticket_tiers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_organizer_id_idx" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "ticket_tiers_event_id_idx" ON "ticket_tiers" USING btree ("event_id");