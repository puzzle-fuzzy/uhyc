CREATE TABLE IF NOT EXISTS creativity_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url   text NOT NULL,
  status      task_status NOT NULL DEFAULT 'PENDING',
  step        integer NOT NULL DEFAULT 0,
  asr_result  jsonb,
  script_result text,
  merged_result text,
  error_message text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
