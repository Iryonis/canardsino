// services/stats/src/models/UserStats.ts
import mongoose, { Schema } from 'mongoose';

const UserStatsSchema = new Schema({
    userId: { type: String, required: true, unique: true, index: true },
    totalGames: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalPayout: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    lastActivity: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

export const UserStats = mongoose.model('UserStats', UserStatsSchema);