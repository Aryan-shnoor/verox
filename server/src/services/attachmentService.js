const pool = require("../config/database");

// inserts only if the document is the user's and still editable
async function addAttachment(
  documentId,
  user,
  { name, mimeType, size, content },
) {
  const { rows } = await pool.query(
    `INSERT INTO document_attachments
       (document_id, original_filename, mime_type, file_size_bytes, uploaded_by, content)
     SELECT d.id, $3::varchar, $4::varchar, $5::bigint, $2::bigint, $6::bytea
     FROM documents d
     WHERE d.id = $1
       AND d.owner_id = $2
       AND d.status IN ('DRAFT', 'CHANGES_REQUESTED')
     RETURNING id, document_id, original_filename, mime_type, file_size_bytes, created_at`,
    [documentId, user.id, name, mimeType, size, content],
  );
  return rows[0] || null;
}

async function listAttachments(documentId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.original_filename, a.mime_type, a.file_size_bytes, a.created_at,
            u.full_name AS uploaded_by_name,
            r.version_number
     FROM document_attachments a
     JOIN users u ON u.id = a.uploaded_by
     LEFT JOIN document_revisions r ON r.id = a.revision_id
     WHERE a.document_id = $1
     ORDER BY a.created_at, a.id`,
    [documentId],
  );
  return rows;
}

async function getFile(documentId, attachmentId) {
  const { rows } = await pool.query(
    `SELECT original_filename, mime_type, content
     FROM document_attachments
     WHERE id = $1 AND document_id = $2`,
    [attachmentId, documentId],
  );
  return rows[0] || null;
}

// only files that were never submitted can be removed
async function deleteAttachment(documentId, attachmentId, user) {
  const { rows } = await pool.query(
    `DELETE FROM document_attachments a
     USING documents d
     WHERE a.id = $2
       AND a.document_id = $1
       AND d.id = a.document_id
       AND d.owner_id = $3
       AND d.status IN ('DRAFT', 'CHANGES_REQUESTED')
       AND a.revision_id IS NULL
     RETURNING a.id`,
    [documentId, attachmentId, user.id],
  );
  return rows[0] || null;
}

module.exports = { addAttachment, listAttachments, getFile, deleteAttachment };
