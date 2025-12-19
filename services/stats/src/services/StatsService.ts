import StatsModel from '../models/StatsModel';
import  { Game } from '../../shared/types/game';
import { sseManager } from '../sse';

export class StatsService {
    /**
     * Increment the count of a specific statistic for a user.
     */
    static async incrementStat(userId: string, statField: 'wins' | 'losses' | 'balance', incrementBy: number = 1): Promise<void> {
        const update: any = {};
        update[statField] = incrementBy;

        const updatedStats = await StatsModel.findOneAndUpdate(
            { userId },
            { $inc: update },
            { upsert: true, new: true }
        );

        // Send SSE update to connected clients
        if (updatedStats) {
            sseManager.sendToUser(userId, {
                type: 'stats_updated',
                stats: updatedStats
            });
        }
    }

    /**
     * Add a played game to the user's statistics.
     */
    static async addPlayedGame(userId: string, gameData: Game): Promise<void> {
        const updatedStats = await StatsModel.findOneAndUpdate(
            { userId },
            { $push: { gamesPlayed: gameData } },
            { upsert: true, new: true }
        );

        // Send SSE update to connected clients
        if (updatedStats) {
            sseManager.sendToUser(userId, {
                type: 'game_added',
                stats: updatedStats
            });
        }
    }

    /**
     * Retrieve statistics for a specific user.
     */
    statconst updatedStats = await StatsModel.findOneAndUpdate(
            { userId },
            { $set: { balance: newBalance } },
            { upsert: true, new: true }
        );

        // Send SSE update to connected clients
        if (updatedStats) {
            sseManager.sendToUser(userId, {
                type: 'balance_updated',
                stats: updatedStats
            });
        }
     * Updaate the balance for a specific user.
     */
    static async updateBalance(userId: string, newBalance: number): Promise<void> {
        await StatsModel.findOneAndUpdate(
            { userId },
            { $set: { balance: newBalance } },
            { upsert: true, new: true }
        );
    }
}