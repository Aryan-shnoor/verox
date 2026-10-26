const pool = require("../config/database");
const httpError = require("../utils/httpError");

async function submitDocument(documentId, user, comment) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // lock the row so a double click can't submit twice
    const docResult = await client.query(
      "SELECT * FROM documents WHERE id = $1 AND owner_id = $2 FOR UPDATE",
      [documentId, user.id],
    );
    const doc = docResult.rows[0];

    if (!doc) throw httpError(404, "Document not found.");

    if (doc.status !== "DRAFT" && doc.status !== "CHANGES_REQUESTED") {
      throw httpError(409, "This document can't be submitted right now.");
    }
    if (!doc.workflow_id) {
      throw httpError(400, "Choose a workflow before submitting.");
    }

    const workflowResult = await client.query(
      "SELECT is_active FROM workflows WHERE id = $1",
      [doc.workflow_id],
    );
    if (!workflowResult.rows[0].is_active) {
      throw httpError(
        400,
        "This workflow is no longer active. Choose another one.",
      );
    }

    const stagesResult = await client.query(
      `SELECT id, stage_order, reviewer_id
       FROM workflow_stages
       WHERE workflow_id = $1
       ORDER BY stage_order`,
      [doc.workflow_id],
    );
    const stages = stagesResult.rows;

    if (stages.length === 0 || stages.some((s) => !s.reviewer_id)) {
      throw httpError(400, "The workflow needs a reviewer on every stage.");
    }
    if (stages.some((s) => s.reviewer_id === doc.owner_id)) {
      throw httpError(
        400,
        "You can't review your own document. Choose a workflow with other reviewers.",
      );
    }

    const versionResult = await client.query(
      "SELECT COALESCE(MAX(version_number), 0) AS last FROM document_revisions WHERE document_id = $1",
      [doc.id],
    );
    const revisionResult = await client.query(
      `INSERT INTO document_revisions
         (document_id, version_number, submitted_by, title, category, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        doc.id,
        versionResult.rows[0].last + 1,
        user.id,
        doc.title,
        doc.category,
        doc.description,
      ],
    );
    const revisionId = revisionResult.rows[0].id;

    const numberResult = await client.query(
      "SELECT COALESCE(MAX(attempt_number), 0) AS last FROM document_approval_attempts WHERE document_id = $1",
      [doc.id],
    );
    const attemptResult = await client.query(
      `INSERT INTO document_approval_attempts (document_id, attempt_number, started_by)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [doc.id, numberResult.rows[0].last + 1, user.id],
    );
    const attemptId = attemptResult.rows[0].id;

    for (const stage of stages) {
      await client.query(
        `INSERT INTO document_approval_stages
           (document_id, attempt_id, workflow_stage_id, stage_order, reviewer_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          doc.id,
          attemptId,
          stage.id,
          stage.stage_order,
          stage.reviewer_id,
          stage.stage_order === 1 ? "PENDING" : "WAITING",
        ],
      );
    }

    await client.query(
      `UPDATE documents
       SET status = 'PENDING_REVIEW',
           current_stage_order = 1,
           current_attempt_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [doc.id, attemptId],
    );

    const action = doc.status === "DRAFT" ? "SUBMITTED" : "RESUBMITTED";
    await client.query(
      `INSERT INTO approval_history
         (document_id, attempt_id, revision_id, actor_id, action, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [doc.id, attemptId, revisionId, user.id, action, comment],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getApproval(documentId) {
  const attemptsResult = await pool.query(
    `SELECT a.id, a.attempt_number, a.status, a.started_at, a.completed_at,
            u.full_name AS started_by_name
     FROM document_approval_attempts a
     JOIN users u ON u.id = a.started_by
     WHERE a.document_id = $1
     ORDER BY a.attempt_number`,
    [documentId],
  );

  const stagesResult = await pool.query(
    `SELECT s.id, s.attempt_id, s.stage_order, s.status, s.reviewer_id,
            u.full_name AS reviewer_name, w.stage_name
     FROM document_approval_stages s
     LEFT JOIN workflow_stages w ON w.id = s.workflow_stage_id
     LEFT JOIN users u ON u.id = s.reviewer_id
     WHERE s.document_id = $1
     ORDER BY s.attempt_id, s.stage_order`,
    [documentId],
  );

  const historyResult = await pool.query(
    `SELECT h.id, h.action, h.comment, h.created_at,
            u.full_name AS actor_name,
            a.attempt_number,
            ds.stage_order
     FROM approval_history h
     JOIN users u ON u.id = h.actor_id
     LEFT JOIN document_approval_attempts a ON a.id = h.attempt_id
     LEFT JOIN document_approval_stages ds ON ds.id = h.stage_id
     WHERE h.document_id = $1
     ORDER BY h.created_at, h.id`,
    [documentId],
  );

  const attempts = attemptsResult.rows.map((attempt) => ({
    ...attempt,
    stages: stagesResult.rows.filter((s) => s.attempt_id === attempt.id),
  }));

  return { attempts, history: historyResult.rows };
}


// closes the current attempt and sets the final document status
async function finish(client, doc, result) {
  await client.query(
    "UPDATE document_approval_attempts SET status = $2, completed_at = NOW() WHERE id = $1",
    [doc.current_attempt_id, result]
  );
  await client.query(
    `UPDATE documents
     SET status = $2, current_stage_order = NULL, updated_at = NOW()
     WHERE id = $1`,
    [doc.id, result]
  );
}

async function decide(documentId, user, action, comment) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const docResult = await client.query(
      "SELECT * FROM documents WHERE id = $1 FOR UPDATE",
      [documentId]
    );
    const doc = docResult.rows[0];

    if (!doc) throw httpError(404, "Document not found.");
    if (doc.status !== "PENDING_REVIEW") {
      throw httpError(409, "This document is not waiting for a review.");
    }

    const stageResult = await client.query(
      `SELECT * FROM document_approval_stages
       WHERE attempt_id = $1 AND stage_order = $2 AND status = 'PENDING'`,
      [doc.current_attempt_id, doc.current_stage_order]
    );
    const stage = stageResult.rows[0];

    if (!stage) throw httpError(409, "This document has no pending stage.");
    if (stage.reviewer_id !== user.id) {
      throw httpError(403, "You are not the assigned reviewer for the current stage.");
    }

    // the revision being reviewed is the latest one
    const revisionResult = await client.query(
      `SELECT id FROM document_revisions
       WHERE document_id = $1
       ORDER BY version_number DESC
       LIMIT 1`,
      [doc.id]
    );

    await client.query(
      "UPDATE document_approval_stages SET status = $2 WHERE id = $1",
      [stage.id, action]
    );

    await client.query(
      `INSERT INTO approval_history
         (document_id, attempt_id, stage_id, revision_id, actor_id, action, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [doc.id, doc.current_attempt_id, stage.id, revisionResult.rows[0].id, user.id, action, comment]
    );

    if (action === "APPROVED") {
      const nextResult = await client.query(
        `SELECT id, stage_order FROM document_approval_stages
         WHERE attempt_id = $1 AND stage_order > $2
         ORDER BY stage_order
         LIMIT 1`,
        [doc.current_attempt_id, stage.stage_order]
      );
      const next = nextResult.rows[0];

      if (next) {
        await client.query(
          "UPDATE document_approval_stages SET status = 'PENDING' WHERE id = $1",
          [next.id]
        );
        await client.query(
          "UPDATE documents SET current_stage_order = $2, updated_at = NOW() WHERE id = $1",
          [doc.id, next.stage_order]
        );
      } else {
        await finish(client, doc, "APPROVED");
      }
    } else {
      // rejected or changes requested: the remaining stages won't happen
      await client.query(
        `UPDATE document_approval_stages
         SET status = 'SKIPPED'
         WHERE attempt_id = $1 AND status = 'WAITING'`,
        [doc.current_attempt_id]
      );
      await finish(client, doc, action);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// documents waiting for this reviewer's decision right now
async function listPending(userId) {
  const { rows } = await pool.query(
    `SELECT d.id AS document_id, d.title, d.category,
            u.full_name AS owner_name,
            s.stage_order, w.stage_name,
            a.attempt_number, a.started_at
     FROM document_approval_stages s
     JOIN documents d ON d.id = s.document_id AND d.current_attempt_id = s.attempt_id
     JOIN document_approval_attempts a ON a.id = s.attempt_id
     JOIN users u ON u.id = d.owner_id
     LEFT JOIN workflow_stages w ON w.id = s.workflow_stage_id
     WHERE s.reviewer_id = $1
       AND s.status = 'PENDING'
       AND d.status = 'PENDING_REVIEW'
     ORDER BY a.started_at`,
    [userId]
  );
  return rows;
}

// decisions this reviewer has made, newest first
async function listReviewHistory(userId) {
  const { rows } = await pool.query(
    `SELECT h.id, h.document_id, d.title, h.action, h.comment, h.created_at,
            a.attempt_number, s.stage_order
     FROM approval_history h
     JOIN documents d ON d.id = h.document_id
     LEFT JOIN document_approval_attempts a ON a.id = h.attempt_id
     LEFT JOIN document_approval_stages s ON s.id = h.stage_id
     WHERE h.actor_id = $1
       AND h.action IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
     ORDER BY h.created_at DESC, h.id DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  submitDocument,
  getApproval,
  decide,
  listPending,
  listReviewHistory,
};
