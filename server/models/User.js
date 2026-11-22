import mongoose from "mongoose";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [USERNAME_PATTERN, "Username must be 3-24 characters: lowercase letters, numbers, underscore"],
    },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.User ?? mongoose.model("User", userSchema, "users");
