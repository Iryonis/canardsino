/**
 * GameSession Model - Manages game sessions for single and multiplayer games
 * Tracks active and completed sessions with comprehensive statistics
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Player in a game session
 */
export interface ISessionPlayer {
  userId: string;
  username: string;
  joinedAt: Date;
  leftAt?: Date;
  totalBet: number;
  totalWin: number;
  netResult: number;
}

/**
 * GameSession document interface
 */
export interface IGameSession extends Document {
  sessionId: string;
  gameType: "roulette";
  sessionType: "single" | "multiplayer";
  status: "active" | "completed" | "cancelled" | "paused";
  players: ISessionPlayer[];
  hostUserId?: string;
  totalRounds: number;
  totalBets: number;
  totalWins: number;
  startedAt: Date;
  endedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Session player sub-schema
 */
const SessionPlayerSchema = new Schema<ISessionPlayer>(
  {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    totalBet: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWin: {
      type: Number,
      default: 0,
      min: 0,
    },
    netResult: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

/**
 * GameSession schema definition
 */
const GameSessionSchema = new Schema<IGameSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["roulette"],
      index: true,
    },
    sessionType: {
      type: String,
      required: true,
      enum: ["single", "multiplayer"],
      default: "single",
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "completed", "cancelled", "paused"],
      default: "active",
      index: true,
    },
    players: {
      type: [SessionPlayerSchema],
      required: true,
      validate: {
        validator: function (v: ISessionPlayer[]) {
          return v.length > 0;
        },
        message: "Session must have at least one player",
      },
    },
    hostUserId: {
      type: String,
      index: true,
    },
    totalRounds: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBets: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWins: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: "game_sessions",
  }
);

// Compound indexes for efficient queries
GameSessionSchema.index({ gameType: 1, status: 1 });
GameSessionSchema.index({ "players.userId": 1, startedAt: -1 });
GameSessionSchema.index({ status: 1, startedAt: -1 });

export const GameSession = mongoose.model<IGameSession>(
  "GameSession",
  GameSessionSchema
);
