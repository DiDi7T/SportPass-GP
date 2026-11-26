BEGIN;

-- HU19: avisos persistentes para que el deportista consulte la respuesta del entrenador.
-- El mensaje se guarda como instantánea del aviso; el detalle de la solicitud sigue
-- siendo la fuente oficial de sus datos académicos.
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES training_absence_requests(id) ON DELETE CASCADE,
  type varchar(32) NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,

  CONSTRAINT notifications_type_allowed
    CHECK (type IN ('request_approved', 'request_rejected')),
  -- HU17 hace inmutable la decisión: reintentar la integración no debe duplicar el aviso.
  CONSTRAINT notifications_request_unique
    UNIQUE (request_id)
);

CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

COMMIT;
