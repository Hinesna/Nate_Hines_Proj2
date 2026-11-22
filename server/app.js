import express, { Router } from "express";
import { connectDb } from "./db.js";
import { requireAuth } from "./middleware/requireAuth.js";
import authRoutes from "./routes/auth.js";
import cardRoutes from "./routes/cards.js";

const app = express();
const api = Router();

app.use(express.json({ limit: "1100kb" }));

// Smoke test: no database needed.
api.get("/health", (req, res) => res.json({ ok: true }));

// CSRF guard: a cross-site HTML form cannot send application/json.
api.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }
  next();
});

api.use(async (req, res, next) => {
  await connectDb();
  next();
});

api.use("/auth", authRoutes);
api.use("/cards", requireAuth, cardRoutes);

api.use((req, res) => res.status(404).json({ error: "Not found" }));

// Works locally and behind the Netlify redirect (/api/* -> /.netlify/functions/api/*).
app.use(["/api", "/.netlify/functions/api"], api);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = {};
    for (const [field, detail] of Object.entries(err.errors)) errors[field] = detail.message;
    return res.status(400).json({ errors });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ errors: { [err.path]: `Invalid value for ${err.path}` } });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

export default app;
