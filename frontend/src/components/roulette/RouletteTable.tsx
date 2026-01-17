/**
 * Roulette table component with number grid and betting options
 */

"use client";

interface RouletteTableProps {
  /** Currently selected numbers for betting */
  selectedNumbers: number[];
  /** Array of red numbers in roulette */
  redNumbers: number[];
  /** Callback when a number is clicked */
  onNumberClick: (num: number) => void;
  /** Callback to add a column bet */
  onColumnBet: (column: number) => void;
  /** Callback to add a dozen bet */
  onDozenBet: (dozen: number) => void;
  /** Callback to add a simple bet (red, black, etc.) */
  onSimpleBet: (
    type: "red" | "black" | "even" | "odd" | "low" | "high",
    label: string
  ) => void;
}

/**
 * Roulette table layout (12 columns x 3 rows)
 */
const ROULETTE_TABLE = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // Row 3
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], // Row 2
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], // Row 1
];

/**
 * European roulette table with interactive number selection and betting buttons
 * @param props - Component props
 * @returns Roulette table UI
 */
export default function RouletteTable({
  selectedNumbers,
  redNumbers,
  onNumberClick,
  onColumnBet,
  onDozenBet,
  onSimpleBet,
}: RouletteTableProps) {
  return (
    <div className="bg-blue/50 p-4 rounded-lg border border-blue-lightest">
      <div className="flex gap-2">
        {/* Zero on the left */}
        <div className="flex flex-col justify-center">
          <button
            onClick={() => onNumberClick(0)}
            className={`w-12 h-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded transition ${
              selectedNumbers.includes(0) ? "ring-4 ring-yellow-400" : ""
            }`}
          >
            0
          </button>
        </div>

        {/* Main grid (3 rows x 12 columns) */}
        <div className="flex-1">
          {/* Number rows */}
          {ROULETTE_TABLE.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1 mb-1 last:mb-0">
              {row.map((num) => (
                <button
                  key={num}
                  onClick={() => onNumberClick(num)}
                  className={`flex-1 h-14 font-bold text-white text-lg rounded transition ${
                    selectedNumbers.includes(num)
                      ? "ring-4 ring-yellow-400"
                      : ""
                  } ${
                    redNumbers.includes(num)
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-900 hover:bg-black"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => onColumnBet(3 - rowIdx)}
                className="flex-1 ml-4 py-2 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
              >
                Col{3 - rowIdx}
              </button>
            </div>
          ))}

          {/* Dozen buttons */}
          <div className="flex gap-1 mt-4">
            {[1, 2, 3].map((doz) => (
              <button
                key={doz}
                onClick={() => onDozenBet(doz)}
                className="flex-1 py-2 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
              >
                {doz === 1 ? "1 to 12" : doz === 2 ? "13 to 24" : "25 to 36"}
              </button>
            ))}
          </div>

          {/* Other betting buttons */}
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => onSimpleBet("low", "1-18")}
              className="flex-1 py-2 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
            >
              1-18
            </button>
            <button
              onClick={() => onSimpleBet("even", "Even")}
              className="flex-1 py-2 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
            >
              Even
            </button>
            <button
              onClick={() => onSimpleBet("red", "Red")}
              className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold transition"
            >
              Red
            </button>
            <button
              onClick={() => onSimpleBet("black", "Black")}
              className="flex-1 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-bold transition"
            >
              Black
            </button>
            <button
              onClick={() => onSimpleBet("odd", "Odd")}
              className="flex-1 py-2 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
            >
              Odd
            </button>
            <button
              onClick={() => onSimpleBet("high", "19-36")}
              className="flex-1 py-2 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
            >
              19-36
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
