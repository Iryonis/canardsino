/**
 * Bet error display component
 */

"use client";

interface BetErrorDisplayProps {
  /** Error message to display */
  error: string;
}

/**
 * Displays bet validation errors with appropriate styling
 * @param props - Component props
 * @returns Bet error UI
 */
export default function BetErrorDisplay({ error }: BetErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="mb-4 p-3 rounded-lg text-center text-sm font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
      ⚠️ {error}
    </div>
  );
}
