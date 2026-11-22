import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB removes the document once expiresAt has passed.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Session ?? mongoose.model("Session", sessionSchema, "sessions");
