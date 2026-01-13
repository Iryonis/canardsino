/**
 * Current bets display component showing active bets and potential winnings
 */

"use client";

/**
 * Represents a single bet in the roulette game
 */
export interface Bet {
  type: string;
  numbers: number[];
  amount: number;
  label: string;
}

interface CurrentBetsProps {
  /** Array of current active bets */
  bets: Bet[];
  /** Multipliers mapped by bet type */
  multipliers: Record<string, number>;
  /** Maximum potential win amount */
  maxPotentialWin: number;
  /** Callback to remove a bet by index */
  onRemoveBet: (index: number) => void;
  /** Callback to clear all bets */
  onClearAll: () => void;
}

/**
 * Displays the list of current bets with their potential payouts
 * @param props - Component props
 * @returns Current bets UI with remove and clear functionality
 */
export default function CurrentBets({
  bets,
  multipliers,
  maxPotentialWin,
  onRemoveBet,
  onClearAll,
}: CurrentBetsProps) {
  if (bets.length === 0) return null;

  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <div className="border border-blue-light p-4 rounded-lg bg-blue-dark/50">
      <h3 className="text-blue-light font-semibold mb-2">Current Bets:</h3>
      <div className="bg-blue-dark/50 rounded-lg p-3 space-y-2 max-h-65 overflow-y-auto">
        {bets.map((bet, idx) => {
          const multiplier = multipliers[bet.type] || 1;
          const potentialPayout = bet.amount * multiplier;

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 bg-blue-dark/50 p-2 rounded"
            >
              <div className="flex-1">
                <div className="text-blue-lightest text-sm font-medium">
                  {bet.label}
                </div>
                <div className="text-blue-light text-xs">
                  {bet.amount} coins × {multiplier} = {potentialPayout} coins
                </div>
              </div>
              <button
                onClick={() => onRemoveBet(idx)}
                className="px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded text-xs transition"
              >
                ✕
              </button>
            </div>
          );
        })}
        <div className="border-t border-blue pt-2 space-y-1">
          <div className="flex justify-between text-sm font-bold text-blue-light">
            <span>Total Bet:</span>
            <span>{totalBet} coins</span>
          </div>
          {maxPotentialWin > 0 && (
            <div className="flex justify-between text-sm font-bold text-green-400">
              <span>Max Potential Win:</span>
              <span>+{maxPotentialWin + totalBet} coins</span>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onClearAll}
        className="w-full mt-2 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold transition"
      >
        Clear All Bets
      </button>
    </div>
  );
}
