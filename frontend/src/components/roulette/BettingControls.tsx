/**
 * Betting controls component for managing bet amounts
 */

"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
const ConfettiDuck = dynamic(() => import("./ConfettiDuck"), {
  ssr: false,
});

interface BettingControlsProps {
  /** Current bet amount */
  betAmount: number | string;
  /** Callback when bet amount changes */
  onBetAmountChange: (amount: number | string) => void;
}

export default function BettingControls({
  betAmount,
  onBetAmountChange,
}: BettingControlsProps) {
  const presetAmounts = [10, 25, 50, 100, "All-in"];
  const [showConfetti, setShowConfetti] = useState(false);

  const handleAmountClick = (amount: number | string) => {
    onBetAmountChange(amount);
    if (amount === "All-in") {
      setShowConfetti(true);
    }
  };

  return (
    <>
      {showConfetti && (
        <ConfettiDuck
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
      )}
      <div className="border border-blue-light p-4 rounded-lg bg-blue-dark/50">
        <div className="">
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
                onClick={() => handleAmountClick(amount)}
                className={`py-2 bg-blue-dark hover:bg-blue border border-blue text-blue-lightest rounded text-sm transition ${
                  amount === "All-in" ? "col-span-2" : ""
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
