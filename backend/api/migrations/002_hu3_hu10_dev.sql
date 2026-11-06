-- EXCLUSIVAMENTE para una BD de prueba, tras validar copia del esquema de dev.
-- Ejecutar UNA VEZ con psql -v ON_ERROR_STOP=1 -f ..., nunca sobre producción sin revisión.
-- No elimina ni reestructura tablas preexistentes.
BEGIN;
CREATE TABLE team_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_coaches_pair UNIQUE (team_id, coach_id)
);
CREATE INDEX idx_team_coaches_team ON team_coaches(team_id);
CREATE INDEX idx_team_coaches_coach ON team_coaches(coach_id);
-- Conservamos el entrenador principal que ya tenía cada equipo.
INSERT INTO team_coaches (team_id, coach_id)
SELECT id, coach_id FROM teams WHERE coach_id IS NOT NULL;

CREATE TABLE academic_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  code varchar(40) NOT NULL,
  nrc varchar(40) NOT NULL,
  academic_period varchar(40) NOT NULL,
  teacher_name varchar(160) NOT NULL,
  teacher_email varchar(254) NOT NULL,
  CONSTRAINT uq_academic_course_period_nrc UNIQUE (academic_period, nrc)
);
CREATE TABLE academic_enrollments (
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academic_courses(id) ON DELETE CASCADE,
  PRIMARY KEY(athlete_id, course_id)
);
CREATE TABLE academic_class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academic_courses(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
  CONSTRAINT valid_class_time CHECK (ends_at > starts_at),
  CONSTRAINT uq_course_session UNIQUE (course_id, starts_at)
);
CREATE INDEX idx_academic_class_sessions_date ON academic_class_sessions (starts_at, ends_at);
CREATE TABLE academic_schedule_sync (
  athlete_id uuid PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL CHECK(status IN ('synced','pending','failed')),
  coverage_start timestamptz NOT NULL,
  coverage_end timestamptz NOT NULL,
  last_synced_at timestamptz,
  CONSTRAINT valid_schedule_coverage CHECK(coverage_end > coverage_start)
);
COMMIT;
