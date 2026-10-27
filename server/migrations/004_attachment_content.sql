ALTER TABLE document_attachments
DROP COLUMN storage_key;

ALTER TABLE document_attachments
ADD COLUMN content BYTEA NOT NULL;

ALTER TABLE document_attachments
ADD COLUMN revision_id BIGINT REFERENCES document_revisions(id);

CREATE INDEX idx_attachments_document
ON document_attachments(document_id);