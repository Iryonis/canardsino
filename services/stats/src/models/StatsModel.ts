// services/stats/src/models/GameStats.ts
import mongoose, { Schema } from 'mongoose';

const GameStatsSchema = new Schema({
    gameName: { type: String, required: true, unique: true },
    totalGames: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalPayout: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
});

export const GameStats = mongoose.model('GameStats', GameStatsSchema);