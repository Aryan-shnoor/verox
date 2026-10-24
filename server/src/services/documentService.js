const pool = require("../config/database");

const COLUMNS = `id, title, category, description, owner_id, workflow_id,
  status, current_stage_order, current_attempt_id, created_at, updated_at`;

async function createDocument({
  title,
  category,
  description,
  ownerId,
  workflowId,
}) {
  const { rows } = await pool.query(
    `INSERT INTO documents (title, category, description, owner_id, workflow_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [title, category, description || null, ownerId, workflowId],
  );
  return rows[0];
}

async function listDocuments({ ownerId, status, search }) {
  const conditions = [];
  const values = [];

  if (ownerId) {
    values.push(ownerId);
    conditions.push(`owner_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`title ILIKE $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM documents ${where} ORDER BY created_at DESC, id DESC`,
    values,
  );
  return rows;
}

async function getDocumentById(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM documents WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function updateDocument(
  id,
  { title, category, description, workflowId },
) {
  const { rows } = await pool.query(
    `UPDATE documents
     SET title = COALESCE($2, title),
         category = COALESCE($3, category),
         description = COALESCE($4, description),
         workflow_id = COALESCE($5, workflow_id),
         updated_at = NOW()
     WHERE id = $1 AND status IN ('DRAFT', 'CHANGES_REQUESTED')
     RETURNING ${COLUMNS}`,
    [
      id,
      title ?? null,
      category ?? null,
      description ?? null,
      workflowId ?? null,
    ],
  );
  return rows[0] || null;
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
};
