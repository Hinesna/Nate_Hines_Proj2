import mongoose from "mongoose";
import { USERNAME_PATTERN } from "./User.js";

const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_LENGTH = 1_000_000;

export const cardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name must be 100 characters or fewer"],
    },
    rarity: {
      type: String,
      trim: true,
      maxlength: [50, "Rarity must be 50 characters or fewer"],
    },
    element: {
      type: String,
      required: [true, "Element is required"],
      trim: true,
      maxlength: [50, "Element must be 50 characters or fewer"],
    },
    setRelease: {
      type: String,
      trim: true,
      maxlength: [100, "Card set must be 100 characters or fewer"],
    },
    // Base64 data URL, stored and returned exactly as received.
    image: {
      type: String,
      maxlength: [MAX_IMAGE_LENGTH, "Image is too large"],
      match: [IMAGE_PATTERN, "Image must be a PNG, JPEG, WebP or GIF"],
    },
  },
  { timestamps: true }
);

// One collection per user: CCLE_<username>. The collection name is passed
// explicitly so Mongoose does not pluralize it.
export function cardModelFor(username) {
  if (!USERNAME_PATTERN.test(username)) throw new Error("Invalid username");
  const name = `CCLE_${username}`;
  return mongoose.models[name] ?? mongoose.model(name, cardSchema, name);
}
