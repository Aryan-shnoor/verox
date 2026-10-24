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

async function seed() {
  const hash = await bcrypt.hash(password, 10);

  for (const [fullName, email, role] of users) {
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           updated_at = NOW()`,
      [fullName, email, hash, role],
    );
  }

  console.log(`Seeded ${users.length} users.`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
