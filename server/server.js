require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./src/config/database");
const documentRoutes = require("./src/routes/documentRoutes");
const authRoutes = require("./src/routes/authRoutes");
const workflowRoutes = require("./src/routes/workflowRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env");
}
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Verox API is running" });
});

app.get("/api/health/db", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ message: "Database connected" });
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ message: "File is too large. The limit is 5 MB." });
  }
  if (err.name === "MulterError") {
    return res
      .status(400)
      .json({ message: "Upload one file in the form field named 'file'." });
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }
  if (err.code === "23503") {
    return res
      .status(400)
      .json({ message: "A related record does not exist." });
  }
  if (err.code === "23505") {
    return res.status(409).json({ message: "That record already exists." });
  }
  if (err.code === "23514" || err.code === "23502") {
    return res
      .status(400)
      .json({ message: "The data breaks a database rule." });
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
