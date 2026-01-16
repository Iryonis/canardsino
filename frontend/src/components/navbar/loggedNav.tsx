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
      <Link href="/buy" className="btn group">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6 group-hover:rotate-90 group-active:scale-150 transition-transform"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </Link>
      <hr className="border border-gray-300 my-2" />
      <Link href="/games-page" className="btn btn-green">
        Games
      </Link>
      <Link href="/stats-sse" className="btn btn-blue">
        My Stats
      </Link>
      <hr className="border border-gray-300 my-2" />
      <button onClick={logout} className="btn btn-red">
        Logout
      </button>
    </div>
  );
};
