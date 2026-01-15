// frontend/src/components/stats/StatsDetails.tsx
'use client';

interface StatsDetailsProps {
  totalBets: number;
  convertedTotalBets?: string;
  totalWins: number;
  convertedTotalWins?: string;
  biggestLoss: number;
  convertedBiggestLoss?: string;
  favoriteGame: string;
  currency?: string;
}

export default function StatsDetails({
  totalBets,
  convertedTotalBets,
  totalWins,
  convertedTotalWins,
  biggestLoss,
  convertedBiggestLoss,
  favoriteGame,
}: StatsDetailsProps) {
  const formatCCC = (amount: number) => amount.toLocaleString('en-US');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Bets */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Total Bets</p>
        <p className="text-xl text-blue-lightest">{formatCCC(totalBets)} CCC</p>
        {convertedTotalBets && convertedTotalBets !== '-' && (
          <p className="text-sm text-blue-light/70">{convertedTotalBets}</p>
        )}
      </div>

      {/* Total Wins */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Total Wins</p>
        <p className="text-xl text-blue-lightest">{formatCCC(totalWins)} CCC</p>
        {convertedTotalWins && convertedTotalWins !== '-' && (
          <p className="text-sm text-blue-light/70">{convertedTotalWins}</p>
        )}
      </div>

      {/* Biggest Loss */}
      <div className="bg-blue-darkest/50 border border-blue/30 p-4 rounded-lg">
        <p className="font-semibold text-blue-light mb-2 text-sm uppercase tracking-wider">Biggest Loss</p>
        <p className="text-xl text-red-400">{formatCCC(Math.abs(biggestLoss))} CCC</p>
        {convertedBiggestLoss && convertedBiggestLoss !== '-' && (
          <p className="text-sm text-red-400/70">{convertedBiggestLoss}</p>
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
