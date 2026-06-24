CREATE TYPE "public"."task_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN');--> statement-breakpoint
CREATE TABLE "generation_task_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"kind" varchar(30) NOT NULL,
	"source_url" varchar(1024),
	"storage_path" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"size_bytes" integer,
	"original_filename" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bailian_task_id" varchar(128),
	"create_request_id" varchar(128),
	"category" varchar(20) NOT NULL,
	"sub_category" varchar(40) NOT NULL,
	"model" varchar(60) NOT NULL,
	"params" jsonb NOT NULL,
	"status" "task_status" DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_task_files" ADD CONSTRAINT "generation_task_files_task_id_generation_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."generation_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_tasks" ADD CONSTRAINT "generation_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gen_tasks_user_created_idx" ON "generation_tasks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gen_tasks_bailian_uniq" ON "generation_tasks" USING btree ("bailian_task_id");