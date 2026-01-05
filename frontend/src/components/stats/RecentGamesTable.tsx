// frontend/src/components/stats/RecentGamesTable.tsx
'use client';

interface RouletteDetails {
  winningNumber?: number;
  winningColor?: string;
}

interface Bet {
  type: string;
  values: number[];
  amount: number;
}

interface RecentGame {
  id: string;
  gameType: string;
  totalBet: number;
  totalWin: number;
  netResult: number;
  createdAt: string;
  bets?: Bet[];
  details?: RouletteDetails;
}

interface RecentGamesTableProps {
  games: RecentGame[];
}

export default function RecentGamesTable({ games }: RecentGamesTableProps) {
  return (
    <div className="bg-blue-dark/30 backdrop-blur border border-blue/50 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-blue-lightest mb-6">Recent Games</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue/50">
              <th className="p-3 text-left text-blue-light uppercase tracking-wider">Game</th>
              <th className="p-3 text-left text-blue-light uppercase tracking-wider">Result</th>
              <th className="p-3 text-left text-blue-light uppercase tracking-wider">Bets</th>
              <th className="p-3 text-right text-blue-light uppercase tracking-wider">Bet</th>
              <th className="p-3 text-right text-blue-light uppercase tracking-wider">Win</th>
              <th className="p-3 text-right text-blue-light uppercase tracking-wider">Net</th>
              <th className="p-3 text-left text-blue-light uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, idx) => (
              <tr 
                key={idx} 
                className="border-b border-blue/20 hover:bg-blue-dark/30 transition-colors"
              >
                <td className="p-3 text-blue-lightest capitalize">{game.gameType}</td>
                <td className="p-3">
                  {game.details?.winningNumber !== undefined && (
                    <div className="flex items-center gap-2">
                      <span 
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
                          game.details.winningColor === 'red' 
                            ? 'bg-red-600' 
                            : game.details.winningColor === 'black'
                            ? 'bg-gray-900'
                            : 'bg-green-600'
                        }`}
                      >
                        {game.details.winningNumber}
                      </span>
                      <span className="text-blue-light text-xs uppercase">
                        {game.details.winningColor}
                      </span>
                    </div>
                  )}
                </td>
                <td className="p-3 text-blue-lightest text-xs">
                  {game.bets && game.bets.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {game.bets.map((bet, betIdx) => (
                        <span 
                          key={betIdx}
                          className="bg-blue-darkest/50 px-2 py-1 rounded text-blue-light"
                        >
                          {bet.type}
                          {bet.values && bet.values.length > 0 && `: ${bet.values.join(',')}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-blue-light">-</span>
                  )}
                </td>
                <td className="p-3 text-right text-blue-lightest">${game.totalBet.toFixed(2)}</td>
                <td className="p-3 text-right text-blue-lightest">${game.totalWin.toFixed(2)}</td>
                <td className={`p-3 text-right font-semibold ${
                  game.netResult >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {game.netResult >= 0 ? '+' : ''}{game.netResult.toFixed(2)}
                </td>
                <td className="p-3 text-blue-light text-xs">
                  {new Date(game.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {games.length === 0 && (
          <div className="text-center py-8 text-blue-light">
            No games played yet
          </div>
        )}
      </div>
    </div>
  );
}
