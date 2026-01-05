import mongoose from 'mongoose';

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
  lastUpdated: string;
}

export class StatsAggregator {
  
  /**
   * Compute and return user stats. The stats include total games played, total bets, total wins, net result,
   * win rate, biggest win/loss, recent game history and his favorite game type.
   * @param userId The user ID to compute stats for 
   * @returns a UserStats object
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    console.log(`📊 Fetching stats for userId: ${userId}`);
    
    // Debug: check total count in collection
    const totalInCollection = await GameHistory.countDocuments({});
    console.log(`   Total documents in gamehistories collection: ${totalInCollection}`);
    
    const gameHistory = await GameHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`   Found ${gameHistory.length} games for this user`);
    
    if (gameHistory.length > 0) {
      console.log(`   Sample game:`, JSON.stringify(gameHistory[0], null, 2));
    } else if (totalInCollection > 0) {
      // Show a sample from any user
      const sample = await GameHistory.findOne({}).lean();
      console.log(`   Collection has data but not for this userId. Sample userId:`, sample?.userId);
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

    return {
      userId,
      totalGames,
      totalBets,
      totalWins,
      netResult,
      winRate: parseFloat(winRate.toFixed(2)),
      biggestWin,
      biggestLoss,
      favoriteGame: 'roulette',
      recentGames,
      lastUpdated: new Date().toISOString(),
    };
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