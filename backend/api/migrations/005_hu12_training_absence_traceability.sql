BEGIN;

ALTER TABLE training_absence_requests
  ADD COLUMN coach_responded_at timestamptz,
  ADD COLUMN rejection_comment varchar(1000),
  ADD COLUMN teacher_email_sent_at timestamptz;

COMMIT;
