import { Router } from "express";
import { randomBytes } from "node:crypto";
import User, { USERNAME_PATTERN } from "../models/User.js";
import Session from "../models/Session.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { COOKIE_NAME } from "../lib/cookies.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const SESSION_DAYS = 7;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;

async function startSession(res, username) {
  const token = randomBytes(32).toString("hex");
  const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000;
  await Session.create({ token, username, expiresAt: new Date(Date.now() + maxAge) });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !process.env.NETLIFY_DEV, // plain http on localhost during `netlify dev`
    path: "/",
    maxAge,
  });
}

router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};

  const errors = {};
  if (typeof username !== "string" || !USERNAME_PATTERN.test(username.trim().toLowerCase())) {
    errors.username = "Username must be 3-24 characters: lowercase letters, numbers, underscore";
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    errors.password = `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters`;
  }
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const name = username.trim().toLowerCase();
  if (await User.exists({ username: name })) {
    return res.status(409).json({ errors: { username: "That username is already taken" } });
  }

  const { salt, passwordHash } = await hashPassword(password);
  try {
    await User.create({ username: name, salt, passwordHash });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ errors: { username: "That username is already taken" } });
    }
    throw err;
  }

  await startSession(res, name);
  res.status(201).json({ username: name });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  const failure = { errors: { password: "Invalid username or password" } };

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(401).json(failure);
  }
  const name = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(name)) return res.status(401).json(failure);

  const user = await User.findOne({ username: name }).lean();
  if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
    return res.status(401).json(failure);
  }

  await startSession(res, name);
  res.json({ username: name });
});

router.post("/logout", requireAuth, async (req, res) => {
  await Session.deleteOne({ token: req.sessionToken });
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ loggedOut: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ username: req.username });
});

export default router;
