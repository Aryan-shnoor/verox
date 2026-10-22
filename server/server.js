const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./src/config/database");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Verox API is running",
  });
});

// for database connection testing

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name,
        current_user AS database_user
    `);

    res.json({
      success: true,
      message: "PostgreSQL connection successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});


app.listen(PORT, () => {
  console.log(`Verox listening on port ${PORT}`);
});
