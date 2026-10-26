ALTER TABLE workflow_stages
ADD COLUMN reviewer_id BIGINT REFERENCES users(id);

ALTER TABLE document_revisions
ADD COLUMN title VARCHAR(200) NOT NULL,
ADD COLUMN category VARCHAR(100) NOT NULL,
ADD COLUMN description TEXT;

CREATE UNIQUE INDEX one_active_attempt_per_document
ON document_approval_attempts(document_id)
WHERE status = 'IN_PROGRESS';