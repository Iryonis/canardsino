/**
 * BigWin Model - Stores exceptional wins for public display
 * Used for marketing and player engagement
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * BigWin document interface
 */
export interface IBigWin extends Document {
  userId: string;
  username: string;
  gameType: "roulette";
  betType: string;
  betAmount: number;
  winAmount: number;
  multiplier: number;
  isPublic: boolean;
  createdAt: Date;
}

/**
 * BigWin schema definition
 */
const BigWinSchema = new Schema<IBigWin>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["roulette"],
      index: true,
    },
    betType: {
      type: String,
      required: true,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    winAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 0,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "big_wins",
  }
);

// Indexes for efficient queries
BigWinSchema.index({ createdAt: -1 });
BigWinSchema.index({ winAmount: -1 });
BigWinSchema.index({ gameType: 1, createdAt: -1 });

export const BigWin = mongoose.model<IBigWin>("BigWin", BigWinSchema);
