BEGIN;

CREATE OR REPLACE FUNCTION notify_training_absence_request_decision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recipient_user_id uuid;
  notification_type varchar(32);
  notification_message text;
BEGIN
  IF NEW.status = 'approved_by_coach'
     AND (
       OLD.status IS DISTINCT FROM NEW.status
       OR OLD.teacher_email_sent_at IS DISTINCT FROM NEW.teacher_email_sent_at
     ) THEN
    notification_type := 'request_approved';
    IF NEW.teacher_email_sent_at IS NULL THEN
      notification_message := 'Tu solicitud fue avalada. El envío del correo al docente aún no está confirmado.';
    ELSE
      notification_message := 'Tu solicitud fue avalada y el correo fue enviado al docente asignado.';
    END IF;
  ELSIF NEW.status = 'rejected_by_coach'
        AND OLD.status IS DISTINCT FROM NEW.status THEN
    notification_type := 'request_rejected';
    notification_message := 'Tu solicitud fue rechazada por el entrenador. Motivo: ' ||
      COALESCE(NULLIF(BTRIM(NEW.rejection_comment), ''), 'No se registró un motivo.');
  ELSE
    RETURN NEW;
  END IF;

  SELECT athlete.user_id
    INTO recipient_user_id
    FROM athletes AS athlete
   WHERE athlete.id = NEW.athlete_id;

  INSERT INTO notifications (user_id, request_id, type, message)
  VALUES (recipient_user_id, NEW.id, notification_type, notification_message)
  ON CONFLICT (request_id) DO UPDATE
    SET type = EXCLUDED.type,
        message = EXCLUDED.message;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_absence_request_decision_notification
  ON training_absence_requests;

CREATE TRIGGER trg_training_absence_request_decision_notification
AFTER UPDATE OF status, teacher_email_sent_at
ON training_absence_requests
FOR EACH ROW
EXECUTE FUNCTION notify_training_absence_request_decision();

COMMIT;
