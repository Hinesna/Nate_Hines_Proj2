import Session from "../models/Session.js";
import { COOKIE_NAME, parseCookies } from "../lib/cookies.js";

export async function requireAuth(req, res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not logged in" });

  const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } }).lean();
  if (!session) return res.status(401).json({ error: "Session expired" });

  req.username = session.username;
  req.sessionToken = token;
  next();
}
