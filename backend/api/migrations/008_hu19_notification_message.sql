BEGIN;

-- HU19: completa las filas existentes creadas antes de que notifications tuviera message.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS message text;

UPDATE notifications AS notification
SET message = CASE notification.type
  WHEN 'request_approved' THEN
    'Tu solicitud fue aprobada por el entrenador. Consulta el detalle para ver la información del aval.'
  WHEN 'request_rejected' THEN
    'Tu solicitud fue rechazada por el entrenador. Motivo: ' ||
    COALESCE(NULLIF(BTRIM(request.rejection_comment), ''), 'consulta el detalle de la solicitud.')
  ELSE
    'Hay una actualización sobre tu solicitud. Consulta el detalle para más información.'
END
FROM training_absence_requests AS request
WHERE request.id = notification.request_id
  AND notification.message IS NULL;

ALTER TABLE notifications
  ALTER COLUMN message SET NOT NULL;

COMMIT;
