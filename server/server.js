const express = require("express");
const cors = require("cors");
const pool = require("./src/config/database");
const documentRoutes = require("./src/routes/documentRoutes");
const authRoutes = require("./src/routes/authRoutes");
require("dotenv").config();

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

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((err, req, res, next) => {
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
