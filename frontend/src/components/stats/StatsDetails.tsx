// frontend/src/components/stats/StatsDetails.tsx
'use client';

interface StatsDetailsProps {
  totalBets: number;
  totalWins: number;
  biggestLoss: number;
  favoriteGame: string;
}

export default function StatsDetails({
  totalBets,
  totalWins,
  biggestLoss,
  favoriteGame,
}: StatsDetailsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Bets */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Total Bets</p>
        <p className="text-xl text-blue-lightest">${totalBets.toFixed(2)}</p>
      </div>

      {/* Total Wins */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Total Wins</p>
        <p className="text-xl text-blue-lightest">${totalWins.toFixed(2)}</p>
      </div>

      {/* Biggest Loss */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Biggest Loss</p>
        <p className="text-xl text-red-400">${Math.abs(biggestLoss).toFixed(2)}</p>
      </div>

      {/* Favorite Game */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Favorite Game</p>
        <p className="text-xl text-blue-lightest capitalize">{favoriteGame}</p>
      </div>
    </div>
  );
}
