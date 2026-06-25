ALTER TABLE generation_tasks ADD COLUMN deleted_at timestamptz;
ALTER TABLE creativity_tasks ADD COLUMN deleted_at timestamptz;
