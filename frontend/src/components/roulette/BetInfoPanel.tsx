/**
 * Bet information panel showing bet rules and multipliers
 */

"use client";

interface BetInfoPanelProps {
  /** Multipliers/payouts mapped by bet type */
  payouts?: Record<string, number>;
}

/**
 * Information panel explaining bet types and their payouts
 * @param props - Component props
 * @returns Bet info panel UI
 */
export default function BetInfoPanel({ payouts }: BetInfoPanelProps) {
  // Default payouts if not provided
  const defaultPayouts = {
    straight: 36,
    split: 18,
    street: 12,
    corner: 8,
    line: 5,
    column: 3,
    dozen: 3,
    red: 2,
    black: 2,
    even: 2,
    odd: 2,
    low: 2,
    high: 2,
  };

  const actualPayouts = payouts || defaultPayouts;

  const betTypes = [
    { label: "1 number", name: "Straight", key: "straight" },
    { label: "12 numbers in a row", name: "Dozen", key: "dozen" },
    { label: "2 adjacent", name: "Split", key: "split" },
    { label: "12 numbers in a column", name: "Column", key: "column" },
    { label: "3 in a row (not column)", name: "Street", key: "street" },
    { label: "18 numbers (all red)", name: "Red", key: "red" },
    { label: "4 in a square", name: "Corner", key: "corner" },
    { label: "18 numbers (all black)", name: "Black", key: "black" },
    {
      label: "6 numbers (two adjacent streets)",
      name: "Line",
      key: "line",
    },
    { label: "18 numbers (all even)", name: "Even", key: "even" },
    { label: "18 numbers (all odd)", name: "Odd", key: "odd" },
    { label: "18 numbers (1-18)", name: "1-18", key: "low" },
    { label: "18 numbers (19-36)", name: "19-36", key: "high" },
  ];

  return (
    <div className="mb-4 p-3 bg-blue-dark/70 rounded-lg block">
      <div className="grid grid-cols-2 text-xs text-blue-light">
        {betTypes.map((bet) => (
          <p key={bet.name}>
            <span className="font-bold">{bet.label}</span>: {bet.name} (×
            {actualPayouts[bet.key as keyof typeof actualPayouts]})
          </p>
        ))}
      </div>
    </div>
  );
}
