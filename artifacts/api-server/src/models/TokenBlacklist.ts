import mongoose, { Schema } from "mongoose";

// [5.5] Blacklisted tokens on logout. Auto-expire after 7 days via MongoDB TTL index.
const tokenBlacklistSchema = new Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: "7d" },
});

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);
export default TokenBlacklist;
