// frontend/src/components/stats/StatsOverview.tsx
'use client';

interface StatsOverviewProps {
  totalGames: number;
  winRate: number;
  netResult: number;
  biggestWin: number;
}

export default function StatsOverview({
  totalGames,
  winRate,
  netResult,
  biggestWin,
}: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Games */}
      <div className="bg-blue-dark/50 backdrop-blur border border-blue p-6 rounded-lg">
        <p className="text-blue-light text-sm uppercase tracking-wider mb-2">Total Games</p>
        <p className="text-3xl font-bold text-blue-lightest">{totalGames}</p>
      </div>

      {/* Win Rate */}
      <div className="bg-blue-dark/50 backdrop-blur border border-blue p-6 rounded-lg">
        <p className="text-blue-light text-sm uppercase tracking-wider mb-2">Win Rate</p>
        <p className="text-3xl font-bold text-blue-lightest">{winRate}%</p>
      </div>

      {/* Net Result */}
      <div className="bg-blue-dark/50 backdrop-blur border border-blue p-6 rounded-lg">
        <p className="text-blue-light text-sm uppercase tracking-wider mb-2">Net Result</p>
        <p className={`text-3xl font-bold ${netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          ${netResult.toFixed(2)}
        </p>
      </div>

      {/* Biggest Win */}
      <div className="bg-blue-dark/50 backdrop-blur border border-blue p-6 rounded-lg">
        <p className="text-blue-light text-sm uppercase tracking-wider mb-2">Biggest Win</p>
        <p className="text-3xl font-bold text-green-400">${biggestWin.toFixed(2)}</p>
      </div>
    </div>
  );
}
