const pool = require("../config/database");

const COLUMNS = `id, title, category, description, owner_id, workflow_id,
  status, current_stage_order, current_attempt_id, created_at, updated_at`;

// a document with its owner and whoever it is currently waiting on
const SELECT_DOCUMENT = `
  SELECT d.*,
         u.full_name AS owner_name,
         cr.full_name AS current_reviewer_name,
         cw.stage_name AS current_stage_name
  FROM documents d
  JOIN users u ON u.id = d.owner_id
  LEFT JOIN document_approval_stages cs
    ON cs.attempt_id = d.current_attempt_id
   AND cs.stage_order = d.current_stage_order
  LEFT JOIN users cr ON cr.id = cs.reviewer_id
  LEFT JOIN workflow_stages cw ON cw.id = cs.workflow_stage_id`;

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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO documents (title, category, description, owner_id, workflow_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [title, category, description || null, ownerId, workflowId],
    );

    await client.query(
      `INSERT INTO approval_history (document_id, actor_id, action)
       VALUES ($1, $2, 'CREATED')`,
      [rows[0].id, ownerId],
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
    `${SELECT_DOCUMENT}
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
    `${SELECT_DOCUMENT}
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

// how many visible documents are in each status
async function countByStatus(user) {
  const values = [];
  const allowed = visibleTo(user, values);

  const { rows } = await pool.query(
    `SELECT d.status, COUNT(*) AS total
     FROM documents d
     WHERE ${allowed}
     GROUP BY d.status`,
    values,
  );

  const counts = {
    DRAFT: 0,
    PENDING_REVIEW: 0,
    CHANGES_REQUESTED: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  for (const row of rows) counts[row.status] = row.total;
  counts.total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return counts;
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  countByStatus,
};
