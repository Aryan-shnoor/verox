const pool = require("../config/database");

async function createDocument({
  title,
  category,
  description,
  ownerId,
  workflowId,
}) {
  const query = `
    INSERT INTO documents (
      title,
      category,
      description,
      owner_id,
      workflow_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'DRAFT')
    RETURNING
      id,
      title,
      category,
      description,
      owner_id,
      workflow_id,
      status,
      current_stage_order,
      current_attempt_id,
      created_at,
      updated_at
  `;

  const values = [
    title,
    category,
    description || null,
    ownerId,
    workflowId || null,
  ];

  const { rows } = await pool.query(query, values);
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

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const query = `
    SELECT
      id,
      title,
      category,
      description,
      owner_id,
      workflow_id,
      status,
      current_stage_order,
      current_attempt_id,
      created_at,
      updated_at
    FROM documents
    ${whereClause}
    ORDER BY created_at DESC, id DESC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function getDocumentById(id) {
  const query = `
    SELECT
      id,
      title,
      category,
      description,
      owner_id,
      workflow_id,
      status,
      current_stage_order,
      current_attempt_id,
      created_at,
      updated_at
    FROM documents
    WHERE id = $1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function updateDraft(id, { title, category, description, workflowId }) {
  const query = `
    UPDATE documents
    SET
      title = COALESCE($2, title),
      category = COALESCE($3, category),
      description = COALESCE($4, description),
      workflow_id = COALESCE($5, workflow_id),
      updated_at = NOW()
    WHERE id = $1
      AND status = 'DRAFT'
    RETURNING
      id,
      title,
      category,
      description,
      owner_id,
      workflow_id,
      status,
      current_stage_order,
      current_attempt_id,
      created_at,
      updated_at
  `;

  const values = [
    id,
    title ?? null,
    category ?? null,
    description ?? null,
    workflowId ?? null,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDraft,
};
