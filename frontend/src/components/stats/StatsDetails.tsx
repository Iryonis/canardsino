// frontend/src/components/stats/StatsDetails.tsx
'use client';

interface StatsDetailsProps {
  totalBets: number;
  totalBetsUSD?: number | null;
  totalWins: number;
  totalWinsUSD?: number | null;
  biggestLoss: number;
  biggestLossUSD?: number | null;
  favoriteGame: string;
}

export default function StatsDetails({
  totalBets,
  totalBetsUSD,
  totalWins,
  totalWinsUSD,
  biggestLoss,
  biggestLossUSD,
  favoriteGame,
}: StatsDetailsProps) {
  const formatCCC = (amount: number) => amount.toLocaleString('en-US');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Bets */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Total Bets</p>
        <p className="text-xl text-blue-lightest">{formatCCC(totalBets)} CCC</p>
        {totalBetsUSD != null && (
          <p className="text-sm text-blue-light/70">${totalBetsUSD.toFixed(2)} USD</p>
        )}
      </div>

      {/* Total Wins */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Total Wins</p>
        <p className="text-xl text-blue-lightest">{formatCCC(totalWins)} CCC</p>
        {totalWinsUSD != null && (
          <p className="text-sm text-blue-light/70">${totalWinsUSD.toFixed(2)} USD</p>
        )}
      </div>

      {/* Biggest Loss */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Biggest Loss</p>
        <p className="text-xl text-red-400">{formatCCC(Math.abs(biggestLoss))} CCC</p>
        {biggestLossUSD != null && (
          <p className="text-sm text-red-400/70">${biggestLossUSD.toFixed(2)} USD</p>
        )}
      </div>

      {/* Favorite Game */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Favorite Game</p>
        <p className="text-xl text-blue-lightest capitalize">{favoriteGame}</p>
      </div>
    </div>
  );
}
