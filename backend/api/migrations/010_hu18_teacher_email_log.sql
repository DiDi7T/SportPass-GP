BEGIN;

-- HU18 CA4: registro del intento de envío del correo al docente.
-- teacher_email_sent_at (migración 005) sigue indicando cuándo se envió con éxito;
-- estas columnas guardan el resultado del último intento y, si falló, el motivo.
ALTER TABLE training_absence_requests
  ADD COLUMN IF NOT EXISTS teacher_email_status varchar(20),
  ADD COLUMN IF NOT EXISTS teacher_email_error varchar(1000),
  ADD COLUMN IF NOT EXISTS teacher_email_attempted_at timestamptz;

ALTER TABLE training_absence_requests
  DROP CONSTRAINT IF EXISTS training_absence_requests_teacher_email_status;
ALTER TABLE training_absence_requests
  ADD CONSTRAINT training_absence_requests_teacher_email_status
    CHECK (teacher_email_status IS NULL OR teacher_email_status IN ('sent', 'failed'));

COMMIT;
