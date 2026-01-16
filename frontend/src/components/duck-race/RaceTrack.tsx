/**
 * Race Track component for Duck Race
 * Displays all duck lanes with animated ducks
 */

"use client";

import { AnimatedDuck } from "./AnimatedDuck";
import { type DuckPlayer, type DuckColor } from "@/hooks/useDuckRaceWebSocket";

interface RaceTrackProps {
  players: DuckPlayer[];
  isRacing: boolean;
  winnerId: string | null;
  leaderId: string | null;
  trackLength: number;
}

// Lane background colors (lighter versions)
const LANE_COLORS: Record<DuckColor, string> = {
  yellow: "bg-yellow-900/20",
  orange: "bg-orange-900/20",
  blue: "bg-blue-900/20",
  green: "bg-green-900/20",
  pink: "bg-pink-900/20",
};

// Lane border colors
const LANE_BORDER_COLORS: Record<DuckColor, string> = {
  yellow: "border-yellow-500/50",
  orange: "border-orange-500/50",
  blue: "border-blue-500/50",
  green: "border-green-500/50",
  pink: "border-pink-500/50",
};

export function RaceTrack({
  players,
  isRacing,
  winnerId,
  leaderId,
  trackLength,
}: RaceTrackProps) {
  // Sort players by lane for consistent display
  const sortedPlayers = [...players].sort((a, b) => a.lane - b.lane);

  // Fill empty lanes for visual consistency (max 5 lanes)
  const lanes = Array.from({ length: 5 }, (_, i) => {
    const lane = i + 1;
    return sortedPlayers.find((p) => p.lane === lane) || null;
  });

  return (
    <div className="w-full bg-blue-dark/30 rounded-xl p-4 border border-blue">
      {/* Track header */}
      <div className="flex justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-400 font-bold text-sm">START</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold text-sm">FINISH</span>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        </div>
      </div>

      {/* Lanes */}
      <div className="space-y-2">
        {lanes.map((player, index) => {
          const lane = index + 1;
          const position = player ? (player.position / trackLength) * 100 : 0;
          const isWinner = player?.userId === winnerId;
          const isLeader = player?.userId === leaderId && isRacing;
          const color = player?.color || "yellow";

          return (
            <div
              key={lane}
              className={`relative h-20 rounded-lg border-2 ${
                player
                  ? `${LANE_COLORS[color]} ${LANE_BORDER_COLORS[color]}`
                  : "bg-gray-800/30 border-gray-700/30"
              } ${isLeader ? "ring-2 ring-yellow-400/50" : ""} ${
                isWinner ? "ring-2 ring-green-400" : ""
              }`}
            >
              {/* Lane number */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-bold text-blue-light/30">
                {lane}
              </div>

              {/* Start line */}
              <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-green-500/50"></div>

              {/* Finish line pattern */}
              <div className="absolute right-8 top-0 bottom-0 w-2 flex flex-col">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${
                      i % 2 === 0 ? "bg-white/80" : "bg-black/80"
                    }`}
                  />
                ))}
              </div>

              {/* Player info and duck */}
              {player ? (
                <>
                  {/* Player name */}
                  <div className="absolute left-16 top-1 text-xs text-blue-light truncate max-w-24">
                    {player.username}
                  </div>

                  {/* Bet status indicator */}
                  {player.hasBet && (
                    <div className="absolute left-16 bottom-1 text-xs text-green-400">
                      Ready
                    </div>
                  )}

                  {/* Duck with position */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                    style={{
                      left: `calc(${Math.min(position, 90)}% + 20px)`,
                    }}
                  >
                    <AnimatedDuck
                      color={player.color}
                      isRacing={isRacing && player.hasBet}
                      isWinner={isWinner}
                      size={50}
                    />
                  </div>

                  {/* Position indicator during race */}
                  {isRacing && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-sm font-mono text-blue-lightest">
                      {Math.round(position)}%
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-blue-light/30">
                  Empty Lane
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Track distance markers */}
      <div className="flex justify-between mt-2 px-12 text-xs text-blue-light/50">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default RaceTrack;
