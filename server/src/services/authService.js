const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
}

async function register({ fullName, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email, role`,
    [fullName, email, passwordHash],
  );
  return rows[0];
}

async function login(email, password) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, role, password_hash
     FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) return null;

  return {
    token: makeToken(user),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
}

async function getUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, full_name, email, role FROM users WHERE id = $1",
    [id],
  );
  return rows[0] || null;
}

module.exports = { register, login, getUserById };
