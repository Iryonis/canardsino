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
  // Additional game-specific fields can be added here
  metadata: Object,
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
  gameStats: Record<string, { gamesPlayed: number; netResult: number }>; // Stats per game type
  recentGames: any[];
  allGames: any[];
  lastUpdated: string;
}

export class StatsAggregator {
  
  /**
   * Extract game-specific details based on game type
   * @param game Game object from DB
   * @returns Game details object
   */
  private static extractGameDetails(game: any): any {
    switch (game.gameType) {
      case 'roulette':
        return {
          winningNumber: game.rouletteDetails?.winningNumber,
          winningColor: game.rouletteDetails?.color,
          parity: game.rouletteDetails?.parity,
          range: game.rouletteDetails?.range,
        };
      case 'duck-race':
        return {
          lane: game.metadata?.lane,
          finalPosition: game.metadata?.finalPosition,
          rank: game.metadata?.rank,
          winnerId: game.metadata?.winnerId,
          winnerUsername: game.metadata?.winnerUsername,
          totalPlayers: game.metadata?.totalPlayers,
        };
      default:
        return game.metadata || {};
    }
  }

  /**
   * Calculate favorite game type based on number of games played
   * @param gameHistory Array of games
   * @returns Favorite game type
   */
  private static calculateFavoriteGame(gameHistory: any[]): string {
    if (gameHistory.length === 0) return 'none';

    const gameCounts = gameHistory.reduce((acc: Record<string, number>, game: any) => {
      const gameType = game.gameType || 'unknown';
      acc[gameType] = (acc[gameType] || 0) + 1;
      return acc;
    }, {});

    const favoriteGame = Object.keys(gameCounts).reduce((a, b) => 
      gameCounts[a] > gameCounts[b] ? a : b
    );

    return favoriteGame;
  }

  /**
   * Calculate stats per game type
   * @param gameHistory Array of games
   * @returns Object with stats per game type
   */
  private static calculateGameStats(gameHistory: any[]): Record<string, { gamesPlayed: number; netResult: number }> {
    return gameHistory.reduce((acc: any, game: any) => {
      const gameType = game.gameType || 'unknown';
      if (!acc[gameType]) {
        acc[gameType] = { gamesPlayed: 0, netResult: 0 };
      }
      acc[gameType].gamesPlayed += 1;
      acc[gameType].netResult += game.netResult || 0;
      return acc;
    }, {});
  }

  /**
   * Compute and return user stats. The stats include total games played, total bets, total wins, net result,
   * win rate, biggest win/loss, recent game history and favorite game type.
   * Uses Redis cache for performance. Now supports multiple game types.
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

    // Calculate favorite game dynamically
    const favoriteGame = this.calculateFavoriteGame(gameHistory);

    // Calculate stats per game type
    const gameStats = this.calculateGameStats(gameHistory);

    const recentGames = gameHistory.slice(0, 10).map((game: any) => ({
      id: game._id,
      gameType: game.gameType || 'unknown',
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
      details: this.extractGameDetails(game),
    }));

    const allGames = gameHistory.map((game: any) => ({
      id: game._id,
      gameType: game.gameType || 'unknown',
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
      details: this.extractGameDetails(game),
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
      favoriteGame,
      gameStats,
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
   * Now supports multiple game types dynamically.
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

    const gameType = newGameData.gameType || 'unknown';

    // Extract game-specific details
    let details: any = {};
    if (gameType === 'roulette') {
      details = {
        winningNumber: newGameData.winningNumber,
        winningColor: newGameData.winningColor,
      };
    } else if (gameType === 'duck-race') {
      details = newGameData.details || {};
    } else {
      details = newGameData.details || {};
    }

    // Prepare new game entry
    const newGame = {
      id: newGameData.gameId,
      gameType,
      totalBet: newGameData.totalBet,
      totalWin: newGameData.totalWin,
      netResult: newGameData.netResult,
      createdAt: new Date().toISOString(),
      bets: newGameData.bets || [],
      details,
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

    // Update gameStats per type
    if (!stats.gameStats) {
      stats.gameStats = {};
    }
    if (!stats.gameStats[gameType]) {
      stats.gameStats[gameType] = { gamesPlayed: 0, netResult: 0 };
    }
    stats.gameStats[gameType].gamesPlayed += 1;
    stats.gameStats[gameType].netResult += newGameData.netResult;

    // Recalculate favorite game dynamically
    const gameCounts = Object.keys(stats.gameStats).reduce((acc: any, gt: string) => {
      acc[gt] = stats.gameStats[gt].gamesPlayed;
      return acc;
    }, {});
    stats.favoriteGame = Object.keys(gameCounts).reduce((a, b) => 
      gameCounts[a] > gameCounts[b] ? a : b, 'none'
    );

    // Update recent games (prepend new game, keep max 10)
    stats.recentGames = [newGame, ...stats.recentGames].slice(0, 10);

    // Update all games (prepend new game, keep max 100)
    stats.allGames = [newGame, ...(stats.allGames || [])].slice(0, 100);

    stats.lastUpdated = new Date().toISOString();

    // Update cache
    await redisCache.setUserStats(userId, stats);

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