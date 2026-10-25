const pool = require("../config/database");

const COLUMNS = `id, title, category, description, owner_id, workflow_id,
  status, current_stage_order, current_attempt_id, created_at, updated_at`;

// SQL condition for "this user may see this document".
// It adds the user id to values and uses its placeholder.
function visibleTo(user, values) {
  if (user.role === "ADMIN") return "TRUE";

  values.push(user.id);
  const n = values.length;
  return `(d.owner_id = $${n} OR EXISTS (
    SELECT 1 FROM document_approval_stages s
    WHERE s.document_id = d.id AND s.reviewer_id = $${n}
  ))`;
}

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

async function listDocuments({ user, status, category, search }) {
  const values = [];
  const conditions = [visibleTo(user, values)];

  if (status) {
    values.push(status);
    conditions.push(`d.status = $${values.length}`);
  }
  if (category) {
    values.push(category);
    conditions.push(`d.category = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(d.title ILIKE $${values.length} OR d.description ILIKE $${values.length})`,
    );
  }

  const { rows } = await pool.query(
    `SELECT d.*, u.full_name AS owner_name
     FROM documents d
     JOIN users u ON u.id = d.owner_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY d.created_at DESC, d.id DESC`,
    values,
  );
  return rows;
}

async function getDocumentById(id, user) {
  const values = [id];
  const allowed = visibleTo(user, values);

  const { rows } = await pool.query(
    `SELECT d.*, u.full_name AS owner_name
     FROM documents d
     JOIN users u ON u.id = d.owner_id
     WHERE d.id = $1 AND ${allowed}`,
    values,
  );
  return rows[0] || null;
}

async function updateDocument(
  id,
  ownerId,
  { title, category, description, workflowId },
) {
  const { rows } = await pool.query(
    `UPDATE documents
     SET title = COALESCE($3, title),
         category = COALESCE($4, category),
         description = COALESCE($5, description),
         workflow_id = COALESCE($6, workflow_id),
         updated_at = NOW()
     WHERE id = $1
       AND owner_id = $2
       AND status IN ('DRAFT', 'CHANGES_REQUESTED')
     RETURNING ${COLUMNS}`,
    [
      id,
      ownerId,
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
