/**
 * Selected numbers display component
 */

"use client";

interface SelectedNumbersDisplayProps {
  /** Array of currently selected numbers */
  selectedNumbers: number[];
}

/**
 * Shows the currently selected numbers for advanced betting
 * @param props - Component props
 * @returns Selected numbers display UI
 */
export default function SelectedNumbersDisplay({
  selectedNumbers,
}: SelectedNumbersDisplayProps) {
  if (selectedNumbers.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-blue/20 rounded-lg">
      <div className="text-sm text-blue-lightest font-semibold">
        Selected: {selectedNumbers.join(", ")} ({selectedNumbers.length} number
        {selectedNumbers.length > 1 ? "s" : ""})
      </div>
    </div>
  );
}
