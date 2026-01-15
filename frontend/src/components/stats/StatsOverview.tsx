// frontend/src/components/stats/StatsOverview.tsx
'use client';

interface StatsOverviewProps {
  totalGames: number;
  winRate: number;
  netResult: number;
  netResultUSD?: number | null;
  biggestWin: number;
  biggestWinUSD?: number | null;
}

export default function StatsOverview({
  totalGames,
  winRate,
  netResult,
  netResultUSD,
  biggestWin,
  biggestWinUSD,
}: StatsOverviewProps) {
  const formatCCC = (amount: number) => amount.toLocaleString('en-US');

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
          {formatCCC(netResult)} CCC
        </p>
        {netResultUSD != null && (
          <p className={`text-sm mt-1 ${netResult >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
            ${netResultUSD.toFixed(2)} USD
          </p>
        )}
      </div>

      {/* Biggest Win */}
      <div className="bg-blue-dark/50 backdrop-blur border border-blue p-6 rounded-lg">
        <p className="text-blue-light text-sm uppercase tracking-wider mb-2">Biggest Win</p>
        <p className="text-3xl font-bold text-green-400">{formatCCC(biggestWin)} CCC</p>
        {biggestWinUSD != null && (
          <p className="text-sm mt-1 text-green-400/70">
            ${biggestWinUSD.toFixed(2)} USD
          </p>
        )}
      </div>
    </div>
  );
}
