const authService = require("../services/authService");

async function register(req, res, next) {
  const { fullName, email, password } = req.body || {};

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    fullName.trim().length > 120
  ) {
    return res
      .status(400)
      .json({ message: "Full name is required (max 120 characters)." });
  }
  if (typeof email !== "string" || !email.includes("@") || email.length > 255) {
    return res.status(400).json({ message: "A valid email is required." });
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    return res
      .status(400)
      .json({ message: "Password must be 8 to 72 characters." });
  }

  try {
    const user = await authService.register({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "That email is already registered." });
    }
    next(err);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const result = await authService.login(
      email.trim().toLowerCase(),
      password,
    );
    if (!result) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user)
      return res.status(401).json({ message: "User no longer exists." });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
