import { GameStats } from '../models/GameStats';
import { UserStats } from '../models/UserStats';

export class StatsAggregator {
    /**
     * Update game statistics
     */
    static async updateGameStats(event: any): Promise<void> {
        const { gameId, gameName, userId, betAmount, resultAmount, win } = event;

        // Update global game stats
        await GameStats.findOneAndUpdate(
            { gameName },
            {
                $inc: {
                    totalGames: 1,
                    totalBets: betAmount,
                    totalWins: win ? 1 : 0,
                    totalPayout: resultAmount,
                },
                $set: { lastUpdated: new Date() },
            },
            { upsert: true, new: true }
        );

        // Update user stats
        await UserStats.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    totalGames: 1,
                    totalBets: betAmount,
                    totalWins: win ? 1 : 0,
                    totalPayout: resultAmount,
                    netProfit: resultAmount - betAmount,
                },
                $set: { lastPlayed: new Date() },
            },
            { upsert: true, new: true }
        );
    }

    /**
     * Update bet statistics
     */
    static async updateBetStats(event: any): Promise<void> {
        // Track real-time betting activity
        // Could store in Redis for fast access
    }

    /**
     * Update wallet statistics
     */
    static async updateWalletStats(event: any): Promise<void> {
        const { userId, balance, currency } = event;

        await UserStats.findOneAndUpdate(
            { userId },
            {
                $set: { 
                    currentBalance: balance,
                    lastActivity: new Date(),
                },
            },
            { upsert: true }
        );
    }

    /**
     * Get global statistics
     */
    static async getGlobalStats(): Promise<any> {
        const gameStats = await GameStats.find({});
        
        return {
            totalGames: gameStats.reduce((sum, g) => sum + g.totalGames, 0),
            totalBets: gameStats.reduce((sum, g) => sum + g.totalBets, 0),
            totalWins: gameStats.reduce((sum, g) => sum + g.totalWins, 0),
            gameBreakdown: gameStats,
        };
    }

    /**
     * Get user specific statistics
     */
    static async getUserStats(userId: string): Promise<any> {
        return await UserStats.findOne({ userId }).lean();
    }

    /**
     * Get live betting statistics
     */
    static async getLiveBetStats(): Promise<any> {
        // Return last 10 bets or aggregated live data
        const recentGames = await GameStats.find({})
            .sort({ lastUpdated: -1 })
            .limit(10);

        return {
            recentActivity: recentGames,
            timestamp: new Date(),
        };
    }

    /**
     * Get user wallet statistics
     */
    static async getUserWalletStats(userId: string): Promise<any> {
        const userStats = await UserStats.findOne({ userId });
        return {
            currentBalance: userStats?.currentBalance || 0,
            netProfit: userStats?.netProfit || 0,
            totalBets: userStats?.totalBets || 0,
        };
    }
}