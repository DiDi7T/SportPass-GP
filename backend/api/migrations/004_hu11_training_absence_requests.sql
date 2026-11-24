BEGIN;

CREATE TABLE training_absence_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE RESTRICT,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  training_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject_name varchar(200) NOT NULL,
  teacher_name varchar(160) NOT NULL,
  teacher_email varchar(254) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'pending_coach_approval',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_absence_requests_valid_time CHECK (end_time > start_time)
);

CREATE INDEX idx_training_absence_requests_athlete_created
  ON training_absence_requests (athlete_id, created_at DESC);

CREATE TABLE training_absence_request_coaches (
  request_id uuid NOT NULL REFERENCES training_absence_requests(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, coach_id)
);

COMMIT;
