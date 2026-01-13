/**
 * RouletteWheel component - Animated European roulette wheel
 * @module RouletteWheel
 */

"use client";

import { useEffect, useState } from "react";

/**
 * Order of numbers on European roulette wheel (clockwise)
 */
const wheelOrder = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

/**
 * Red numbers in European roulette
 */
const redNumbers = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

/**
 * Props for RouletteWheel component
 */
interface RouletteWheelProps {
  /** The winning number to land on (0-36) */
  winningNumber: number | null;
  /** Whether the wheel is currently spinning */
  isSpinning: boolean;
}

/**
 * Animated European roulette wheel component
 * Spins the wheel and lands on the winning number with realistic animation
 * @param props - Component props
 * @returns Roulette wheel UI
 */
export default function RouletteWheel({
  winningNumber,
  isSpinning,
}: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);

  useEffect(() => {
    if (isSpinning && winningNumber !== null) {
      // Degrees per slot
      const degreesPerSlot = 360 / wheelOrder.length;

      // Index of the winning number
      const winningIndex = wheelOrder.indexOf(winningNumber);

      // Absolute angle of the winning slot
      const targetAngle = 360 - winningIndex * degreesPerSlot;

      // Random full rotations
      const fullRotations = 5 + Math.floor(Math.random() * 3);

      // Calculate the new rotation value
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRotation((prev) => {
        // Normalize current angle
        const currentAngle = prev % 360;

        // Delta needed to reach target from current position
        const deltaToTarget = (targetAngle - currentAngle + 360) % 360;

        // Total rotation for this spin
        return prev + fullRotations * 360 + deltaToTarget;
      });

      setTimeout(() => {
        setDisplayNumber(winningNumber);
      }, 5000);
    }
  }, [isSpinning, winningNumber]);

  const getNumberColor = (num: number) => {
    if (num === 0) return "bg-green-600";
    if (num === -1) return "bg-gradient-to-br from-yellow-400 to-yellow-600";
    return redNumbers.includes(num)
      ? "bg-red-600"
      : "bg-gray-900 text-yellow-200";
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Pointeur/Indicateur fixe en haut */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[20px] border-t-yellow-400 drop-shadow-lg" />
      </div>

      {/* Conteneur de la roulette */}
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        {/* Bordure extérieure dorée */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-600 via-yellow-400 to-yellow-600 shadow-2xl" />

        {/* Bordure intérieure */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue to-blue-dark shadow-inner" />

        {/* Roulette rotative */}
        <div
          className="absolute inset-4 rounded-full overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
              : "none",
          }}
        >
          {/* Segments de la roulette */}
          {wheelOrder.map((number, index) => {
            const angle = (360 / wheelOrder.length) * index;
            const isRed = redNumbers.includes(number);
            const isGreen = number === 0;

            return (
              <div
                key={index}
                className="absolute inset-0 origin-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 flex items-start justify-center ${
                    isGreen
                      ? "bg-green-600"
                      : isRed
                      ? "bg-red-600"
                      : "bg-gray-900"
                  }`}
                  style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 60% 100%, 40% 100%)",
                  }}
                >
                  <span
                    className="text-white font-bold text-sm mt-1"
                    style={{
                      // Rotate text so bottom faces the center
                      transform: `rotate(${-angle + angle}deg)`,
                      transformOrigin: "center",
                      display: "inline-block",
                    }}
                  >
                    {number}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Centre de la roulette */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full shadow-xl flex items-center justify-center border-4 border-yellow-200 ${getNumberColor(
              displayNumber !== null ? displayNumber : -1
            )}`}
            style={{
              transform: ` rotate(${-rotation}deg)`,
            }}
          >
            <div className="text-center">
              <div className="text-yellow-200 font-bold text-2xl">
                {displayNumber !== null ? displayNumber : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
