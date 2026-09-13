ALTER TABLE "ticket_tiers" DROP CONSTRAINT "ticket_tiers_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "ticket_tiers" ADD CONSTRAINT "ticket_tiers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;