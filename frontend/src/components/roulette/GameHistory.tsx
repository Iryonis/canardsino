/**
 * Game history component displaying recent roulette results
 */

"use client";

interface GameHistoryProps {
  /** Array of recent winning numbers */
  history: number[];
  /** Array of red numbers in roulette */
  redNumbers: number[];
}

/**
 * Displays the history of recent spins with colored number indicators
 * @param props - Component props
 * @returns Game history UI
 */
export default function GameHistory({ history, redNumbers }: GameHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-6 min-w-md max-w-3xl mx-auto border border-blue p-4 rounded-lg bg-blue-dark/50">
      <h3 className="text-blue-light font-semibold mb-2 text-center">
        History:
      </h3>
      <div className="flex min-h-20 flex-wrap gap-2">
        {history.map((num, idx) => (
          <div
            key={idx}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
              num === 0
                ? "bg-green-500"
                : redNumbers.includes(num)
                ? "bg-red-500"
                : "bg-gray-800"
            }`}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
}
