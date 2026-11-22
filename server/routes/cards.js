import { Router } from "express";
import mongoose from "mongoose";
import { cardModelFor } from "../models/cardModelFor.js";

const router = Router();

const PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 50;
const FIELDS = ["name", "rarity", "element", "setRelease"];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Query values that are not plain strings (arrays, objects) are ignored,
// which keeps operator injection out of the filter.
const asText = (value) => (typeof value === "string" ? value.trim() : "");

function containsFilter(text) {
  return { $regex: escapeRegex(text), $options: "i" };
}

function notFound(res) {
  return res.status(404).json({ error: "Card not found" });
}

function badId(res) {
  return res.status(400).json({ errors: { id: "Invalid card id" } });
}

router.get("/", async (req, res) => {
  const Card = cardModelFor(req.username);

  const filter = {};
  const q = asText(req.query.q);
  const rarity = asText(req.query.rarity);
  const element = asText(req.query.element);
  const set = asText(req.query.set);
  if (q) filter.name = containsFilter(q);
  if (rarity) filter.rarity = containsFilter(rarity);
  if (element) filter.element = containsFilter(element);
  if (set) filter.setRelease = containsFilter(set);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || PAGE_SIZE));

  const [total, cards] = await Promise.all([
    Card.countDocuments(filter),
    Card.find(filter)
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  // Total goes in a header so the body stays exactly what MongoDB returned.
  res.set("X-Total-Count", String(total));
  res.json(cards);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
  const card = await cardModelFor(req.username).findById(req.params.id).lean();
  if (!card) return notFound(res);
  res.json(card);
});

router.post("/", async (req, res) => {
  const Card = cardModelFor(req.username);
  const body = req.body ?? {};

  const data = {};
  for (const field of FIELDS) data[field] = body[field];
  if (body.image) data.image = body.image;

  const card = await Card.create(data);
  res.status(201).json(card.toObject());
});

router.post("/:id/update", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const Card = cardModelFor(req.username);
  const card = await Card.findById(req.params.id);
  if (!card) return notFound(res);

  const body = req.body ?? {};
  for (const field of FIELDS) {
    if (field in body) card.set(field, body[field]);
  }
  if (body.removeImage === true) card.set("image", undefined);
  else if (body.image) card.set("image", body.image);

  await card.save(); // runs full Mongoose validation and casting
  res.json(card.toObject());
});

router.post("/:id/delete", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const deleted = await cardModelFor(req.username).findByIdAndDelete(req.params.id).lean();
  if (!deleted) return notFound(res);
  res.json({ deleted: true, _id: deleted._id });
});

export default router;
