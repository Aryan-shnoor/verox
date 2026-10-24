
BEGIN;

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (role IN ('EMPLOYEE', 'REVIEWER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflows (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_stages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workflow_id BIGINT NOT NULL
        REFERENCES workflows(id) ON DELETE CASCADE,
    stage_order INTEGER NOT NULL CHECK (stage_order > 0),
    stage_name VARCHAR(120) NOT NULL,
    reviewer_role VARCHAR(20) NOT NULL
        CHECK (reviewer_role IN ('REVIEWER', 'ADMIN')),
    UNIQUE (workflow_id, stage_order)
);

CREATE TABLE documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id BIGINT NOT NULL REFERENCES users(id),
    workflow_id BIGINT REFERENCES workflows(id),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT',
            'PENDING_REVIEW',
            'CHANGES_REQUESTED',
            'APPROVED',
            'REJECTED'
        )),
    current_stage_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_attachments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    uploaded_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_revisions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    submitted_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version_number)
);

CREATE TABLE document_approval_stages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    workflow_stage_id BIGINT REFERENCES workflow_stages(id),
    stage_order INTEGER NOT NULL CHECK (stage_order > 0),
    reviewer_id BIGINT REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
        CHECK (status IN (
            'WAITING',
            'PENDING',
            'APPROVED',
            'REJECTED',
            'CHANGES_REQUESTED',
            'SKIPPED'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, stage_order)
);

CREATE TABLE approval_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    stage_id BIGINT REFERENCES document_approval_stages(id),
    revision_id BIGINT REFERENCES document_revisions(id),
    actor_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(30) NOT NULL
        CHECK (action IN (
            'CREATED',
            'SUBMITTED',
            'APPROVED',
            'REJECTED',
            'CHANGES_REQUESTED',
            'RESUBMITTED'
        )),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_owner
    ON documents(owner_id);

CREATE INDEX idx_documents_status
    ON documents(status);

CREATE INDEX idx_approval_stages_reviewer_status
    ON document_approval_stages(reviewer_id, status);

CREATE INDEX idx_approval_history_document_time
    ON approval_history(document_id, created_at);

COMMIT;


