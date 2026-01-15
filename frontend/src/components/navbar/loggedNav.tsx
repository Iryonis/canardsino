"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { BalanceUSD } from "../prices/BalanceUSD";

export const LoggedNav = ({ balance }: { balance: number }) => {
  const { logout, user } = useAuth();
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <span className="text-blue-light">Welcome {user?.username}</span>
      {balance > 0 && <BalanceUSD cccBalance={balance} />}

      {/* Games dropdown menu */}
      <div className="relative">
        <button
          onClick={() => setGamesMenuOpen(!gamesMenuOpen)}
          onBlur={() => setTimeout(() => setGamesMenuOpen(false), 150)}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-lg transition flex items-center gap-2"
        >
          <span>Games</span>
          <svg
            className={`w-4 h-4 transition-transform ${gamesMenuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {gamesMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-blue-dark border border-blue rounded-lg shadow-xl z-50 overflow-hidden">
            <Link
              href="/roulette"
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue/50 transition"
            >
              <span className="text-2xl">🎰</span>
              <div>
                <div className="text-blue-lightest font-medium">Roulette</div>
                <div className="text-xs text-blue-light">Solo mode</div>
              </div>
            </Link>
            <Link
              href="/roulette-multiplayer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue/50 transition border-t border-blue/30"
            >
              <span className="text-2xl">🎡</span>
              <div>
                <div className="text-blue-lightest font-medium">Roulette Multi</div>
                <div className="text-xs text-blue-light">Play with others</div>
              </div>
            </Link>
            <Link
              href="/duck-race"
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue/50 transition border-t border-blue/30"
            >
              <span className="text-2xl">🦆</span>
              <div>
                <div className="text-blue-lightest font-medium">Duck Race</div>
                <div className="text-xs text-blue-light">2-5 players race!</div>
              </div>
            </Link>
          </div>
        )}
      </div>

      <Link
        href="/buy"
        className="px-4 py-2 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition"
      >
        Buy CCC
      </Link>
      <Link
        href="/stats-sse"
        className="px-4 py-2 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-light/50"
      >
        My Stats
      </Link>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
      >
        Logout
      </button>
    </div>
  );
};
