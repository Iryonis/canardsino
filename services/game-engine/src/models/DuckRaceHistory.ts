/**
 * DuckRaceHistory Model - History of all duck races
 * Stores race results, participants, and outcomes
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Participant in a duck race
 */
export interface IDuckRaceParticipant {
  userId: string;
  username: string;
  lane: number;
  finalPosition: number;
  rank: number;
  betAmount: number;
  winAmount: number;
  netResult: number;
}

/**
 * DuckRaceHistory document interface
 */
export interface IDuckRaceHistory extends Document {
  roundId: string;
  roomId: string;
  betAmount: number;
  totalPot: number;
  participants: IDuckRaceParticipant[];
  winnerId: string;
  winnerUsername: string;
  trackLength: number;
  raceSnapshots: number;
  createdAt: Date;
}

/**
 * Participant sub-schema
 */
const DuckRaceParticipantSchema = new Schema<IDuckRaceParticipant>(
  {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    lane: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    finalPosition: {
      type: Number,
      required: true,
      min: 0,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
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
    netResult: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

/**
 * DuckRaceHistory schema definition
 */
const DuckRaceHistorySchema = new Schema<IDuckRaceHistory>(
  {
    roundId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPot: {
      type: Number,
      required: true,
      min: 0,
    },
    participants: {
      type: [DuckRaceParticipantSchema],
      required: true,
      validate: {
        validator: function (v: IDuckRaceParticipant[]) {
          return v.length >= 1 && v.length <= 5;
        },
        message: "Race must have between 1 and 5 participants",
      },
    },
    winnerId: {
      type: String,
      required: true,
      index: true,
    },
    winnerUsername: {
      type: String,
      required: true,
    },
    trackLength: {
      type: Number,
      required: true,
      default: 100,
    },
    raceSnapshots: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "duck_race_history",
  }
);

// Indexes for efficient queries
DuckRaceHistorySchema.index({ createdAt: -1 });
DuckRaceHistorySchema.index({ winnerId: 1, createdAt: -1 });
DuckRaceHistorySchema.index({ "participants.userId": 1, createdAt: -1 });

export const DuckRaceHistory = mongoose.model<IDuckRaceHistory>(
  "DuckRaceHistory",
  DuckRaceHistorySchema
);
