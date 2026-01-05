/**
 * GameHistory Model - Comprehensive history of all games and bets for each player
 * Stores detailed records for audit, analytics, and player history
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Individual bet within a game round
 */
export interface IGameBet {
  betType: string;
  numbers?: number[];
  amount: number;
  payout: number;
  won: boolean;
  multiplier: number;
}

/**
 * Roulette-specific game details
 */
export interface IRouletteDetails {
  winningNumber: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column?: number;
  dozen?: number;
  randomSource: string;
}

/**
 * GameHistory document interface
 */
export interface IGameHistory extends Document {
  userId: string;
  sessionId: string;
  gameType: "roulette";
  bets: IGameBet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  rouletteDetails?: IRouletteDetails;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Game bet sub-schema
 */
const GameBetSchema = new Schema<IGameBet>(
  {
    betType: {
      type: String,
      required: true,
    },
    numbers: {
      type: [Number],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payout: {
      type: Number,
      required: true,
      min: 0,
    },
    won: {
      type: Boolean,
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Roulette details sub-schema
 */
const RouletteDetailsSchema = new Schema<IRouletteDetails>(
  {
    winningNumber: {
      type: Number,
      required: true,
      min: 0,
      max: 36,
    },
    color: {
      type: String,
      required: true,
      enum: ["red", "black", "green"],
    },
    parity: {
      type: String,
      required: true,
      enum: ["even", "odd", "zero"],
    },
    range: {
      type: String,
      required: true,
      enum: ["low", "high", "zero"],
    },
    column: {
      type: Number,
      min: 1,
      max: 3,
    },
    dozen: {
      type: Number,
      min: 1,
      max: 3,
    },
    randomSource: {
      type: String,
      required: true,
      default: "Math.random",
    },
  },
  { _id: false }
);

/**
 * GameHistory schema definition
 */
const GameHistorySchema = new Schema<IGameHistory>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["roulette"],
      index: true,
    },
    bets: {
      type: [GameBetSchema],
      required: true,
      validate: {
        validator: function (v: IGameBet[]) {
          return v.length > 0;
        },
        message: "Game must have at least one bet",
      },
    },
    totalBet: {
      type: Number,
      required: true,
      min: 0,
    },
    totalWin: {
      type: Number,
      required: true,
      min: 0,
    },
    netResult: {
      type: Number,
      required: true,
    },
    rouletteDetails: {
      type: RouletteDetailsSchema,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: "game_history",
  }
);

// Indexes for efficient queries
GameHistorySchema.index({ userId: 1, createdAt: -1 });
GameHistorySchema.index({ gameType: 1, createdAt: -1 });
GameHistorySchema.index({ userId: 1, gameType: 1, createdAt: -1 });
GameHistorySchema.index({ netResult: -1 });

export const GameHistory = mongoose.model<IGameHistory>(
  "GameHistory",
  GameHistorySchema
);
