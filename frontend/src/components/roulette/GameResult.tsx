/**
 * Game result display component showing win/loss messages
 */

"use client";

interface GameResultProps {
  /** Result message to display */
  result: string;
  /** Error message if any */
  error?: string;
}

/**
 * Displays the result of a spin or error messages
 * @param props - Component props
 * @returns Game result UI with appropriate styling
 */
export default function GameResult({ result, error }: GameResultProps) {
  if (error) {
    return (
      <div className="my-4 max-w-md mx-auto p-4 rounded-lg text-center font-bold bg-red-500/20 text-red-400">
        {error}
      </div>
    );
  }

  if (!result) return null;

  const isWin = result.toLowerCase().includes("won");
  const isLoss = result.toLowerCase().includes("lost");

  return (
    <div
      className={`my-4 max-w-md mx-auto p-4 rounded-lg text-center font-bold ${
        isWin
          ? "bg-green-500/20 text-green-400 border border-green-300"
          : isLoss
          ? "bg-red-500/20 text-red-400 border border-red-300"
          : "bg-blue/20 text-blue-light border border-blue-light"
      }`}
    >
      {result}
    </div>
  );
}
