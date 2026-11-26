BEGIN;

-- HU15 needs to identify the coach who actually approved or rejected the request.
-- Keep this nullable for existing requests created before HU17 records the decision.
ALTER TABLE training_absence_requests
  ADD COLUMN responded_by_coach_id uuid,
  ADD CONSTRAINT fk_training_absence_requests_responded_by_coach
    FOREIGN KEY (responded_by_coach_id)
    REFERENCES users(id)
    ON DELETE SET NULL;

COMMIT;
