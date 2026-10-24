require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

const migrationsDir = path.join(__dirname, "../../migrations");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const applied = rows.map((row) => row.filename);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let count = 0;

  for (const file of files) {
    if (applied.includes(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file],
      );
      await client.query("COMMIT");
      console.log("Applied", file);
      count++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  if (count === 0) console.log("Nothing to apply.");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
