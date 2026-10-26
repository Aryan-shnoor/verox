const pool = require("../config/database");

async function addStages(workflows) {
  if (workflows.length === 0) return workflows;

  const ids = workflows.map((w) => w.id);
  const { rows } = await pool.query(
    `SELECT s.id, s.workflow_id, s.stage_order, s.stage_name,
            s.reviewer_role, s.reviewer_id, u.full_name AS reviewer_name
     FROM workflow_stages s
     LEFT JOIN users u ON u.id = s.reviewer_id
     WHERE s.workflow_id = ANY($1)
     ORDER BY s.workflow_id, s.stage_order`,
    [ids],
  );

  return workflows.map((w) => ({
    ...w,
    stages: rows.filter((s) => s.workflow_id === w.id),
  }));
}

async function listWorkflows(onlyActive) {
  const { rows } = await pool.query(
    `SELECT id, name, category, description, is_active, created_at
     FROM workflows
     WHERE ($1 = FALSE OR is_active = TRUE)
     ORDER BY id`,
    [onlyActive],
  );
  return addStages(rows);
}

async function getWorkflowById(id, onlyActive) {
  const { rows } = await pool.query(
    `SELECT id, name, category, description, is_active, created_at
     FROM workflows
     WHERE id = $1 AND ($2 = FALSE OR is_active = TRUE)`,
    [id, onlyActive],
  );
  if (rows.length === 0) return null;

  const [workflow] = await addStages(rows);
  return workflow;
}

async function listReviewers() {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, role
     FROM users
     WHERE role IN ('REVIEWER', 'ADMIN')
     ORDER BY role, full_name`,
  );
  return rows;
}

async function findReviewers(ids) {
  const { rows } = await pool.query(
    `SELECT id, role FROM users
     WHERE id = ANY($1) AND role IN ('REVIEWER', 'ADMIN')`,
    [ids],
  );
  return rows;
}

async function createWorkflow({
  name,
  category,
  description,
  stages,
  createdBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO workflows (name, category, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, category, description || null, createdBy],
    );
    const workflowId = rows[0].id;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      await client.query(
        `INSERT INTO workflow_stages
           (workflow_id, stage_order, stage_name, reviewer_role, reviewer_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          workflowId,
          i + 1,
          stage.stageName,
          stage.reviewerRole,
          stage.reviewerId,
        ],
      );
    }

    await client.query("COMMIT");
    return workflowId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function setActive(id, isActive) {
  const { rows } = await pool.query(
    "UPDATE workflows SET is_active = $2 WHERE id = $1 RETURNING id",
    [id, isActive],
  );
  return rows[0] || null;
}

module.exports = {
  listWorkflows,
  getWorkflowById,
  listReviewers,
  findReviewers,
  createWorkflow,
  setActive,
};
