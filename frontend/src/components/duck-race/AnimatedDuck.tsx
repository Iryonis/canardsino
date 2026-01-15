/**
 * Animated Duck SVG component
 * A cute duck that waddles when racing
 */

"use client";

import { type DuckColor } from "@/hooks/useDuckRaceWebSocket";

interface AnimatedDuckProps {
  color: DuckColor;
  isRacing: boolean;
  isWinner?: boolean;
  size?: number;
}

// Color mappings for duck parts
const DUCK_COLORS: Record<DuckColor, { body: string; wing: string; beak: string }> = {
  yellow: { body: "#FFD93D", wing: "#F4C430", beak: "#FF9800" },
  orange: { body: "#FF8C42", wing: "#E07020", beak: "#D84315" },
  blue: { body: "#42A5F5", wing: "#1E88E5", beak: "#FF9800" },
  green: { body: "#66BB6A", wing: "#43A047", beak: "#FF9800" },
  pink: { body: "#F48FB1", wing: "#EC407A", beak: "#FF9800" },
};

export function AnimatedDuck({
  color,
  isRacing,
  isWinner = false,
  size = 60,
}: AnimatedDuckProps) {
  const colors = DUCK_COLORS[color];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${isRacing ? "animate-waddle" : ""} ${isWinner ? "animate-bounce" : ""}`}
    >
      {/* Duck body */}
      <ellipse
        cx="50"
        cy="55"
        rx="30"
        ry="25"
        fill={colors.body}
        className="drop-shadow-md"
      />

      {/* Duck wing */}
      <ellipse
        cx="45"
        cy="55"
        rx="15"
        ry="12"
        fill={colors.wing}
        className={isRacing ? "animate-wing-flap" : ""}
      />

      {/* Duck head */}
      <circle
        cx="70"
        cy="35"
        r="18"
        fill={colors.body}
        className="drop-shadow-md"
      />

      {/* Duck eye */}
      <circle cx="76" cy="32" r="4" fill="#1a1a1a" />
      <circle cx="77" cy="31" r="1.5" fill="white" />

      {/* Duck beak */}
      <path
        d="M 85 38 L 98 42 L 85 46 Z"
        fill={colors.beak}
        className="drop-shadow-sm"
      />

      {/* Duck feet - animated when racing */}
      <g className={isRacing ? "animate-feet" : ""}>
        <path
          d="M 35 78 L 25 90 L 45 90 L 40 78"
          fill={colors.beak}
          className="origin-top"
        />
        <path
          d="M 55 78 L 45 90 L 65 90 L 60 78"
          fill={colors.beak}
          className="origin-top"
          style={{ animationDelay: "0.15s" }}
        />
      </g>

      {/* Winner crown */}
      {isWinner && (
        <g>
          <path
            d="M 55 8 L 60 20 L 70 12 L 75 20 L 85 8 L 80 25 L 55 25 Z"
            fill="#FFD700"
            stroke="#DAA520"
            strokeWidth="1"
            className="drop-shadow-lg"
          />
          <circle cx="60" cy="15" r="2" fill="#FF4444" />
          <circle cx="70" cy="12" r="2" fill="#4444FF" />
          <circle cx="80" cy="15" r="2" fill="#44FF44" />
        </g>
      )}

      {/* Tail feathers */}
      <path
        d="M 20 50 Q 10 45 15 55 Q 10 60 20 60"
        fill={colors.wing}
        className={isRacing ? "animate-tail-wag" : ""}
      />
    </svg>
  );
}

export default AnimatedDuck;
