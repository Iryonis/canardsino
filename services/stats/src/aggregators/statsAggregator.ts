import mongoose from 'mongoose';
import { redisCache } from '../cache/redisClient';

const GameHistorySchema = new mongoose.Schema({
  userId: String,
  sessionId: String,
  gameType: String,
  bets: Array,
  totalBet: Number,
  totalWin: Number,
  netResult: Number,
  rouletteDetails: Object,
  createdAt: { type: Date, default: Date.now },
});

const GameHistory = mongoose.model('GameHistory', GameHistorySchema, 'game_history');
export interface UserStats {
  userId: string;
  totalGames: number;
  totalBets: number;
  totalWins: number;
  netResult: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  favoriteGame: string;
  recentGames: any[];
  allGames: any[];
  lastUpdated: string;
}

export class StatsAggregator {
  
  /**
   * Compute and return user stats. The stats include total games played, total bets, total wins, net result,
   * win rate, biggest win/loss, recent game history and his favorite game type.
   * Uses Redis cache for performance.
   * @param userId The user ID to compute stats for 
   * @param forceRefresh Force refresh from DB, bypassing cache
   * @returns a UserStats object
   */
  static async getUserStats(userId: string, forceRefresh: boolean = false): Promise<UserStats> {
    console.log(`📊 Fetching stats for userId: ${userId}`);
    
    // Try to get from cache first
    if (!forceRefresh) {
      const cachedStats = await redisCache.getUserStats(userId);
      if (cachedStats) {
        console.log(`✅ Returning cached stats for userId: ${userId}`);
        return cachedStats;
      }
    }

    console.log(`📊 Computing stats from DB for userId: ${userId}`);
    
    const gameHistory = await GameHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`   Found ${gameHistory.length} games for this user`);
    
    if (gameHistory.length > 0) {
      console.log(`   Sample game:`, JSON.stringify(gameHistory[0], null, 2));
    } 

    const totalGames = gameHistory.length;
    const totalBets = gameHistory.reduce((sum: number, game: any) => sum + (game.totalBet || 0), 0);
    const totalWins = gameHistory.reduce((sum: number, game: any) => sum + (game.totalWin || 0), 0);
    const netResult = gameHistory.reduce((sum: number, game: any) => sum + (game.netResult || 0), 0);

    const wins = gameHistory.filter((game: any) => (game.netResult || 0) > 0).length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    const biggestWin = gameHistory.length > 0
      ? Math.max(...gameHistory.map((game: any) => game.netResult || 0), 0)
      : 0;

    const biggestLoss = gameHistory.length > 0
      ? Math.min(...gameHistory.map((game: any) => game.netResult || 0), 0)
      : 0;

    const recentGames = gameHistory.slice(0, 10).map((game: any) => ({
      id: game._id,
      gameType: game.gameType,
      totalBet: game.totalBet,
      totalWin: game.totalWin,
      netResult: game.netResult,
      createdAt: game.createdAt,
      bets: game.bets ? game.bets.map((bet: any) => ({
        type: bet.betType,
        values: bet.numbers || [],
        amount: bet.amount,
        payout: bet.payout || 0,
        won: bet.won || false,
      })) : [],
      details: game.rouletteDetails,
    }));

    const allGames = gameHistory.map((game: any) => ({
      id: game._id,
      gameType: game.gameType,
      totalBet: game.totalBet,
      totalWin: game.totalWin,
      netResult: game.netResult,
      createdAt: game.createdAt,
      bets: game.bets ? game.bets.map((bet: any) => ({
        type: bet.betType,
        values: bet.numbers || [],
        amount: bet.amount,
        payout: bet.payout || 0,
        won: bet.won || false,
      })) : [],
      details: game.rouletteDetails,
    }));

    const stats = {
      userId,
      totalGames,
      totalBets,
      totalWins,
      netResult,
      winRate: parseFloat(winRate.toFixed(2)),
      biggestWin,
      biggestLoss,
      favoriteGame: 'roulette',
      allGames,
      recentGames,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the computed stats
    await redisCache.setUserStats(userId, stats);

    return stats;
  }

  /**
   * Update stats incrementally when a new game is completed.
   * More efficient than recomputing everything from DB.
   * @param userId User ID
   * @param newGameData New game data from event
   */
  static async updateStatsIncremental(userId: string, newGameData: any): Promise<UserStats> {
    console.log(`📊 Updating stats incrementally for userId: ${userId}`);

    // Get current stats from cache
    let stats = await redisCache.getUserStats(userId);

    // If not in cache, compute from DB
    if (!stats) {
      console.log(`⚠️ No cached stats, computing from DB`);
      return await this.getUserStats(userId, true);
    }

    // Prepare new game entry
    const newGame = {
      id: newGameData.gameId,
      gameType: 'roulette',
      totalBet: newGameData.totalBet,
      totalWin: newGameData.totalWin,
      netResult: newGameData.netResult,
      createdAt: new Date().toISOString(),
      bets: newGameData.bets || [],
      details: {
        winningNumber: newGameData.winningNumber,
        winningColor: newGameData.winningColor,
      },
    };

    // Update aggregated stats
    stats.totalGames += 1;
    stats.totalBets += newGameData.totalBet;
    stats.totalWins += newGameData.totalWin;
    stats.netResult += newGameData.netResult;

    // Update win rate
    const isWin = newGameData.netResult > 0;
    const previousWins = Math.round((stats.winRate / 100) * (stats.totalGames - 1));
    const newWins = isWin ? previousWins + 1 : previousWins;
    stats.winRate = parseFloat(((newWins / stats.totalGames) * 100).toFixed(2));

    // Update biggest win/loss
    if (newGameData.netResult > stats.biggestWin) {
      stats.biggestWin = newGameData.netResult;
    }
    if (newGameData.netResult < stats.biggestLoss) {
      stats.biggestLoss = newGameData.netResult;
    }

    // Update recent games (prepend new game, keep max 10)
    stats.recentGames = [newGame, ...stats.recentGames].slice(0, 10);

    // Update all games (prepend new game, keep max 100)
    stats.allGames = [newGame, ...(stats.allGames || [])].slice(0, 100);

    stats.lastUpdated = new Date().toISOString();

    // Update cache
    await redisCache.setUserStats(userId, stats);

    console.log(`✅ Stats updated incrementally for userId: ${userId}`);
    return stats;
  }

  static async getUserHistory(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    return await GameHistory.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }
}