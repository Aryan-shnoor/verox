
BEGIN;


CREATE TABLE document_approval_attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN (
            'IN_PROGRESS',
            'CHANGES_REQUESTED',
            'APPROVED',
            'REJECTED'
        )),
    started_by BIGINT NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (document_id, attempt_number),
    UNIQUE (id, document_id)
);


ALTER TABLE documents
ADD COLUMN current_attempt_id BIGINT;

ALTER TABLE documents
ADD CONSTRAINT documents_current_attempt_fk
FOREIGN KEY (current_attempt_id)
REFERENCES document_approval_attempts(id)
ON DELETE SET NULL;


ALTER TABLE document_approval_stages
ADD COLUMN attempt_id BIGINT;


ALTER TABLE document_approval_stages
ALTER COLUMN attempt_id SET NOT NULL;


ALTER TABLE document_approval_stages
DROP CONSTRAINT document_approval_stages_document_id_stage_order_key;

ALTER TABLE document_approval_stages
ADD CONSTRAINT document_approval_stages_attempt_stage_unique
UNIQUE (attempt_id, stage_order);

ALTER TABLE document_approval_stages
ADD CONSTRAINT document_approval_stages_attempt_fk
FOREIGN KEY (attempt_id)
REFERENCES document_approval_attempts(id)
ON DELETE CASCADE;


ALTER TABLE document_approval_stages
ADD CONSTRAINT document_approval_stages_attempt_document_fk
FOREIGN KEY (attempt_id, document_id)
REFERENCES document_approval_attempts(id, document_id);


ALTER TABLE approval_history
ADD COLUMN attempt_id BIGINT;

ALTER TABLE approval_history
ADD CONSTRAINT approval_history_attempt_fk
FOREIGN KEY (attempt_id)
REFERENCES document_approval_attempts(id)
ON DELETE SET NULL;


CREATE INDEX idx_attempts_document
ON document_approval_attempts(document_id, attempt_number);

CREATE INDEX idx_documents_current_attempt
ON documents(current_attempt_id);

CREATE INDEX idx_approval_stages_attempt_status
ON document_approval_stages(attempt_id, status);

CREATE INDEX idx_approval_history_attempt_time
ON approval_history(attempt_id, created_at);

COMMIT;
