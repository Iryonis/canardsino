/**
 * Betting controls component for managing bet amounts
 */

"use client";

interface BettingControlsProps {
  /** Current bet amount */
  betAmount: number;
  /** Callback when bet amount changes */
  onBetAmountChange: (amount: number) => void;
}

/**
 * Component for controlling the bet amount with preset quick buttons
 * @param props - Component props
 * @returns Betting controls UI
 */
export default function BettingControls({
  betAmount,
  onBetAmountChange,
}: BettingControlsProps) {
  const presetAmounts = [10, 25, 50, 100];

  return (
    <div className="border border-blue-light p-4 rounded-lg mb-6 bg-blue-dark/50">
      <div className="mb-4">
        <label className="block text-blue-light mb-2 font-semibold">
          Bet amount:
        </label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => onBetAmountChange(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 bg-blue-dark border border-blue text-blue-lightest rounded-lg focus:outline-none focus:border-blue-light"
          min="1"
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => onBetAmountChange(amount)}
              className="py-2 bg-blue-dark hover:bg-blue border border-blue text-blue-lightest rounded text-sm transition"
            >
              {amount}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
