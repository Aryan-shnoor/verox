require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const password = process.env.SEED_PASSWORD || "Verox@123";

const users = [
  ["Test Employee", "test.employee@verox.local", "EMPLOYEE"],
  ["Second Employee", "employee2@verox.local", "EMPLOYEE"],
  ["Reviewer One", "reviewer1@verox.local", "REVIEWER"],
  ["Reviewer Two", "reviewer2@verox.local", "REVIEWER"],
  ["Admin User", "admin@verox.local", "ADMIN"],
];

async function seedUsers() {
  const hash = await bcrypt.hash(password, 10);
  const ids = {};

  for (const [fullName, email, role] of users) {
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           updated_at = NOW()
       RETURNING id`,
      [fullName, email, hash, role],
    );
    ids[email] = rows[0].id;
  }
  return ids;
}

async function seedWorkflow(ids) {
  const name = "Standard Document Approval";

  let { rows } = await pool.query("SELECT id FROM workflows WHERE name = $1", [
    name,
  ]);

  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `INSERT INTO workflows (name, category, description, created_by)
       VALUES ($1, 'Legal', 'Two-stage workflow: reviewer, then admin', $2)
       RETURNING id`,
      [name, ids["admin@verox.local"]],
    ));
  }
  const workflowId = rows[0].id;

  const stages = [
    [1, "Initial Review", "REVIEWER", ids["reviewer1@verox.local"]],
    [2, "Final Approval", "ADMIN", ids["admin@verox.local"]],
  ];

  for (const [order, stageName, role, reviewerId] of stages) {
    await pool.query(
      `INSERT INTO workflow_stages (workflow_id, stage_order, stage_name, reviewer_role, reviewer_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (workflow_id, stage_order) DO UPDATE
       SET stage_name = EXCLUDED.stage_name,
           reviewer_role = EXCLUDED.reviewer_role,
           reviewer_id = EXCLUDED.reviewer_id`,
      [workflowId, order, stageName, role, reviewerId],
    );
  }
}

async function seed() {
  const ids = await seedUsers();
  await seedWorkflow(ids);
  console.log("Seeded users and the demo workflow.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
